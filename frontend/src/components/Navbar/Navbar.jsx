import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ isLoggedIn, setIsLoggedIn, cart }) => {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleFilterChange = (e) => {
    const value = e.target.value.toLowerCase();
    setFilter(value);
    navigate(value ? `/menu/${value}` : '/menu');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/menu?search=${encodeURIComponent(search.trim())}`);
    } else {
      navigate('/menu');
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    navigate('/');
  };

  const handleOrdersClick = () => {
    navigate('/orders');
  };

  const cartItemCount = Object.values(cart || {}).reduce(
    (count, item) => count + item.quantity,
    0
  );

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="logo">MITS Canteen</Link>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/menu" className="nav-link">Menu</Link>
          <Link to="/cart" className="nav-link cart-icon-wrapper">
            <span className="cart-text">Cart</span>
            <span className="cart-icon" role="img" aria-label="cart">🛒</span>
            {cartItemCount > 0 && <span className="cart-dot" />}
          </Link>
        </div>

        <div className="navbar-search">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              placeholder="Search food..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">🔍</button>
          </form>

          <select
            className="filter-dropdown"
            value={filter}
            onChange={handleFilterChange}
          >
            <option value="">▼ Filter</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="drinks">Drinks</option>
            <option value="snacks">Snacks</option>
          </select>
        </div>

        <div className="navbar-right">
          {isLoggedIn ? (
            <>
              <button className="profile-btn" onClick={toggleSidebar}>👤 Profile</button>
              {sidebarOpen && (
                <div className="sidebar">
                  <button onClick={() => navigate('/profile')} className="sidebar-link">My Profile</button>
                  <button onClick={handleOrdersClick} className="sidebar-link">Orders</button>
                  <button onClick={handleLogout} className="sidebar-link">Logout</button>
                </div>
              )}
            </>
          ) : (
            <>
              <Link to="/register">
                <button className="btn">Sign Up</button>
              </Link>
              <Link to="/login">
                <button className="btn btn-outline">Log In</button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
