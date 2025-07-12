import React, { useState, useEffect } from 'react';

const Orders = () => {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm,  setSearchTerm]    = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [updatingId,  setUpdatingId]    = useState(null);

  const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

  /** ↔ server → human */
  const statusDisplayMap = {
    PLACED:    'Placed',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing', 
    READY:     'Ready',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  const allStatuses = Object.keys(statusDisplayMap);

  const token = localStorage.getItem('admin_access_token') || '';

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const fetchOrders = async () => {
    if (!token) { setError('Admin token not found. Please login again.'); return; }
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm)   params.append('search', searchTerm);
      params.append('page', currentPage);

      const res = await fetch(`${BASE_URL}/api/orders/admin/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(data.results ?? data);
      setError(null);
    } catch (e) {
      setError(`Failed to fetch orders: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  /** PATCH /…/update-status/ then refresh from server so the
      customer panel (and our own) are always consistent.       */
  const updateOrderStatus = async (id, newStatus) => {
    if (!token) { setError('Admin token not found.'); return; }
    setUpdatingId(id);

    try {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${id}/update-status/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      /* Refresh from backend – avoids any divergence */
      await fetchOrders();
      alert(`Status updated to “${statusDisplayMap[newStatus]}”`);
    } catch (e) {
      setError(`Failed to update status: ${e.message}`);
      alert(`Failed: ${e.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  /* Quick cancel = just another status update */
  const handleQuickCancel = id =>
    window.confirm('Cancel this order?') && updateOrderStatus(id, 'CANCELLED');

  useEffect(() => { fetchOrders(); }, [statusFilter, searchTerm, currentPage]);

  /* ---------- UI ---------- */
  if (loading) return <p className="loading">Loading…</p>;
  if (error)   return (
    <div className="error">
      {error} <button onClick={fetchOrders}>Retry</button>
    </div>
  );

  return (
    <div className="orders-container">
      <h2>Admin Orders</h2>

      {/* Filters */}
      <div className="filters">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All status</option>
          {allStatuses.map(s => <option key={s} value={s}>{statusDisplayMap[s]}</option>)}
        </select>

        <input
          type="text"
          placeholder="Search customer"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <button onClick={fetchOrders}>Refresh</button>
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Customer</th><th>Items</th>
              <th>Total ₹</th><th>Status</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.user_username || o.user?.username || '—'}</td>
                <td>{o.items?.map((it,i) => (
                      <div key={i}>{(it.menu_item_name || it.menu_item?.name || it.name)} × {it.quantity}</div>
                    ))}</td>
                <td>₹{o.total_amount ?? o.total}</td>
                <td>
                  <span className={`status-badge status-${o.status.toLowerCase()}`}>
                    {statusDisplayMap[o.status] ?? o.status}
                  </span>
                </td>
                <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB') : '—'}</td>
                <td>
                  {!['CANCELLED','DELIVERED'].includes(o.status) && (
                    <button
                      disabled={updatingId===o.id}
                      onClick={() => handleQuickCancel(o.id)}
                    >
                      {updatingId===o.id ? 'Cancelling…' : 'Quick Cancel'}
                    </button>
                  )}

                  <select
                    value={o.status}
                    disabled={updatingId===o.id}
                    onChange={e => updateOrderStatus(o.id, e.target.value)}
                  >
                    {allStatuses.map(s => <option key={s}>{s}</option>)}
                  </select>
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