import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Menu.css';

const API_BASE = 'http://localhost:8000';

const useQuery = () => new URLSearchParams(useLocation().search);

const Menu = ({ cart = {}, fetchCart, addToCart, removeFromCart }) => {
  const { filter } = useParams();
  const query = useQuery();
  const searchTerm = query.get('search') || '';

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch menu items
  const fetchMenuItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm) params.q = searchTerm;
      if (filter) params.category = filter.toLowerCase();

      const url =
        searchTerm || filter
          ? `${API_BASE}/api/menu/customer/search/`
          : `${API_BASE}/api/menu/customer/`;

      console.log('📡 Fetching menu items...');
      const response = await axios.get(url, { params });
      setMenuItems(response.data);
      console.log('✅ Menu items fetched:', response.data);
    } catch (err) {
      console.error('❌ Error fetching menu:', err);
      setError('Failed to load menu items.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add item and sync cart
  const handleAdd = async (item) => {
    try {
      await addToCart(item);
      await fetchCart();
    } catch (err) {
      console.error('❌ Failed to add item:', err);
    }
  };

  // ✅ Remove item and sync cart
  const handleRemove = async (item) => {
    try {
      await removeFromCart(item);
      await fetchCart();
    } catch (err) {
      console.error('❌ Failed to remove item:', err);
    }
  };

  useEffect(() => {
    fetchMenuItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchTerm]);

  return (
    <div className="menu-container">
      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading menu...</p>
      ) : error ? (
        <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>
      ) : (
        <div className="food-grid">
          {menuItems.length > 0 ? (
            menuItems.map((item) => (
              <div key={item.id} className="food-card">
                <img
                  src={item.image || '/no-image.png'}
                  alt={item.name}
                  className="food-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/no-image.png';
                  }}
                />
                <h3>{item.name}</h3>
                <p>₹{parseFloat(item.price || 0).toFixed(2)}</p>
                <div className="cart-controls">
                  {cart[item.id] ? (
                    <>
                      <button className="qty-btn" onClick={() => handleRemove(item)}>-</button>
                      <span>{cart[item.id].quantity}</span>
                      <button className="qty-btn" onClick={() => handleAdd(item)}>+</button>
                    </>
                  ) : (
                    <button className="add-button" onClick={() => handleAdd(item)}>
                      Add to Cart
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', fontSize: '18px', color: '#555' }}>
              No matching items found.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Menu;
