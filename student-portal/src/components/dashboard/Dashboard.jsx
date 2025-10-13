import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../common/ToastProvider';
import FloatingCart from '../common/FloatingCart';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { addItem, getItemQuantity } = useCart();
  const { showSuccess, showError } = useToast();
  
  const [menuData, setMenuData] = useState({
    counters: [],
    food_items: [],
    featured_items: [],
    popular_items: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedCounter, setSelectedCounter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('all'); // all, featured, popular

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/menu/data/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMenuData(data);
      } else {
        showError('Failed to load menu data');
      }
    } catch (error) {
      console.error('Error fetching menu data:', error);
      showError('Error loading menu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    addItem(item);
    showSuccess(`${item.name} added to cart!`);
  };

  const handleLogout = () => {
    logout();
    showSuccess('Logged out successfully! 👋');
  };

  const filteredItems = () => {
    let items = [];
    
    switch (activeView) {
      case 'featured':
        items = menuData.featured_items;
        break;
      case 'popular':
        items = menuData.popular_items;
        break;
      default:
        items = menuData.food_items;
    }

    // Filter by counter
    if (selectedCounter !== 'all') {
      items = items.filter(item => item.counter_id === parseInt(selectedCounter));
    }

    // Filter by search query
    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return items;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading delicious menu...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.username}! 👋</h1>
          <p>Discover amazing food from our campus counters</p>
        </div>
        
        <div className="header-right">
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-number">{menuData.counters?.length || 0}</div>
              <div className="stat-label">Counters</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{menuData.food_items?.length || 0}</div>
              <div className="stat-label">Food Items</div>
            </div>
          </div>
          
          <button className="logout-btn" onClick={handleLogout}>
            <svg className="logout-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-filters">
        <div className="view-tabs">
          <button 
            className={`tab ${activeView === 'all' ? 'active' : ''}`}
            onClick={() => setActiveView('all')}
          >
            All Items
          </button>
          <button 
            className={`tab ${activeView === 'featured' ? 'active' : ''}`}
            onClick={() => setActiveView('featured')}
          >
            Featured
          </button>
          <button 
            className={`tab ${activeView === 'popular' ? 'active' : ''}`}
            onClick={() => setActiveView('popular')}
          >
            Popular
          </button>
        </div>

        <div className="filter-controls">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search food items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select 
            className="counter-filter"
            value={selectedCounter}
            onChange={(e) => setSelectedCounter(e.target.value)}
          >
            <option value="all">All Counters</option>
            {menuData.counters?.map(counter => (
              <option key={counter.id} value={counter.id}>
                {counter.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Food Items Grid */}
      <div className="food-grid">
        {filteredItems().length > 0 ? (
          filteredItems().map(item => (
            <div key={item.id} className="food-card">
              <div className="food-card-header">
                <div className="counter-badge">{item.counter_name}</div>
                <div className="stock-badge">
                  {item.stock > 10 ? '✅ In Stock' : item.stock > 0 ? '⚠️ Low Stock' : '❌ Out of Stock'}
                </div>
              </div>
              
              <div className="food-info">
                <h3 className="food-name">{item.name}</h3>
                <p className="food-description">{item.description}</p>
                
                <div className="food-details">
                  <div className="price">₹{item.price}</div>
                  <div className="prep-time">🕒 {item.preparation_time} min</div>
                </div>
              </div>

              <div className="food-actions">
                {getItemQuantity(item.id) > 0 ? (
                  <div className="quantity-display">
                    <span className="in-cart-badge">
                      {getItemQuantity(item.id)} in cart
                    </span>
                  </div>
                ) : null}
                
                <button 
                  className="add-to-cart-btn"
                  onClick={() => handleAddToCart(item)}
                  disabled={item.stock === 0}
                >
                  {item.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <h3>No items found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Floating Cart */}
      <FloatingCart />
    </div>
  );
};

export default Dashboard;