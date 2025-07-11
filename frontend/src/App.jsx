import './App.css';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';

import Navbar from './components/Navbar/Navbar';
import Home from './components/Home/Home';
import Register from './components/Register/Register';
import SignIn from './components/SignIn/SignIn';
import Cart from './components/Cart/Cart';
import Menu from './components/Menu/Menu';
import ForgotPassword from './components/ForgotPassword/ForgotPassword';
import Profile from './components/Profile/Profile';
import Orders from './components/Orders/Orders';

const API_BASE = 'http://localhost:8000';

const AppContent = ({ userEmail, setUserEmail, isLoggedIn, setIsLoggedIn }) => {
  const [cart, setCart] = useState({});

  // ✅ Fetch cart items from backend
  const fetchCart = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await axios.get(`${API_BASE}/api/cart/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const cartItems = res.data.items ?? res.data.cart_items ?? [];
      const updatedCart = {};

      cartItems.forEach((item) => {
        const menuItem = item.menu_item;

        if (typeof menuItem === 'object' && menuItem !== null) {
          updatedCart[menuItem.id] = {
            cart_item_id: item.id,
            id: menuItem.id,
            name: menuItem.name,
            price: parseFloat(menuItem.price),
            quantity: item.quantity,
          };
        } else if (typeof menuItem === 'number') {
          updatedCart[menuItem] = {
            cart_item_id: item.id,
            id: menuItem,
            name: item.menu_item_name || `Item #${menuItem}`,
            price: parseFloat(item.menu_item_price || 0),
            quantity: item.quantity,
          };
        }
      });

      setCart(updatedCart);
      console.log('✅ Cart synced:', updatedCart);
    } catch (err) {
      console.error('❌ Failed to fetch cart:', err);
    }
  };

  // ✅ Add item to cart
  const addToCart = async (item) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Please log in to add items to your cart.');
      return;
    }

    const existingItem = cart[item.id];

    try {
      if (existingItem) {
        const newQty = existingItem.quantity + 1;
        await axios.put(
          `${API_BASE}/api/cart/items/${existingItem.cart_item_id}/update/`,
          { quantity: newQty },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCart({
          ...cart,
          [item.id]: { ...existingItem, quantity: newQty },
        });
        console.log(`🔄 Increased quantity of ${item.name}`);
      } else {
        const res = await axios.post(
          `${API_BASE}/api/cart/add/`,
          {
            menu_item_id: item.id,
            quantity: 1,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newItem = res.data.cart_item;
        setCart({
          ...cart,
          [item.id]: {
            cart_item_id: newItem.id,
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: 1,
          },
        });
        console.log(`🛒 Item added: ${item.name}`);
      }
    } catch (err) {
      console.error('❌ Add to cart failed:', err);
    }
  };

  // ✅ Remove item from cart
  const removeFromCart = async (item) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const existingItem = cart[item.id];
    if (!existingItem) return;

    try {
      const newQty = existingItem.quantity - 1;

      if (newQty <= 0) {
        await axios.delete(
          `${API_BASE}/api/cart/items/${existingItem.cart_item_id}/remove/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const updatedCart = { ...cart };
        delete updatedCart[item.id];
        setCart(updatedCart);
        console.log(`🗑️ Removed item: ${item.name}`);
      } else {
        await axios.put(
          `${API_BASE}/api/cart/items/${existingItem.cart_item_id}/update/`,
          { quantity: newQty },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCart({
          ...cart,
          [item.id]: { ...existingItem, quantity: newQty },
        });
        console.log(`🔄 Decreased quantity of ${item.name}`);
      }
    } catch (err) {
      console.error('❌ Remove from cart failed:', err);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  return (
    <>
      {/* ✅ Cart prop passed here */}
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} cart={cart} />
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/menu/:filter?"
            element={
              <Menu
                cart={cart}
                setCart={setCart}
                addToCart={addToCart}
                removeFromCart={removeFromCart}
                fetchCart={fetchCart}
              />
            }
          />
          <Route path="/cart" element={<Cart cart={cart} setCart={setCart} />} />
          <Route path="/register" element={<Register setUserEmail={setUserEmail} />} />
          <Route
            path="/login"
            element={<SignIn setUserEmail={setUserEmail} setIsLoggedIn={setIsLoggedIn} />}
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile email={userEmail} />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </div>
    </>
  );
};

const App = () => {
  const [userEmail, setUserEmail] = useState(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.email || '';
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('access_token');
  });

  return (
    <Router>
      <AppContent
        userEmail={userEmail}
        setUserEmail={setUserEmail}
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
      />
    </Router>
  );
};

export default App;
