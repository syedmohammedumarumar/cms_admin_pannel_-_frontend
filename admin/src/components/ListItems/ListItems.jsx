import React, { useState, useEffect } from 'react';
import './ListItems.css';

const ListItems = ({ onUpdateMenuItem, onDeleteMenuItem }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedItem, setEditedItem] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Category mapping for display vs API
  const categoryOptions = [
    { display: 'Breakfast', value: 'breakfast' },
    { display: 'Lunch', value: 'lunch' },
    { display: 'Drinks', value: 'drinks' },
    { display: 'Snacks', value: 'snacks' },
    { display: 'Juices', value: 'juices' }
  ];

  // Get admin token - check both possible token names
  const getAdminToken = () => {
    return localStorage.getItem('admin_access_token') || localStorage.getItem('access_token');
  };

  // Fetch menu items from API (Admin endpoint)
  const fetchMenuItems = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = getAdminToken();
      
      if (!token) {
        setError('No admin access token found. Please login again.');
        return;
      }

      const response = await fetch('http://localhost:8000/api/menu/admin/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMenuItems(data);
      } else if (response.status === 401) {
        setError('Unauthorized. Please login again.');
        // Clear tokens if unauthorized
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } else if (response.status === 403) {
        setError('Forbidden. Admin access required.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to fetch menu items (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load menu items on component mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedItem({
      ...menuItems[index],
      // Keep the boolean value for available
      available: menuItems[index].available
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'available') {
      setEditedItem({ ...editedItem, [name]: value === 'true' });
    } else if (name === 'price') {
      setEditedItem({ ...editedItem, [name]: parseFloat(value) || '' });
    } else {
      setEditedItem({ ...editedItem, [name]: value });
    }
  };

  const saveEdit = async () => {
    try {
      const token = getAdminToken();
      
      if (!token) {
        alert('No admin access token found. Please login again.');
        return;
      }

      // Prepare the payload according to API requirements
      const payload = {
        name: editedItem.name,
        description: editedItem.description || '',
        price: parseFloat(editedItem.price),
        available: editedItem.available,
        category: editedItem.category,
        image: editedItem.image || ''
      };

      const response = await fetch(`http://localhost:8000/api/menu/admin/${menuItems[editIndex].id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        const updatedMenuItems = [...menuItems];
        updatedMenuItems[editIndex] = updatedItem;
        setMenuItems(updatedMenuItems);
        
        setEditIndex(null);
        setEditedItem({});
        
        // Call parent callback if provided
        if (onUpdateMenuItem) {
          onUpdateMenuItem(editIndex, updatedItem);
        }
        
        alert('Menu item updated successfully!');
      } else if (response.status === 401) {
        alert('Unauthorized. Please login again.');
      } else if (response.status === 403) {
        alert('Forbidden. Admin access required.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error updating item: ${errorData.error || 'Update failed'}`);
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      alert('Network error. Please try again.');
    }
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setEditedItem({});
  };

  const handleDelete = async (index) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const token = getAdminToken();
        
        if (!token) {
          alert('No admin access token found. Please login again.');
          return;
        }

        const itemId = menuItems[index].id;

        const response = await fetch(`http://localhost:8000/api/menu/admin/${itemId}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const updatedMenuItems = menuItems.filter((_, i) => i !== index);
          setMenuItems(updatedMenuItems);
          
          // Call parent callback if provided
          if (onDeleteMenuItem) {
            onDeleteMenuItem(index);
          }
          
          alert('Menu item deleted successfully!');
        } else if (response.status === 401) {
          alert('Unauthorized. Please login again.');
        } else if (response.status === 403) {
          alert('Forbidden. Admin access required.');
        } else if (response.status === 404) {
          alert('Menu item not found.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          alert(`Error deleting item: ${errorData.error || 'Delete failed'}`);
        }
      } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('Network error. Please try again.');
      }
    }
  };

  // Refresh button handler
  const handleRefresh = () => {
    fetchMenuItems();
  };

  // Helper function to get category display name
  const getCategoryDisplay = (categoryValue) => {
    const category = categoryOptions.find(opt => opt.value === categoryValue);
    return category ? category.display : categoryValue;
  };

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it's a relative path, prepend the base URL
    return `http://localhost:8000${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  if (isLoading) {
    return (
      <div className="list-items-container">
        <div className="loading">Loading menu items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="list-items-container">
        <div className="error-message">
          {error}
          <button onClick={handleRefresh} style={{ marginLeft: '10px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="list-items-container">
      <div className="table-wrapper">
        <div className="header-section">
          <h2>All Menu Items</h2>
          <button className="refresh-btn" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
        
        {menuItems.length === 0 ? (
          <p>No items available. Please add some menu items.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Description</th>
                <th>Price (₹)</th>
                <th>Availability</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item, index) => (
                <tr key={item.id || index}>
                  {editIndex === index ? (
                    <>
                      <td>
                        <div className="image-edit-container">
                          {editedItem.image && (
                            <img
                              src={getImageUrl(editedItem.image)}
                              alt={editedItem.name}
                              className="menu-item-image-small"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <input
                            name="image"
                            value={editedItem.image || ''}
                            onChange={handleChange}
                            placeholder="Image URL"
                            className="image-input"
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          name="name"
                          value={editedItem.name || ''}
                          onChange={handleChange}
                          required
                          placeholder="Enter item name"
                        />
                      </td>
                      <td>
                        <textarea
                          name="description"
                          value={editedItem.description || ''}
                          onChange={handleChange}
                          placeholder="Enter description (optional)"
                          rows="2"
                        />
                      </td>
                      <td>
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editedItem.price || ''}
                          onChange={handleChange}
                          required
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <select
                          name="available"
                          value={editedItem.available ? 'true' : 'false'}
                          onChange={handleChange}
                        >
                          <option value="true">Available</option>
                          <option value="false">Not Available</option>
                        </select>
                      </td>
                      <td>
                        <select
                          name="category"
                          value={editedItem.category || ''}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select Category</option>
                          {categoryOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.display}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button className="edit-btn" onClick={saveEdit}>
                          Save
                        </button>
                        <button className="cancel-btn" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div className="image-container">
                          {getImageUrl(item.image) ? (
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="menu-item-image-small"
                              onError={(e) => {
                                e.target.src = '/api/placeholder/50/50';
                                e.target.alt = 'No image';
                              }}
                            />
                          ) : (
                            <div className="no-image-placeholder">
                              No Image
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{item.name}</td>
                      <td>{item.description || 'No description'}</td>
                      <td>₹{parseFloat(item.price).toFixed(2)}</td>
                      <td>
                        <span className={`availability ${item.available ? 'in-stock' : 'out-of-stock'}`}>
                          {item.available ? 'Available' : 'Not Available'}
                        </span>
                      </td>
                      <td>{getCategoryDisplay(item.category)}</td>
                      <td>
                        <button className="edit-btn" onClick={() => handleEdit(index)}>
                          Edit
                        </button>
                        <button className="delete-btn" onClick={() => handleDelete(index)}>
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ListItems;