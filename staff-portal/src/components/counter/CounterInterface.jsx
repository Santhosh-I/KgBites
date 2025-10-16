import React, { useState, useEffect } from 'react';
import orderService from '../../services/orderService';
import './CounterInterface.css';

// Simple toast function as fallback
const showToast = (message, type = 'info') => {
  console.log(`${type.toUpperCase()}: ${message}`);
  alert(message); // Temporary fallback
};

// Using shared orderService from services folder
/* Commented out inline orderService - using imported one instead
const orderService = {
  storageKey: 'kgbites_orders',
  
  getAllOrders() {
    try {
      console.log('getAllOrders() called, storage key:', this.storageKey);
      const orders = localStorage.getItem(this.storageKey);
      console.log('Raw localStorage content:', orders);
      const parsed = orders ? JSON.parse(orders) : {};
      console.log('Parsed orders:', parsed);
      return parsed;
    } catch (error) {
      console.error('Error reading orders:', error);
      return {};
    }
  },
  
  getOrderByCode(orderCode) {
    try {
      const orders = this.getAllOrders();
      const upperCode = orderCode.toUpperCase(); // Ensure uppercase search
      console.log(`Looking for order ${upperCode} in:`, orders);
      console.log(`Available order codes:`, Object.keys(orders));
      console.log(`Available codes: ${Object.keys(orders).join(', ')}`);
      console.log(`Searching for: ${upperCode}`);
      console.log(`Exact match check:`, orders[upperCode]);
      return orders[upperCode] || null;
    } catch (error) {
      console.error('Error getting order:', error);
      return null;
    }
  },
  
  markCounterDelivered(orderCode, counterName, deliveredItems) {
    try {
      const orders = this.getAllOrders();
      const order = orders[orderCode];
      if (!order) return false;

      // Update items in the specific counter
      if (order.items_by_counter && order.items_by_counter[counterName]) {
        order.items_by_counter[counterName] = order.items_by_counter[counterName].map(item => ({
          ...item,
          delivered: deliveredItems.includes(item.id) ? true : item.delivered
        }));
      }

      // Add counter to completed list if not already there
      if (!order.counters_completed) {
        order.counters_completed = [];
      }
      if (!order.counters_completed.includes(counterName)) {
        order.counters_completed.push(counterName);
      }

      // Check if order is complete
      const allCounters = Object.keys(order.items_by_counter || {});
      order.is_complete = allCounters.every(counter => 
        order.counters_completed.includes(counter)
      );

      orders[orderCode] = order;
      localStorage.setItem(this.storageKey, JSON.stringify(orders));
      return true;
    } catch (error) {
      console.error('Error marking counter delivered:', error);
      return false;
    }
  },
*/

// Using imported orderService from services folder

