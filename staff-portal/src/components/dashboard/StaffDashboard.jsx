import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastProvider';
import './StaffDashboard.css';

// Item Card Component
function ItemCard({ item, onEdit, onDelete }) {
  return (
    <div className="staff-item-card">
      <div className="item-image">
        <img 
          src={item.image_url || '/default-food.jpg'} 
          alt={item.name}
          onError={(e) => e.target.src = '/default-food.jpg'}
        />
        <div className={`item-status ${item.is_available ? 'available' : 'unavailable'}`}>
          {item.is_available ? 'Available' : 'Unavailable'}
        </div>
      </div>
      
      <div className="item-details">
        <h3 className="item-name">{item.name}</h3>
        <p className="item-description">{item.description}</p>
        <div className="item-counter">📍 {item.counter.name}</div>
        
        <div className="item-stats">
          <div className="item-price">₹{item.price}</div>
          <div className={`item-stock ${item.stock <= 5 ? 'low-stock' : ''}`}>
            📦 {item.stock} left
          </div>
        </div>
        
        <div className="item-actions">
          <button 
            className="edit-btn"
            onClick={() => onEdit(item)}
          >
            ✏️ Edit
          </button>
          <button 
            className="delete-btn"
            onClick={onDelete}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Item Modal Component
function AddItemModal({ counters, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    counter_id: '',
    stock: '',
    image_url: '',
    is_available: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Item</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Item Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Stock *</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Counter *</label>
            <select
              value={formData.counter_id}
              onChange={(e) => setFormData({...formData, counter_id: e.target.value})}
              required
            >
              <option value="">Select Counter</option>
              {counters.map(counter => (
                <option key={counter.id} value={counter.id}>
                  {counter.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Image URL (optional)</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({...formData, is_available: e.target.checked})}
              />
              Available for sale
            </label>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Item Modal Component
function EditItemModal({ item, counters, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: item.name,
    description: item.description,
    price: item.price,
    counter_id: item.counter.id,
    stock: item.stock,
    image_url: item.image_url || '',
    is_available: item.is_available
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Item</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Item Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Stock *</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Counter *</label>
            <select
              value={formData.counter_id}
              onChange={(e) => setFormData({...formData, counter_id: e.target.value})}
              required
            >
              {counters.map(counter => (
                <option key={counter.id} value={counter.id}>
                  {counter.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Image URL (optional)</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({...formData, is_available: e.target.checked})}
              />
              Available for sale
            </label>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Update Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Staff Dashboard Component
function StaffDashboard() {
  const { logout, user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  // State Management
  const [activeView, setActiveView] = useState('items');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [counters, setCounters] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCounter, setFilterCounter] = useState('all');
  const dropdownRef = useRef(null);

  // User Data
  const userData = user || {
    full_name: 'Staff Member',
    username: 'staff',
    id_number: 'STF001'
  };

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name || userData.username || 'Staff')}&background=667eea&color=ffffff`;

  // Fetch items data
  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch both items and counters in parallel
      const [itemsResponse, countersResponse] = await Promise.all([
        fetch('http://localhost:8000/api/menu/staff/items/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('http://localhost:8000/api/menu/counters/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (itemsResponse.ok && countersResponse.ok) {
        const itemsData = await itemsResponse.json();
        const countersData = await countersResponse.json();
        
        console.log('🔍 API Response - Items:', itemsData);
        console.log('🔍 API Response - Counters:', countersData);
        
        // Ensure itemsData is an array
        if (Array.isArray(itemsData)) {
          console.log('✅ Setting items directly (array):', itemsData.length);
          setItems(itemsData);
        } else if (itemsData && Array.isArray(itemsData.items)) {
          console.log('✅ Setting items from nested structure:', itemsData.items.length);
          setItems(itemsData.items);
        } else {
          console.warn('❌ Items data is not an array:', itemsData);
          setItems([]);
        }
        
        // Ensure countersData is an array
        if (Array.isArray(countersData)) {
          setCounters(countersData);
        } else {
          console.warn('Counters data is not an array:', countersData);
          setCounters([]);
        }
      } else {
        console.error('❌ API Error - Items Response:', itemsResponse.status, itemsResponse.statusText);
        console.error('❌ API Error - Counters Response:', countersResponse.status, countersResponse.statusText);
        showError('Failed to load data');
        setItems([]);
        setCounters([]);
      }
    } catch (error) {
      showError('Error loading data');
      console.error('Data fetch error:', error);
      setItems([]);
      setCounters([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle item creation
  const handleCreateItem = async (itemData) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8000/api/menu/staff/items/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        const result = await response.json();
        showSuccess(result.message);
        fetchItems(); // Refresh items
        setShowAddItemModal(false);
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to create item');
      }
    } catch (error) {
      showError('Error creating item');
      console.error('Create item error:', error);
    }
  };

  // Handle item update
  const handleUpdateItem = async (itemId, itemData) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://127.0.0.1:8000/api/menu/staff/items/${itemId}/update/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        const result = await response.json();
        showSuccess(result.message);
        fetchItems(); // Refresh items
        setSelectedItem(null);
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to update item');
      }
    } catch (error) {
      showError('Error updating item');
      console.error('Update item error:', error);
    }
  };

  // Handle item deletion
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://127.0.0.1:8000/api/menu/staff/items/${itemId}/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        showSuccess(result.message);
        fetchItems(); // Refresh items
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to delete item');
      }
    } catch (error) {
      showError('Error deleting item');
      console.error('Delete item error:', error);
    }
  };

  // Filter items based on search and counter
  const filteredItems = Array.isArray(items) ? items.filter(item => {
    if (!item || !item.name || !item.description || !item.counter) return false;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCounter = filterCounter === 'all' || item.counter.id === parseInt(filterCounter);
    return matchesSearch && matchesCounter;
  }) : [];

  // Load items on component mount
  useEffect(() => {
    fetchItems();
  }, []);

  // Dark mode effect
  useEffect(() => {
    document.body.className = darkMode ? 'dark-theme' : 'light-theme';
  }, [darkMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      showSuccess('Logged out successfully! 👋');
    } catch (error) {
      showError('Error during logout');
    }
  };

  return (
    <div className="staff-dashboard">
      {/* Sidebar */}
      <aside className="staff-sidebar">
        {/* Logo Section */}
        <div className="staff-logo-section">
          <img src="/KGLogo.png" alt="KgBites Logo" className="staff-logo" />
          <div className="staff-brand">
            <h1>KgBites</h1>
            <span className="staff-subtitle">Staff Portal</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="staff-sidebar-menu">
          <button 
            className={`staff-menu-btn ${activeView === 'items' ? 'active' : ''}`}
            onClick={() => setActiveView('items')}
          >
            <svg className="staff-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h18l-1.5 9H4.5L3 3z"/>
              <path d="M7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
              <path d="M20 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
            </svg>
            <span>Menu Items</span>
          </button>
          <button 
            className={`staff-menu-btn ${activeView === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveView('orders')}
          >
            <svg className="staff-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            <span>Orders</span>
          </button>
          <button 
            className={`staff-menu-btn ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            <svg className="staff-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
            </svg>
            <span>Analytics</span>
          </button>
        </nav>

        {/* User Menu */}
        <div className="staff-user-menu" ref={dropdownRef}>
          <button 
            className="staff-profile-btn"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <img src={avatarUrl} alt="Profile" className="staff-avatar" />
            <div className="staff-user-info">
              <span className="staff-user-name">{userData.full_name || userData.username}</span>
              <span className="staff-user-role">Staff Member</span>
            </div>
            <svg className="staff-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </button>
          
          {showProfileDropdown && (
            <div className="staff-dropdown-menu">
              <button onClick={() => setDarkMode(!darkMode)} className="staff-dropdown-item">
                <span>{darkMode ? '☀️' : '🌙'}</span>
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button onClick={handleLogout} className="staff-dropdown-item logout">
                <span>🚪</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="staff-main">
        {/* Header */}
        <header className="staff-content-header">
          <div className="staff-header-left">
            <h1 className="staff-page-title">
              {activeView === 'items' && '🍽️ Menu Items'}
              {activeView === 'orders' && '📋 Order Management'}
              {activeView === 'analytics' && '📊 Analytics Dashboard'}
            </h1>
            <p className="staff-page-subtitle">
              {activeView === 'items' && 'Manage your restaurant menu items'}
              {activeView === 'orders' && 'Track and manage customer orders'}
              {activeView === 'analytics' && 'View performance insights'}
            </p>
          </div>
          <div className="staff-header-actions">
            {activeView === 'items' && (
              <button 
                className="staff-primary-btn"
                onClick={() => setShowAddItemModal(true)}
              >
                <span>+</span>
                Add New Item
              </button>
            )}
          </div>
        </header>

        {/* Content Based on Active View */}
        <div className="staff-content">
          {activeView === 'items' && (
            <div className="staff-items-content">
              {/* Search and Filter */}
              <div className="staff-controls">
                <div className="staff-search-box">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  value={filterCounter} 
                  onChange={(e) => setFilterCounter(e.target.value)}
                  className="staff-filter-select"
                >
                  <option value="all">All Counters</option>
                  {counters.map(counter => (
                    <option key={counter.id} value={counter.id}>{counter.name}</option>
                  ))}
                </select>
              </div>

              {/* Items Grid */}
              {loading ? (
                <div className="staff-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading items...</p>
                </div>
              ) : (
                <div className="staff-items-grid">
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <ItemCard 
                        key={item.id} 
                        item={item} 
                        onEdit={setSelectedItem}
                        onDelete={() => handleDeleteItem(item.id)}
                      />
                    ))
                  ) : (
                    <div className="staff-empty-state">
                      <div className="empty-icon">🍽️</div>
                      <h3>No items found</h3>
                      <p>Create your first menu item to get started</p>
                      <button 
                        className="staff-primary-btn"
                        onClick={() => setShowAddItemModal(true)}
                      >
                        Add New Item
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeView === 'orders' && (
            <div className="staff-orders-content">
              <div className="staff-coming-soon">
                <div className="coming-soon-icon">📋</div>
                <h3>Order Management</h3>
                <p>Coming soon! This feature will allow you to manage customer orders.</p>
              </div>
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="staff-analytics-content">
              <div className="staff-coming-soon">
                <div className="coming-soon-icon">📊</div>
                <h3>Analytics Dashboard</h3>
                <p>Coming soon! View detailed analytics and insights here.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showAddItemModal && (
        <AddItemModal 
          counters={counters}
          onSave={handleCreateItem}
          onClose={() => setShowAddItemModal(false)}
        />
      )}

      {selectedItem && (
        <EditItemModal 
          item={selectedItem}
          counters={counters}
          onSave={(itemData) => handleUpdateItem(selectedItem.id, itemData)}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

export default StaffDashboard;