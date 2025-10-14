import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tokenService } from '../../services/authService';
import { useToast } from '../common/ToastProvider';
import './Dashboard.css';

function Dashboard() {
  const { logout, user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  // State Management
  const [filterType, setFilterType] = useState('all');
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuData, setMenuData] = useState({
    counters: [],
    food_items: [],
    featured_items: [],
    popular_items: []
  });
  const dropdownRef = useRef(null);
  
  // User Data
  const userData = user || tokenService.getUser() || {
    name: 'Student',
    email: 'student@kgbites.com',
    rollNumber: 'ST2025001',
  };

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name || userData.name || 'User')}&background=f7af08&color=1B1B1E`;

  // Get food items from menu data
  const foodItems = menuData.food_items || [];

  // Fetch menu data from API
  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const token = tokenService.getToken();
      
      if (!token) {
        showError('Please log in to view menu');
        return;
      }

      const response = await fetch('http://127.0.0.1:8000/api/menu/data/', {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMenuData(data);
      } else {
        const errorData = await response.json();
        showError('Failed to load menu data');
        console.error('Menu fetch error:', errorData);
      }
    } catch (error) {
      showError('Network error while loading menu');
      console.error('Menu fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load menu data when component mounts
  useEffect(() => {
    fetchMenuData();
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

  // Filter items with search and filter type
  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = 
      filterType === 'all' ? true :
      filterType === 'veg' ? item.is_veg === true :
      filterType === 'non-veg' ? item.is_veg === false :
      filterType === 'snacks' ? item.category === 'appetizer' :
      true;
    
    return matchesSearch && matchesFilter;
  });

  // Cart Functions
  const addToCart = (item) => {
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCartItems(cartItems.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCartItems([...cartItems, { ...item, quantity: 1 }]);
    }
    showSuccess(`${item.name} added to cart`);
  };

  const updateQuantity = (id, change) => {
    setCartItems(cartItems.map(item => 
      item.id === id 
        ? { ...item, quantity: Math.max(0, item.quantity + change) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const getTotalItems = () => cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const getSubtotal = () => cartItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0);
  const getTax = () => getSubtotal() * 0.1;
  const getTotal = () => getSubtotal() + getTax();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      setShowProfileDropdown(false);
      showSuccess('Logged out successfully');
      logout();
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    showSuccess(darkMode ? 'Light mode activated' : 'Dark mode activated');
  };

  const toggleCart = () => {
    setShowCart(!showCart);
  };

  return (
    <div className={`pos-dashboard ${darkMode ? 'dark' : 'light'} ${!showCart ? 'cart-hidden' : ''}`}>
      {/* Left Sidebar - Desktop Navigation */}
      <aside className="sidebar-left">
        <div className="sidebar-brand-section">
          <img src="/KGLogo.png" alt="Logo" className="brand-logo-img" />
          <h1 className="brand-title">KgBites</h1>
        </div>

        <nav className="sidebar-menu">
          <button className="menu-btn active">
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Menu</span>
          </button>
          <button className="menu-btn">
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span>Orders</span>
          </button>
          <button className="menu-btn">
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>History</span>
          </button>
          <button className="menu-btn">
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span>Wallet</span>
          </button>
        </nav>

        <div className="sidebar-footer-section">
          <div className="user-menu" ref={dropdownRef}>
            <button className="user-trigger-btn" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
              <img src={avatarUrl} alt="User" className="user-img" />
              <div className="user-text">
                <p className="user-name-text">{userData.full_name || userData.name}</p>
                <p className="user-role-text">Student</p>
              </div>
            </button>

            {showProfileDropdown && (
              <div className="user-dropdown-panel">
                <button className="dropdown-option">
                  <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  My Profile
                </button>
                <button className="dropdown-option">
                  <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m5.2-14.2l-4.2 4.2m-2.4 2.4l-4.2 4.2m14.4 0l-4.2-4.2m-2.4-2.4l-4.2-4.2"/>
                  </svg>
                  Settings
                </button>
                <button className="dropdown-option" onClick={toggleDarkMode}>
                  {darkMode ? (
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1" x2="12" y2="3"/>
                      <line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/>
                      <line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                  ) : (
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  )}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <div className="dropdown-separator"></div>
                <button className="dropdown-option danger" onClick={handleLogout}>
                  <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content-area">
        <header className="top-bar">
          <div>
            <h2 className="main-title">Choose Dishes</h2>
            <p className="main-subtitle">{filteredItems.length} items available</p>
          </div>

          <div className="top-bar-actions">
            {/* Search */}
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                id="student-search-menu"
                name="search"
                type="text"
                placeholder="Search menu..."
                className="search-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Notification */}
            <button className="notify-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="notify-dot"></span>
            </button>

            {/* Cart Toggle Button */}
            <button className="cart-toggle-btn" onClick={toggleCart}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {getTotalItems() > 0 && <span className="cart-badge">{getTotalItems()}</span>}
            </button>
          </div>
        </header>

        {/* Filter Section - Replaces Category Bar */}
        <div className="filter-section">
          <select 
            id="student-filter-type"
            name="filter_type"
            className="filter-select-main"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            autoComplete="off"
          >
            <option value="all">All Items</option>
            <option value="veg">Vegetarian</option>
            <option value="non-veg">Non-Vegetarian</option>
            <option value="snacks">Snacks</option>
          </select>
        </div>

        <div className="products-grid">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div key={item.id} className="product-card">
                <div className="product-img-box">
                  <img src={item.image_display_url || item.image_url || '/placeholder-food.jpg'} alt={item.name} className="product-img" />
                  {item.is_veg && <span className="veg-tag">VEG</span>}
                  {item.stock === 0 && <div className="sold-out-overlay">Sold Out</div>}
                </div>

                <div className="product-info">
                  <h3 className="product-name">{item.name}</h3>
                  <p className="product-desc">{item.description}</p>

                  <div className="product-meta-row">
                    <span className="meta-counter">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9V7C3 6.44772 3.44772 6 4 6H20C20.5523 6 21 6.44772 21 7V9"/>
                        <path d="M3 9V19C3 19.5523 3.44772 20 4 20H20C20.5523 20 21 19.5523 21 19V9"/>
                        <path d="M9 13H15"/>
                      </svg>
                      {item.counter_name}
                    </span>
                    <span className={`meta-stock ${item.stock > 5 ? 'good' : 'low'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 4H8C6.89543 4 6 4.89543 6 6V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V6C18 4.89543 17.1046 4 16 4Z"/>
                        <path d="M9 8H15"/>
                        <path d="M9 12H15"/>
                        <path d="M9 16H15"/>
                      </svg>
                      {item.stock > 0 ? `${item.stock} available` : 'Out of stock'}
                    </span>
                  </div>

                  <div className="product-action-row">
                    <div className="price-box">
                      <span className="price-symbol">$</span>
                      <span className="price-value">{parseFloat(item.price || 0).toFixed(2)}</span>
                    </div>

                    {cartItems.find(ci => ci.id === item.id) ? (
                      <div className="qty-controls">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </button>
                        <span className="qty-num">{cartItems.find(ci => ci.id === item.id)?.quantity}</span>
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        className="add-cart-btn"
                        onClick={() => addToCart(item)}
                        disabled={item.available === 0}
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-view">
              <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <h3>No items found</h3>
              <p>Try another filter or search</p>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Cart */}
      <aside className={`sidebar-right ${showCart ? 'show' : ''}`}>
        <div className="cart-header">
          <h3 className="cart-title">Current Order</h3>
          <button className="cart-close-btn" onClick={toggleCart}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <svg className="cart-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p className="cart-empty-text">Cart is empty</p>
            <span className="cart-empty-hint">Start adding items</span>
          </div>
        ) : (
          <>
            <div className="cart-items-list">
              {cartItems.map(item => (
                <div key={item.id} className="cart-item-row">
                  <img src={item.image_display_url || item.image_url || '/placeholder-food.jpg'} alt={item.name} className="cart-item-img" />
                  <div className="cart-item-info">
                    <h4 className="cart-item-name">{item.name}</h4>
                    <p className="cart-item-price">${parseFloat(item.price || 0).toFixed(2)}</p>
                  </div>
                  <div className="cart-item-qty">
                    <button className="qty-small-btn" onClick={() => updateQuantity(item.id, -1)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                    <span>{item.quantity}</span>
                    <button className="qty-small-btn" onClick={() => updateQuantity(item.id, 1)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  </div>
                  <div className="cart-item-total">${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (10%)</span>
                <span>${getTax().toFixed(2)}</span>
              </div>
              <div className="summary-sep"></div>
              <div className="summary-row total">
                <span>Total</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
            </div>

            <button className="checkout-btn">
              <span>Confirm order</span>
              <svg className="checkout-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </>
        )}
      </aside>

      {/* Cart Overlay for Mobile */}
      {showCart && <div className="cart-overlay" onClick={toggleCart}></div>}
    </div>
  );
}

export default Dashboard;