const CounterInterface = () => {
  const showSuccess = (msg) => showToast(msg, 'success');
  const showError = (msg) => showToast(msg, 'error');
  const showInfo = (msg) => showToast(msg, 'info');
  
  // State Management
  const [selectedCounter, setSelectedCounter] = useState('Veg & Meals');
  const [orderCode, setOrderCode] = useState('');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingDelivery, setProcessingDelivery] = useState(false);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [recentOrders, setRecentOrders] = useState([]);
  const [syncTrigger, setSyncTrigger] = useState(0); // Force re-render trigger
  
  // Available counters
  const availableCounters = [
    'Veg & Meals',
    'Biriyani & Chinese', 
    'Snacks'
  ];

  // Cross-port sync removed; server is source of truth.

  // Test function to create a sample order (for debugging)
  const createTestOrder = () => {
    const testOrder = {
      order_code: 'TS1234',
      student_name: 'Test Student',
      student_id: 'TEST001',
      student_email: 'test@example.com',
      total_amount: 50.00,
      subtotal: 45.00,
      tax_amount: 5.00,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      items_by_counter: {
        'Veg & Meals': [
          { id: 1, name: 'Test Rice', quantity: 1, unit_price: 25.00, total_price: 25.00, delivered: false }
        ],
        'Snacks': [
          { id: 2, name: 'Test Tea', quantity: 2, unit_price: 10.00, total_price: 20.00, delivered: false }
        ]
      },
      counters_involved: ['Veg & Meals', 'Snacks'],
      counters_completed: [],
      is_complete: false
    };
    
    const saved = orderService.saveOrder(testOrder);
    if (saved) {
      showSuccess('Test order TS1234 created successfully!');
      console.log('Test order created:', testOrder);
    } else {
      showError('Failed to create test order');
    }
  };

  // Counter emojis for UI
  const counterEmojis = {
    'Veg & Meals': '🥗',
    'Biriyani & Chinese': '🍛',
    'Snacks': '🍿'
  };

  // Reset form
  const resetForm = () => {
    setOrderCode('');  
    setCurrentOrder(null);
    setCheckedItems(new Set());
    setProcessingDelivery(false);
  };

  // Validate order code format
  const isValidOrderCode = (code) => {
    const orderCodeRegex = /^[A-Z]{2}[0-9]{4}$/;
    return orderCodeRegex.test(code);
  };



  // Fetch order by code (uses server OTP endpoint)
  const fetchOrder = async () => {
    const trimmedCode = orderCode.trim().toUpperCase();
    
    // Validation
    if (!trimmedCode) {
      showError('Please enter an order code');
      return;
    }

    if (!isValidOrderCode(trimmedCode)) {
      showError('Invalid order code format. Expected format: AB1234');
      return;
    }

      try {
      setLoading(true);
      
      // Debug: Check which orderService is being used
      console.log('=== DEBUGGING ORDER SEARCH IN STAFF PORTAL ===');
      console.log('OrderService type:', typeof orderService);
      console.log('OrderService methods:', Object.keys(orderService));
      console.log('Searching for code:', trimmedCode);
      console.log('Storage key:', orderService.storageKey);
      console.log('Current localStorage content:', localStorage.getItem(orderService.storageKey));
      console.log('All orders available:', orderService.getAllOrders());
      console.log('Port/Domain:', window.location.origin);
      
      // Prefer server OTP lookup
      let serverOtp;
      try {
        serverOtp = await orderService.fetchOrderByCodeFromServer(trimmedCode);
      } catch (e) {
        console.error('=== DETAILED ERROR ===');
        console.error('Error object:', e);
        console.error('Error message:', e?.message);
        console.error('Error status:', e?.status);
        console.error('Error stack:', e?.stack);
        console.error('=====================');
        
        if (e?.status === 401 || e?.status === 403) {
          showError('🔒 Authentication failed! Please log out and log in again. Your session may have expired.');
          // Optionally redirect to login after a delay
          setTimeout(() => {
            localStorage.clear();
            window.location.href = '/';
          }, 3000);
        } else if (e?.status === 404) {
          showError('Order code not found');
        } else if (e?.status === 409) {
          showError('Order code already used');
        } else if (e?.status === 410) {
          showError('Order code expired');
        } else if (e?.message?.includes('Failed to fetch') || e?.message?.includes('NetworkError')) {
          showError('❌ Backend server not responding! Make sure Django is running on http://localhost:8000');
        } else {
          showError(`Failed to fetch order: ${e?.message || 'Unknown error'}. Check console for details.`);
        }
        setCurrentOrder(null);
        return;
      }

      // Map server response to UI shape used by this component
      const payload = serverOtp.payload || {};
      
      // Convert counter IDs to counter names for display
      const itemsByCounterName = {};
      const counterNames = payload.counter_names || {};
      const itemsByCounterId = payload.items_by_counter || {};
      
      // Transform from counter ID keys to counter name keys for UI compatibility
      Object.entries(itemsByCounterId).forEach(([counterId, items]) => {
        const counterName = counterNames[counterId] || `Counter ${counterId}`;
        itemsByCounterName[counterName] = items;
      });
      
      const mapped = {
        order_code: serverOtp.code,
        otp_status: serverOtp.status,
        generated_by: serverOtp.generated_by,
        expires_at: serverOtp.expires_at,
        created_at: payload.created_at || serverOtp.created_at,
        student_name: payload.student_name || 'Student',
        total_amount: payload.total_amount || 0,
        subtotal: payload.subtotal || 0,
        tax_amount: payload.tax_amount || 0,
        items_by_counter: itemsByCounterName,  // Now using counter names
        counter_names: counterNames,           // Keep the mapping
        counters_involved: payload.counters_involved || Object.keys(itemsByCounterId),
        counters_delivered: serverOtp.counters_delivered || {},  // Counter IDs that have delivered
        counters_completed: [],  // Will be populated based on counters_delivered
        is_complete: serverOtp.all_items_delivered || false,
      };
      
      // Populate counters_completed from counters_delivered (convert IDs to names)
      if (serverOtp.counters_delivered) {
        const deliveredCounterIds = Object.keys(serverOtp.counters_delivered);
        mapped.counters_completed = deliveredCounterIds.map(id => counterNames[id] || `Counter ${id}`);
      }

      console.log('=== ORDER MAPPED ===');
      console.log('Server OTP:', serverOtp);
      console.log('Mapped order:', mapped);
      console.log('Items by counter:', mapped.items_by_counter);
      console.log('Selected counter items:', mapped.items_by_counter[selectedCounter]);
      console.log('====================');

      // Check if order is already complete
      if (mapped.is_complete) {
        showError('This order has already been completed and cannot be modified');
        return;
      }

      // Determine an effective counter present in the payload
      const availableFromOrder = Object.keys(mapped.items_by_counter || {});
      const effectiveCounter = availableFromOrder.includes(selectedCounter)
        ? selectedCounter
        : (availableFromOrder[0] || selectedCounter);
      if (effectiveCounter !== selectedCounter) {
        setSelectedCounter(effectiveCounter);
      }

      // Check if current counter has items
      const counterItems = mapped.items_by_counter[effectiveCounter];
      if (!counterItems || counterItems.length === 0) {
        showInfo(`No items found for "${effectiveCounter}" counter in this order`);
        setCurrentOrder(mapped);
        return;
      }

      // Check if current counter is already completed
      if (mapped.counters_completed.includes(effectiveCounter)) {
        showInfo(`Items for "${selectedCounter}" counter have already been delivered`);
      }

      setCurrentOrder(mapped);
      setCheckedItems(new Set());
      showSuccess('Order loaded successfully!');
      
      } catch (error) {
      if (error?.status === 401) {
        showError('You are not logged in. Please sign in as staff.');
        // Optional: trigger a redirect if router available
        // window.location.href = '/login';
      } else {
        showError('Error fetching order. Please try again.');
      }
      console.error('Fetch order error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle item check
  const toggleItemCheck = (itemId) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(itemId)) {
      newCheckedItems.delete(itemId);
    } else {
      newCheckedItems.add(itemId);
    }
    setCheckedItems(newCheckedItems);
  };

  // Mark items as delivered using the new counter-based delivery endpoint
  const markAsDelivered = async () => {
    if (!currentOrder) {
      showError('No order loaded');
      return;
    }

    const counterItems = currentOrder.items_by_counter[selectedCounter] || [];
    const undeliveredItems = counterItems.filter(item => !item.delivered);
    
    if (undeliveredItems.length === 0) {
      showInfo('All items for this counter have already been delivered');
      return;
    }

    const uncheckedItems = undeliveredItems.filter(item => !checkedItems.has(item.id));
    if (uncheckedItems.length > 0) {
      showError(`Please check all items before marking as delivered. ${uncheckedItems.length} items still unchecked.`);
      return;
    }

    try {
      setProcessingDelivery(true);
      
      // Get counter ID from the order payload's counter_names mapping
      // This ensures we use the actual database IDs, not hardcoded values
      let counterId = null;
      
      if (currentOrder.counter_names) {
        // Find counter ID by reverse-looking up the name
        const counterIdEntry = Object.entries(currentOrder.counter_names).find(
          ([id, name]) => name === selectedCounter
        );
        if (counterIdEntry) {
          counterId = parseInt(counterIdEntry[0]);
        }
      }
      
      // Fallback to hardcoded mapping if counter_names not available (legacy orders)
      if (!counterId) {
        const counterNameToId = {
          'Veg & Meals': 1,
          'Biriyani & Chinese': 2,
          'Snacks': 3
        };
        counterId = counterNameToId[selectedCounter];
      }
      
      if (!counterId) {
        showError(`Invalid counter selected: ${selectedCounter}. Counter ID not found in order payload.`);
        console.error('Counter mapping issue:', {
          selectedCounter,
          counter_names: currentOrder.counter_names,
          items_by_counter: Object.keys(currentOrder.items_by_counter)
        });
        return;
      }
      
      console.log(`📍 Counter ID resolved: "${selectedCounter}" → ID ${counterId}`);
      
      const deliveredItemIds = Array.from(checkedItems);
      
      // Call the new counter-based delivery endpoint
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/orders/otp/code/${currentOrder.order_code}/deliver/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              counter_id: counterId,
              item_ids: deliveredItemIds
            })
          }
        );
        
        if (response.ok) {
          const result = await response.json();
          
          // Update local order state
          const updated = { ...currentOrder };
          updated.counters_completed = result.counters_delivered || [];
          updated.is_complete = result.all_items_delivered || false;
          updated.otp_status = result.status || updated.otp_status;
          
          // Mark items as delivered in local state
          if (updated.items_by_counter[selectedCounter]) {
            updated.items_by_counter[selectedCounter] = updated.items_by_counter[selectedCounter].map(item => ({
              ...item,
              delivered: deliveredItemIds.includes(item.id) ? true : !!item.delivered
            }));
          }
          
          setCurrentOrder(updated);
          setCheckedItems(new Set());
          
          // Add to recent orders
          setRecentOrders(prev => [
            { 
              orderCode: currentOrder.order_code, 
              studentName: currentOrder.student_name,
              counter: selectedCounter,
              timestamp: new Date(),
              itemCount: deliveredItemIds.length
            },
            ...prev.slice(0, 4)
          ]);
          
          showSuccess(`✅ Items delivered successfully for ${selectedCounter} counter!`);
          
          if (result.all_items_delivered) {
            showSuccess('🎉 Order completed! All items from all counters have been delivered.');
          }
        } else if (response.status === 409) {
          showError('✅ Items already delivered for this counter');
        } else if (response.status === 404) {
          showError('Order code not found');
        } else if (response.status === 410) {
          showError('Order code expired');
        } else if (response.status === 403) {
          const errorData = await response.json();
          showError(errorData.error || 'You can only deliver items from your assigned counter');
        } else {
          const errorData = await response.json();
          showError(errorData.error || 'Failed to mark items as delivered');
        }
      } catch (fetchError) {
        console.error('Network error during delivery:', fetchError);
        showError('Network error. Please check your connection and try again.');
      }
      
    } catch (error) {
      showError('Error processing delivery. Please try again.');
      console.error('Delivery error:', error);
    } finally {
      setProcessingDelivery(false);
    }
  };

  // Handle order code input
  const handleOrderCodeChange = (e) => {
    const value = e.target.value.toUpperCase().slice(0, 6);
    setOrderCode(value);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      fetchOrder();
    }
  };

  // Get counter items
  const getCounterItems = () => {
    if (!currentOrder || !currentOrder.items_by_counter) return [];
    return currentOrder.items_by_counter[selectedCounter] || [];
  };

  // Get delivery status for other counters
  const getOtherCountersStatus = () => {
    if (!currentOrder) return [];
    
    return Object.entries(currentOrder.items_by_counter)
      .filter(([counter]) => counter !== selectedCounter)
      .map(([counter, items]) => ({
        counter,
        totalItems: items.length,
        deliveredItems: items.filter(item => item.delivered).length,
        isCompleted: currentOrder.counters_completed.includes(counter)
      }));
  };

  const counterItems = getCounterItems();
  const otherCountersStatus = getOtherCountersStatus();
  const undeliveredItems = counterItems.filter(item => !item.delivered);
  const allItemsChecked = undeliveredItems.length > 0 && undeliveredItems.every(item => checkedItems.has(item.id));
  const isCounterCompleted = currentOrder?.counters_completed.includes(selectedCounter);

  // Debug logging
  if (currentOrder && counterItems.length > 0) {
    console.log('=== RENDER DEBUG ===');
    console.log('Counter items:', counterItems);
    console.log('Undelivered items:', undeliveredItems);
    console.log('All items checked:', allItemsChecked);
    console.log('Is counter completed:', isCounterCompleted);
    console.log('Checked items:', Array.from(checkedItems));
    console.log('===================');
  }

  return (
    <div className="counter-interface">
      <div className="counter-container">
        {/* Header */}
        <div className="counter-header">
          <div className="header-main">
            <h1>🏪 Counter Interface</h1>
            <p>Manage food item deliveries</p>
          </div>
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={resetForm}
              title="Reset Form"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <polyline points="23 20 23 14 17 14"/>
                <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Reset
            </button>
            <button 
              className="refresh-btn"
              onClick={createTestOrder}
              title="Create Test Order"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              Test Order
            </button>

          </div>
        </div>

        {/* Counter Selection */}
        <div className="counter-selection-section">
          <label htmlFor="counter-select">Select Your Counter:</label>
          <select 
            id="counter-select"
            value={selectedCounter}
            onChange={(e) => setSelectedCounter(e.target.value)}
            className="counter-select"
          >
            {availableCounters.map(counter => (
              <option key={counter} value={counter}>
                {counterEmojis[counter]} {counter}
              </option>
            ))}
          </select>
        </div>

        {/* Order Code Input */}
        <div className="order-input-section">
          <label htmlFor="order-code-input">Enter Order Code:</label>
          <div className="order-input-group">
            <input
              id="order-code-input"
              type="text"
              value={orderCode}
              onChange={handleOrderCodeChange}
              onKeyPress={handleKeyPress}
              placeholder="KB1234"
              className="order-code-input"
              maxLength="6"
              disabled={loading}
            />
            <button 
              className="fetch-btn"
              onClick={fetchOrder}
              disabled={loading || !orderCode.trim()}
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  Loading...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  Get Order
                </>
              )}
            </button>
            
            <button 
              type="button"
              className="sync-btn"
              onClick={async () => {
                console.log('🔄 Manual sync requested');
                showInfo('🔄 Syncing orders from all sources...');
                
                try {
                  // Force refresh from all storage locations
                  const orders = orderService.getAllOrders();
                  const orderCount = Object.keys(orders).length;
                  
                  console.log(`📊 Manual sync found ${orderCount} orders total`);
                  
                  if (orderCount > 0) {
                    showSuccess(`✅ Found ${orderCount} orders! Try searching again.`);
                  } else {
                    showError('❌ No orders found. Create one in Student Portal first.');
                  }
                  
                  // Force component re-render by updating state
                  setCurrentOrder(null);
                  setOrderCode('');
                  setSyncTrigger(prev => prev + 1); // Force debug panel refresh
                  
                } catch (error) {
                  console.error('Sync error:', error);
                  showError('❌ Sync failed - try again');
                }
              }}
              title="Sync orders from all sources"
            >
              🔄 Sync Orders
            </button>
          </div>
          <small className="input-help">
            Format: 2 letters + 4 numbers (e.g., KB1234, MG5678)<br/>
            💡 Click "Sync Orders" if your order not found
          </small>
          
          {/* Debug: Show available order codes for testing */}
          <div className="debug-available-orders">
            <details>
              <summary>🔍 Available Order Codes for Testing</summary>
              <div className="available-codes">
                {(() => {
                  // Force refresh when syncTrigger changes
                  const orders = orderService.getAllOrders();
                  const orderCount = Object.keys(orders).length;
                  
                  return orderCount > 0 ? (
                    Object.entries(orders).map(([code, order]) => (
                    <button 
                      key={code}
                      className="debug-order-button"
                      onClick={() => setOrderCode(code)}
                      title={`${order.student_name} - ₹${order.total_amount}`}
                    >
                      <span className="code">{code}</span>
                      <span className="student">{order.student_name}</span>
                      <span className={`status ${order.otp_status || 'legacy'}`}>
                        {order.otp_status || 'Legacy'}
                      </span>
                    </button>
                    ))
                  ) : (
                    <p className="no-orders">No orders available. Create one in Student Portal first.</p>
                  );
                })()}
              </div>
            </details>
          </div>
        </div>

        {/* Order Details */}
        {currentOrder && (
          <div className="order-details-section">
            <div className="order-info-card">
              <div className="order-info-header">
                <h3>📋 Order Details</h3>
                <span className={`order-status ${currentOrder.is_complete ? 'complete' : 'pending'}`}>
                  {currentOrder.is_complete ? '✅ Complete' : '⏳ Pending'}
                </span>
              </div>
              
              <div className="order-info-content">
                <div className="info-row">
                  <span className="info-label">Order Code (OTP):</span>
                  <span className="info-value order-code">{currentOrder.order_code}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">OTP Status:</span>
                  <span className={`info-value otp-status ${currentOrder.otp_status || 'active'}`}>
                    {currentOrder.otp_status === 'used' ? '🔒 USED (Consumed)' : '🟢 ACTIVE (Valid)'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Student:</span>
                  <span className="info-value">{currentOrder.student_name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Total Amount:</span>
                  <span className="info-value amount">${currentOrder.total_amount.toFixed(2)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Order Time:</span>
                  <span className="info-value">
                    {new Date(currentOrder.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Generated From:</span>
                  <span className="info-value">
                    {currentOrder.generated_by || 'Student Portal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Other Counters Status */}
            {otherCountersStatus.length > 0 && (
              <div className="other-counters-section">
                <h4>📊 Other Counters Status</h4>
                <div className="counters-status-grid">
                  {otherCountersStatus.map(({ counter, totalItems, deliveredItems, isCompleted }) => (
                    <div key={counter} className={`counter-status-card ${isCompleted ? 'completed' : 'pending'}`}>
                      <div className="counter-status-header">
                        <span className="counter-name">
                          {counterEmojis[counter]} {counter}
                        </span>
                        <span className={`status-badge ${isCompleted ? 'completed' : 'pending'}`}>
                          {isCompleted ? '✅' : '⏳'}
                        </span>
                      </div>
                      <div className="counter-progress">
                        <span className="progress-text">
                          {deliveredItems}/{totalItems} delivered
                        </span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${(deliveredItems / totalItems) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Counter Items */}
            <div className="counter-items-section">
              <div className="section-header">
                <h4>
                  {counterEmojis[selectedCounter]} Items for {selectedCounter}
                </h4>
                {isCounterCompleted && (
                  <span className="completed-badge">✅ Delivered</span>
                )}
              </div>

              {counterItems.length === 0 ? (
                <div className="no-items-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p>No items found for this counter</p>
                </div>
              ) : (
                <>
                  <div className="items-list">
                    {counterItems.map(item => (
                      <div 
                        key={item.id} 
                        className={`item-card ${item.delivered ? 'delivered' : ''} ${checkedItems.has(item.id) ? 'checked' : ''}`}
                      >
                        <div className="item-info">
                          <div className="item-main">
                            <h5 className="item-name">🍽️ {item.name}</h5>
                            <span className="item-quantity">Qty: {item.quantity}</span>
                          </div>
                          <div className="item-price">
                            ${((item.unit_price || item.price || item.total_price / item.quantity || 0) * item.quantity).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="item-actions">
                          {item.delivered ? (
                            <span className="delivered-badge">✅ Delivered</span>
                          ) : (
                            <label className="item-checkbox">
                              <input
                                type="checkbox"
                                checked={checkedItems.has(item.id)}
                                onChange={() => toggleItemCheck(item.id)}
                              />
                              <span className="checkbox-custom">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </span>
                              Ready
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {undeliveredItems.length > 0 && (
                    <div className="delivery-actions">
                      <div className="delivery-summary">
                        <span className="items-checked">
                          {checkedItems.size} of {undeliveredItems.length} items checked
                        </span>
                        {!allItemsChecked && (
                          <span className="check-reminder">
                            ⚠️ Check all items before delivery
                          </span>
                        )}
                      </div>
                      
                      <button
                        className={`deliver-btn ${allItemsChecked ? 'ready' : 'disabled'}`}
                        onClick={markAsDelivered}
                        disabled={!allItemsChecked || processingDelivery || isCounterCompleted}
                      >
                        {processingDelivery ? (
                          <>
                            <div className="loading-spinner"></div>
                            Processing...
                          </>
                        ) : isCounterCompleted ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 12l2 2 4-4"/>
                              <circle cx="12" cy="12" r="10"/>
                            </svg>
                            Already Delivered
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 12l2 2 4-4"/>
                              <circle cx="12" cy="12" r="10"/>
                            </svg>
                            Mark as Delivered
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <div className="recent-orders-section">
            <h4>🕐 Recent Deliveries</h4>
            <div className="recent-orders-list">
              {recentOrders.map((order, index) => (
                <div key={index} className="recent-order-item">
                  <div className="recent-order-info">
                    <span className="recent-order-code">{order.orderCode}</span>
                    <span className="recent-student-name">{order.studentName}</span>
                  </div>
                  <div className="recent-order-details">
                    <span className="recent-counter">{counterEmojis[order.counter]} {order.counter}</span>
                    <span className="recent-time">
                      {order.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CounterInterface;