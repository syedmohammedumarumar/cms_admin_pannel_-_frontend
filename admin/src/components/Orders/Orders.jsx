import React, { useState, useEffect } from 'react';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const BASE_URL = 'http://127.0.0.1:8000';
  
  // Status mapping - include all possible statuses
  const statusDisplayMap = {
    'PLACED': 'Placed',
    'CONFIRMED': 'Confirmed',
    'PREPARING': 'Preparing', 
    'READY': 'Ready',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled'
  };

  // All possible statuses for admin to change
  const allStatuses = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];

  // Get admin token from localStorage
  const getAdminToken = () => {
    return localStorage.getItem('admin_access_token') || '';
  };

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      
      if (!token) {
        setError('Admin token not found. Please login again.');
        setLoading(false);
        return;
      }

      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('status', statusFilter);
      if (searchTerm) queryParams.append('search', searchTerm);
      if (currentPage) queryParams.append('page', currentPage);

      const response = await fetch(`${BASE_URL}/api/orders/admin/?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOrders(data.results || data);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch orders: ${err.message}`);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);
      const token = getAdminToken();
      
      if (!token) {
        setError('Admin token not found. Please login again.');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/orders/admin/${orderId}/update-status/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus }
            : order
        )
      );

      setError(null);
      alert(`Order status updated to ${statusDisplayMap[newStatus]} successfully!`);
    } catch (err) {
      setError(`Failed to update order status: ${err.message}`);
      console.error('Error updating order status:', err);
      alert(`Failed to update order status: ${err.message}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle status change from dropdown
  const handleStatusChange = (orderId, newStatus) => {
    const currentOrder = orders.find(order => order.id === orderId);
    if (currentOrder && currentOrder.status !== newStatus) {
      updateOrderStatus(orderId, newStatus);
    }
  };

  // Handle quick cancel order
  const handleQuickCancel = (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      updateOrderStatus(orderId, 'CANCELLED');
    }
  };

  // Load orders on component mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchTerm, currentPage]);

  if (loading) {
    return (
      <div className="orders-container">
        <h2>Admin Orders Panel</h2>
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-container">
        <h2>Admin Orders Panel</h2>
        <div className="error">
          {error}
          <button onClick={fetchOrders} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <h2>Admin Orders Panel</h2>
      
      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select 
            id="status-filter"
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            {allStatuses.map(status => (
              <option key={status} value={status}>{statusDisplayMap[status]}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="search">Search by Customer:</label>
          <input
            id="search"
            type="text"
            placeholder="Enter customer username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button onClick={fetchOrders} className="refresh-btn">
          Refresh Orders
        </button>
      </div>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total (₹)</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.user_username || order.user?.username || order.customer || 'N/A'}</td>
                <td>
                  {order.items?.map((item, i) => (
                    <div key={i}>
                      {item.menu_item_name || item.menu_item?.name || item.name} × {item.quantity}
                    </div>
                  )) || 'No items'}
                </td>
                <td>₹{order.total_amount || order.total}</td>
                <td>
                  <span className={`status-badge status-${order.status.toLowerCase()}`}>
                    {statusDisplayMap[order.status] || order.status}
                  </span>
                </td>
                <td>
                  {order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB') : 'N/A'}
                </td>
                <td>
                  <div className="actions">
                    {/* Quick Cancel Button - only show if order is not already cancelled or delivered */}
                    {!['CANCELLED', 'DELIVERED'].includes(order.status) && (
                      <button 
                        onClick={() => handleQuickCancel(order.id)}
                        className="cancel-btn"
                        disabled={updatingOrderId === order.id}
                        style={{ 
                          backgroundColor: '#dc3545', 
                          color: 'white', 
                          marginRight: '10px',
                          padding: '5px 10px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: updatingOrderId === order.id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {updatingOrderId === order.id ? 'Cancelling...' : 'Quick Cancel'}
                      </button>
                    )}
                    
                    {/* Status Dropdown - show all statuses */}
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      disabled={updatingOrderId === order.id}
                      className="status-select"
                      style={{
                        padding: '5px',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    >
                      {allStatuses.map(status => (
                        <option key={status} value={status}>
                          {statusDisplayMap[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Orders;