import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(null);

  const token = localStorage.getItem('access_token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Status display mapping to match admin panel
  const statusDisplayMap = {
    'PLACED': 'Placed',
    'CONFIRMED': 'Confirmed',
    'PREPARING': 'Preparing',
    'READY': 'Ready',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled'
  };

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchOrders = async () => {
    setError('');
    setLoading(true);
    
    try {
      const res = await axios.get('http://localhost:8000/api/orders/', axiosConfig);
      const apiOrders = res.data.results || [];
      console.log('✅ API Orders:', apiOrders);

      let localOrders = [];
      if (user?.email) {
        const localKey = `orderHistory_${user.email}`;
        const stored = localStorage.getItem(localKey);
        if (stored) {
          try {
            localOrders = JSON.parse(stored);
            console.log('📦 Local Orders:', localOrders);
          } catch (parseErr) {
            console.warn('⚠️ Failed to parse local orders:', parseErr);
          }
        }
      }

      // Combine orders, prioritizing API orders over local ones
      const combinedOrders = [...apiOrders, ...localOrders];
      
      // Remove duplicates based on order ID (API orders take precedence)
      const uniqueOrders = combinedOrders.filter((order, index, self) => 
        index === self.findIndex(o => o.id === order.id)
      );
      
      console.log('🔄 Combined Orders:', uniqueOrders);
      setOrders(uniqueOrders);
    } catch (err) {
      console.error('❌ Failed to fetch orders:', err);
      setError('Failed to load order history.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancellingOrder(orderId);
    
    try {
      const response = await axios.post(
        `http://localhost:8000/api/orders/${orderId}/cancel/`,
        {},
        axiosConfig
      );
      
      console.log('✅ Order cancelled successfully:', response.data);
      
      // Update the order status in the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'CANCELLED' }
            : order
        )
      );
      
      // Also update local storage if the order exists there
      if (user?.email) {
        const localKey = `orderHistory_${user.email}`;
        const stored = localStorage.getItem(localKey);
        if (stored) {
          try {
            const localOrders = JSON.parse(stored);
            const updatedLocalOrders = localOrders.map(order => 
              order.id === orderId 
                ? { ...order, status: 'CANCELLED' }
                : order
            );
            localStorage.setItem(localKey, JSON.stringify(updatedLocalOrders));
          } catch (err) {
            console.warn('Failed to update local storage:', err);
          }
        }
      }
      
      alert('Order cancelled successfully!');
    } catch (err) {
      console.error('❌ Failed to cancel order:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to cancel order. Please try again.';
      alert(errorMessage);
    } finally {
      setCancellingOrder(null);
    }
  };

  // Check if order can be cancelled
  const canCancelOrder = (order) => {
    // Can cancel if order has an ID (not just local) and is not already cancelled or delivered
    return order.id && !['CANCELLED', 'DELIVERED'].includes(order.status);
  };

  // Auto-refresh orders every 30 seconds to get latest status
  useEffect(() => {
    fetchOrders();
    
    const interval = setInterval(fetchOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="orders-container">
      <h2 className="orders-title">
        Order History
        <button 
          onClick={fetchOrders} 
          className="refresh-btn"
          style={{
            marginLeft: '20px',
            padding: '5px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </h2>

      {loading ? (
        <p>Loading your orders...</p>
      ) : error ? (
        <div style={{ color: 'red' }}>
          {error}
          <button onClick={fetchOrders} style={{ marginLeft: '10px' }}>
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => {
                const orderTime = formatDate(order.created_at || order.time);

                const items = (order.items || []).map((item) => {
                  const name =
                    item.menu_item_name ||
                    item.name ||
                    item.menu_item?.name ||
                    `Item #${item.menu_item?.id || 'N/A'}`;
                  const quantity = item.quantity || 1;
                  const price = parseFloat(
                    item.price ?? item.menu_item_price ?? item.menu_item?.price ?? 0
                  );
                  return {
                    name,
                    quantity,
                    price,
                    subtotal: price * quantity,
                  };
                });

                const total = parseFloat(order.total || order.total_amount || 0).toFixed(2);
                const orderId = order.orderId || order.id;
                const orderStatus = order.status || 'PLACED';

                return (
                  <tr key={order.id || index}>
                    <td>#{orderId}</td>
                    <td>{orderTime}</td>
                    <td>
                      <span className={`status-badge status-${orderStatus.toLowerCase()}`}>
                        {statusDisplayMap[orderStatus] || orderStatus}
                      </span>
                    </td>
                    <td>
                      <ul className="order-items-list">
                        {items.map((item, idx) => (
                          <li key={idx}>
                            {item.name} × {item.quantity} = ₹{item.subtotal.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>₹{total}</td>
                    <td>
                      {canCancelOrder(order) ? (
                        <button
                          className="cancel-btn"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrder === order.id}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: cancellingOrder === order.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {cancellingOrder === order.id ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      ) : (
                        <span className="no-action" style={{ color: '#666' }}>
                          {orderStatus === 'CANCELLED' 
                            ? 'Cancelled' 
                            : orderStatus === 'DELIVERED' 
                              ? 'Delivered' 
                              : !order.id 
                                ? 'Local Order' 
                                : 'Cannot Cancel'
                          }
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Orders;