import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tokenService } from '../../services/authService';
import { useToast } from '../common/ToastProvider';
import orderService from '../../services/orderService';
import OrdersPage from './OrdersPage';
import Wallet from '../wallet/Wallet';
import walletService from '../../services/walletService';
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
  
  // Order Management States
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderProcessing, setOrderProcessing] = useState(false);
  
  // Navigation State
  const [currentPage, setCurrentPage] = useState('menu'); // menu, orders, history, wallet
  
  // Wallet State
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
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

  // Load wallet balance
  const loadWalletBalance = async () => {
    try {
      setLoadingBalance(true);
      const walletInfo = await walletService.getWalletInfo();
      // Ensure balance is always a number
      const balance = parseFloat(walletInfo.balance) || 0;
      setWalletBalance(balance);
    } catch (error) {
      console.error('Error loading wallet balance:', error);
      setWalletBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  // Fetch menu data from API
  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const token = tokenService.getToken();
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch('http://127.0.0.1:8000/api/menu/data/', {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setMenuData(data);
        console.log('Menu data loaded successfully');
      } else {
        console.warn('API response not ok, using fallback data');
        setMenuData(getFallbackMenuData());
        showError('Using offline menu data');
      }
    } catch (error) {
      console.warn('Network error, using fallback menu data:', error);
      
      // Check for specific error types
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('CORS or network connectivity issue');
        showError('Backend server not accessible - using offline data');
      } else if (error.name === 'AbortError') {
        console.error('Request was aborted');
        showError('Request timeout - using offline data');
      } else {
        console.error('Unknown fetch error:', error);
        showError('Network error - using offline data');
      }
      
      setMenuData(getFallbackMenuData());
    } finally {
      setLoading(false);
    }
  };

  // Fallback menu data when API is unavailable
  const getFallbackMenuData = () => ({
    counters: [
      { id: 1, name: 'Veg & Meals' },
      { id: 2, name: 'Biriyani & Chinese' },
      { id: 3, name: 'Snacks' }
    ],
    food_items: [
      {
        id: 1,
        name: 'Veg Rice Bowl',
        description: 'Steamed rice with mixed vegetables',
        price: 45.00,
        image: null,
        counter_name: 'Veg & Meals',
        counter_id: 1,
        stock: 50,
        is_available: true
      },
      {
        id: 2,
        name: 'Dal Curry',
        description: 'Traditional lentil curry',
        price: 25.00,
        image: null,
        counter_name: 'Veg & Meals',
        counter_id: 1,
        stock: 30,
        is_available: true
      },
      {
        id: 3,
        name: 'Chicken Biriyani',
        description: 'Aromatic basmati rice with chicken',
        price: 120.00,
        image: null,
        counter_name: 'Biriyani & Chinese',
        counter_id: 2,
        stock: 20,
        is_available: true
      },
      {
        id: 4,
        name: 'Fried Rice',
        description: 'Stir-fried rice with vegetables',
        price: 65.00,
        image: null,
        counter_name: 'Biriyani & Chinese',
        counter_id: 2,
        stock: 25,
        is_available: true
      },
      {
        id: 5,
        name: 'Samosa',
        description: 'Crispy pastry with spiced filling',
        price: 15.00,
        image: null,
        counter_name: 'Snacks',
        counter_id: 3,
        stock: 40,
        is_available: true
      },
      {
        id: 6,
        name: 'Tea',
        description: 'Hot masala chai',
        price: 10.00,
        image: null,
        counter_name: 'Snacks',
        counter_id: 3,
        stock: 100,
        is_available: true
      }
    ],
    featured_items: [],
    popular_items: []
  });

  // Load menu data when component mounts
  useEffect(() => {
    fetchMenuData();
    loadWalletBalance();
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
    
    // Check if item has stock available
    if (!item.stock || item.stock <= 0) {
      showError(`${item.name} is currently out of stock`);
      return;
    }
    
    if (existingItem) {
      // Check if adding one more would exceed available stock
      if (existingItem.quantity >= item.stock) {
        showError(`Maximum stock limit reached! Only ${item.stock} ${item.stock === 1 ? 'item' : 'items'} available for "${item.name}"`);
        return;
      }
      
      setCartItems(cartItems.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
      
      // Show info message when reaching max stock after this addition
      if (existingItem.quantity + 1 === item.stock) {
        showSuccess(`${item.name} added! Maximum available quantity (${item.stock}) now in cart`);
        return;
      }
    } else {
      setCartItems([...cartItems, { ...item, quantity: 1 }]);
      
      // Show info if adding single item that is the last one available
      if (item.stock === 1) {
        showSuccess(`${item.name} added! This is the last one available`);
        return;
      }
    }
    showSuccess(`${item.name} added to cart`);
  };

  const updateQuantity = (id, change) => {
    const itemToUpdate = cartItems.find(item => item.id === id);
    
    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + change;
        
        // Prevent going below 0
        if (newQuantity < 0) return item;
        
        // Check if exceeding available stock when increasing quantity
        if (change > 0 && newQuantity > item.stock) {
          showError(`Maximum stock limit reached! Only ${item.stock} ${item.stock === 1 ? 'item' : 'items'} available for "${item.name}"`);
          return item;
        }
        
        // Show info message when reaching max stock
        if (change > 0 && newQuantity === item.stock) {
          showSuccess(`Maximum available quantity (${item.stock}) added to cart`);
        }
        
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
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

  // Utility function to generate order code
  const generateOrderCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let result = '';
    
    // 2 letters + 4 numbers format (e.g., KB1234)
    for (let i = 0; i < 2; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 4; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return result;
  };

  // Group cart items by counter
  const groupItemsByCounter = (items) => {
    return items.reduce((acc, item) => {
      // Try multiple possible counter field names
      const counterName = item.counter_name || 
                          item.counter?.name || 
                          item.counter || 
                          'General Counter';
      
      if (!acc[counterName]) {
        acc[counterName] = [];
      }
      acc[counterName].push({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price || 0),
        quantity: item.quantity,
        total: parseFloat(item.price || 0) * item.quantity,
        image_url: item.image_display_url || item.image_url
      });
      return acc;
    }, {});
  };

  // Handle order confirmation
  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) {
      showError('Cart is empty');
      return;
    }

    // Debug: Log cart items structure
    console.log('Cart items for debugging:', cartItems);

    // Validate cart items
    const invalidItems = cartItems.filter(item => 
      !item.price || parseFloat(item.price) <= 0 || 
      !item.quantity || item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      console.log('Invalid items found:', invalidItems);
      showError('Some items in your cart have invalid data. Please refresh and try again.');
      return;
    }

    // Check for missing counter names and provide default
    cartItems.forEach(item => {
      if (!item.counter_name && !item.counter) {
        console.warn('Item missing counter info:', item);
        item.counter_name = 'Unknown Counter';
      }
    });

    try {
      setOrderProcessing(true);
      
      // Group items by counter (by counter ID for proper tracking)
      const itemsByCounterId = {};
      const counterIdToName = {};
      
      cartItems.forEach(item => {
        const counterId = item.counter_id || item.counter?.id || 'unknown';
        const counterName = item.counter_name || item.counter?.name || 'Unknown Counter';
        
        counterIdToName[counterId] = counterName;
        
        if (!itemsByCounterId[counterId]) {
          itemsByCounterId[counterId] = [];
        }
        
        itemsByCounterId[counterId].push({
          id: item.id,
          food_item_id: item.id,  // For stock deduction
          name: item.name,
          price: parseFloat(item.price || 0),
          unit_price: parseFloat(item.price || 0),
          quantity: item.quantity,
          total_price: parseFloat(item.price || 0) * item.quantity,
          image_url: item.image_display_url || item.image_url,
          delivered: false
        });
      });
      
      const countersInvolved = Object.keys(itemsByCounterId).map(id => parseInt(id) || id);
      
      if (countersInvolved.length === 0) {
        showError('No valid counters found in cart');
        return;
      }

      // Calculate totals
      let subtotal = 0;
      cartItems.forEach(item => {
        subtotal += parseFloat(item.price || 0) * (item.quantity || 0);
      });
      const taxAmount = Math.round(subtotal * 0.10 * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      // Check wallet balance before proceeding
      try {
        const walletInfo = await walletService.getWalletInfo();
        const balance = parseFloat(walletInfo.balance) || 0;
        if (balance < totalAmount) {
          showError(`Insufficient balance. You need ₹${(totalAmount - balance).toFixed(2)} more in your wallet.`);
          setCurrentPage('wallet'); // Redirect to wallet page
          return;
        }
      } catch (error) {
        console.warn('Could not check wallet balance, proceeding with order:', error);
      }

      // Build order payload with proper structure for counter-based delivery
      const payload = {
        student_name: userData.full_name || userData.name || 'Unknown Student',
        student_id: userData.id || userData.roll_number || userData.student_id || 'Unknown',
        student_email: userData.email || '',
        total_amount: totalAmount,
        subtotal: subtotal,
        tax_amount: taxAmount,
        status: 'confirmed',
        created_at: new Date().toISOString(),
        items_by_counter: itemsByCounterId,  // Now keyed by counter ID
        counter_names: counterIdToName,       // Map of counter ID to name
        counters_involved: countersInvolved,  // Array of counter IDs
        counters_completed: [],
        is_complete: false
      };

      console.log('Creating OTP with payload:', payload);

      // Create OTP on server (cab-style) - this will also deduct stock immediately
      const otpRes = await orderService.createOtpOnServer(payload);

      console.log('OTP created successfully:', otpRes);

      // Process payment if OTP creation was successful
      try {
        // Note: In a real implementation, you would create an Order record first
        // and then process payment. For now, we'll simulate this process
        console.log('Processing payment...');
        
        // Simulate payment processing (in real app, this would involve the Order ID)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showSuccess('Payment processed successfully!');
        
        // Reload wallet balance after successful payment
        loadWalletBalance();
      } catch (paymentError) {
        console.error('Payment processing failed:', paymentError);
        showError('Payment failed. Please try again or contact support.');
        // In a real app, you might want to cancel the order here
        return;
      }

      // Map server response to UI object
      const newOrder = {
        id: Date.now(),
        orderCode: otpRes.code,
        studentName: otpRes.payload?.student_name || 'Student',
        itemsByCounter: otpRes.payload?.items_by_counter || {},
        counterNames: otpRes.payload?.counter_names || {},
        countersInvolved: otpRes.payload?.counters_involved || [],
        countersCompleted: otpRes.payload?.counters_completed || [],
        isComplete: otpRes.payload?.is_complete || false,
        subtotal: otpRes.payload?.subtotal || 0,
        tax: otpRes.payload?.tax_amount || 0,
        total: otpRes.payload?.total_amount || 0,
        createdAt: new Date(otpRes.payload?.created_at || Date.now()),
        status: otpRes.status || 'active',
        otp_status: otpRes.status || 'active',
        expires_at: otpRes.expires_at,
        generated_by: otpRes.generated_by
      };

      // Optional: also save locally for student's tracking/debug
      try {
        orderService.saveOrder({
          order_code: newOrder.orderCode,
          student_name: newOrder.studentName,
          total_amount: newOrder.total,
          subtotal: newOrder.subtotal,
          tax_amount: newOrder.tax,
          status: 'confirmed',
          created_at: newOrder.createdAt.toISOString(),
          items_by_counter: newOrder.itemsByCounter,
          counter_names: newOrder.counterNames,
          counters_involved: newOrder.countersInvolved,
          counters_completed: newOrder.countersCompleted,
          is_complete: newOrder.isComplete,
          otp_status: newOrder.otp_status,
          expires_at: newOrder.expires_at,
          generated_by: newOrder.generated_by
        });
      } catch (e) {
        console.warn('Failed to save local copy of order (non-blocking):', e);
      }
      
      setCurrentOrder(newOrder);
      setOrderConfirmed(true);
      setShowOrderModal(true);
      setCartItems([]);
      setShowCart(false);
      
      // Refresh menu data to show updated stock
      fetchMenuData();
      
      showSuccess(`Order confirmed! Your order code is: ${newOrder.orderCode}`);
      
    } catch (error) {
      const msg = typeof error?.message === 'string' ? error.message : 'Unexpected error occurred. Please try again.';
      showError(msg);
      console.error('Order confirmation error:', error);
    } finally {
      setOrderProcessing(false);
    }
  };

  // Close order modal
  const closeOrderModal = () => {
    setShowOrderModal(false);
  };

  // Navigate to order tracking
  const goToOrderTracking = () => {
    setShowOrderModal(false);
    setCurrentPage('orders');
    showSuccess('Order saved! You can track it in Orders section.');
  };

  // Copy order code to clipboard
  const copyOrderCode = async () => {
    if (currentOrder?.orderCode) {
      try {
        await navigator.clipboard.writeText(currentOrder.orderCode);
        showSuccess('Order code copied to clipboard!');
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentOrder.orderCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccess('Order code copied to clipboard!');
      }
    }
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
          <button 
            className={`menu-btn ${currentPage === 'menu' ? 'active' : ''}`}
            onClick={() => setCurrentPage('menu')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Menu</span>
          </button>
          <button 
            className={`menu-btn ${currentPage === 'orders' ? 'active' : ''}`}
            onClick={() => setCurrentPage('orders')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span>Orders</span>
          </button>
          <button 
            className={`menu-btn ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentPage('history')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>History</span>
          </button>
          <button 
            className={`menu-btn ${currentPage === 'wallet' ? 'active' : ''}`}
            onClick={() => setCurrentPage('wallet')}
          >
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
        {/* Menu Page */}
        {currentPage === 'menu' && (
          <>
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
            filteredItems.map(item => {
              const cartItem = cartItems.find(ci => ci.id === item.id);
              const isAtMaxStock = cartItem && cartItem.quantity >= item.stock;
              
              return (
              <div key={item.id} className="product-card" style={{ position: 'relative' }}>
                {/* Max Stock Badge */}
                {isAtMaxStock && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}>
                    <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    MAX LIMIT
                  </div>
                )}
                
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
                        <button 
                          className="qty-btn" 
                          onClick={() => updateQuantity(item.id, 1)}
                          disabled={cartItems.find(ci => ci.id === item.id)?.quantity >= item.stock}
                          style={{ 
                            opacity: cartItems.find(ci => ci.id === item.id)?.quantity >= item.stock ? 0.5 : 1,
                            cursor: cartItems.find(ci => ci.id === item.id)?.quantity >= item.stock ? 'not-allowed' : 'pointer'
                          }}
                        >
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
              );
            })
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
          </>
        )}

        {/* Orders Page */}
        {currentPage === 'orders' && (
          <div className="page-content">
            <OrdersPage />
          </div>
        )}

        {/* History Page */}
        {currentPage === 'history' && (
          <div className="page-content">
            <header className="top-bar">
              <div>
                <h2 className="main-title">🕐 Order History</h2>
                <p className="main-subtitle">Your past orders</p>
              </div>
            </header>
            <div className="coming-soon-page">
              <div className="coming-soon-icon">🕐</div>
              <h3>Order History</h3>
              <p>View your previous orders and reorder favorites. This feature is coming soon!</p>
              <button 
                className="btn-primary"
                onClick={() => setCurrentPage('menu')}
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}

        {/* Wallet Page */}
        {currentPage === 'wallet' && (
          <div className="page-content">
            <Wallet />
          </div>
        )}
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
                    {item.quantity >= item.stock && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        marginTop: '4px',
                        padding: '4px 8px',
                        background: 'rgba(255, 107, 107, 0.15)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 107, 107, 0.3)'
                      }}>
                        <svg style={{ width: '12px', height: '12px', color: '#ff6b6b' }} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                        </svg>
                        <span style={{ fontSize: '10px', color: '#ff6b6b', fontWeight: '600' }}>
                          MAX STOCK ({item.stock})
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="cart-item-qty">
                    <button className="qty-small-btn" onClick={() => updateQuantity(item.id, -1)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                    <span>{item.quantity}</span>
                    <button 
                      className="qty-small-btn" 
                      onClick={() => updateQuantity(item.id, 1)}
                      disabled={item.quantity >= item.stock}
                      style={{ 
                        opacity: item.quantity >= item.stock ? 0.5 : 1,
                        cursor: item.quantity >= item.stock ? 'not-allowed' : 'pointer'
                      }}
                    >
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
              <div className="summary-sep"></div>
              <div className="summary-row wallet-balance">
                <span>💳 Wallet Balance</span>
                <span className={getTotal() <= Number(walletBalance || 0) ? 'sufficient' : 'insufficient'}>
                  {loadingBalance ? 'Loading...' : `$${Number(walletBalance || 0).toFixed(2)}`}
                </span>
              </div>
              {getTotal() > Number(walletBalance || 0) && (
                <div className="insufficient-balance-warning">
                  <span>⚠️ Insufficient balance. Add money to wallet.</span>
                </div>
              )}
            </div>

            <button 
              className="checkout-btn" 
              onClick={handleConfirmOrder}
              disabled={orderProcessing || cartItems.length === 0}
            >
              <span>{orderProcessing ? 'Processing...' : 'Confirm order'}</span>
              {!orderProcessing && (
                <svg className="checkout-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              )}
            </button>
          </>
        )}
      </aside>

      {/* Order Confirmation Modal */}
      {showOrderModal && currentOrder && (
        <div className="modal-overlay">
          <div className="order-modal">
            <div className="order-modal-header">
              <h2>🎉 Order Confirmed!</h2>
              <button 
                className="modal-close-btn"
                onClick={closeOrderModal}
                disabled={orderProcessing}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="order-code-section">
              <h3>Your Order Code (OTP)</h3>
              <div className="order-code-display" onClick={copyOrderCode} title="Click to copy">
                {currentOrder.orderCode}
              </div>
              <p className="order-code-instruction">
                📱 <strong>Like a cab booking OTP:</strong> Show this code at each counter<br/>
                ⏰ <strong>Valid for 24 hours</strong> - becomes invalid after use<br/>
                🔒 <strong>One-time use:</strong> Staff will validate and consume this code<br/>
                <small>💡 Tap the code above to copy it</small>
              </p>
              <div className="otp-status">
                <span className="otp-active">🟢 OTP Status: ACTIVE</span>
                <span className="cross-port-info">
                  🔄 Synchronized across all staff counters
                </span>
              </div>
            </div>

            <div className="order-counters-section">
              <h4>🏪 Visit These Counters ({(currentOrder.countersInvolved || []).length}):</h4>
              {Object.entries(currentOrder.itemsByCounter || {}).map(([counterId, items]) => {
                // Get counter name from the counterNames map (counter ID -> counter name)
                const counterName = currentOrder.counterNames?.[counterId] || `Counter ${counterId}`;
                
                return (
                <div key={counterId} className="counter-section">
                  <div className="counter-header">
                    <h5>📋 {counterName}</h5>
                    <span className="items-count">
                      {items.length} item{items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="counter-items">
                    {(items || []).map((item, index) => (
                      <div key={`${item.id || index}-${index}`} className="counter-item">
                        <div className="counter-item-main">
                          <span className="counter-item-name">🍽️ {item.name || 'Item'} × {item.quantity || 1}</span>
                        </div>
                        <span className="counter-item-price">₹{(item.total_price || (item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>

            <div className="order-summary-section">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{currentOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (10%)</span>
                <span>₹{currentOrder.tax.toFixed(2)}</span>
              </div>
              <div className="summary-sep"></div>
              <div className="summary-row total">
                <span>💰 Total Amount</span>
                <span>₹{currentOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="order-instructions">
              <div className="instruction-card">
                <div className="instruction-icon">1️⃣</div>
                <div className="instruction-text">
                  <strong>Go to Counter</strong>
                  <span>Visit each counter listed above</span>
                </div>
              </div>
              <div className="instruction-card">
                <div className="instruction-icon">2️⃣</div>
                <div className="instruction-text">
                  <strong>Show Code</strong>
                  <span>Present your order code: <code>{currentOrder.orderCode}</code></span>
                </div>
              </div>
              <div className="instruction-card">
                <div className="instruction-icon">3️⃣</div>
                <div className="instruction-text">
                  <strong>Collect Items</strong>
                  <span>Staff will mark items as delivered</span>
                </div>
              </div>
            </div>

            <div className="order-modal-actions">
              <button 
                className="btn-secondary"
                onClick={closeOrderModal}
              >
                Continue Shopping
              </button>
              <button 
                className="btn-primary"
                onClick={goToOrderTracking}
              >
                Track Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Overlay for Mobile */}
      {showCart && <div className="cart-overlay" onClick={toggleCart}></div>}
    </div>
  );
}

export default Dashboard;
