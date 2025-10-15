// Shared Order Service for Demo - Works across both portals
const DEBUG_ORDERS = false; // toggle verbose order logs
const API_BASE_URL = 'http://localhost:8000/api/orders';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Token ${token}` })
  };
};

class OrderService {
  constructor() {
    this.storageKey = 'kgbites_orders';
  }

  // Get all orders from ALL possible localStorage keys
  getAllOrders() {
    try {
      let allOrders = {};
      
      // Check ALL possible localStorage keys
      const allKeys = [
        'kgbites_orders',           // Main key
        'kgbites_shared_orders',    // Shared key
        'kgbites_student_orders',   // Student-specific
        'kgbites_staff_orders',     // Staff-specific
        'kgbites_cross_port_orders' // Cross-port key
      ];
      
      allKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const orders = JSON.parse(data);
            allOrders = { ...allOrders, ...orders };
            if (DEBUG_ORDERS) console.log(`📦 Found ${Object.keys(orders).length} orders in ${key}`);
          }
        } catch (e) {
          if (DEBUG_ORDERS) console.log(`❌ Could not read ${key}:`, e.message);
        }
      });
      
      // Also check sessionStorage backup
      try {
        const backupData = sessionStorage.getItem('kgbites_orders_backup');
        if (backupData) {
          const backupOrders = JSON.parse(backupData);
          allOrders = { ...allOrders, ...backupOrders };
          if (DEBUG_ORDERS) console.log(`📦 Found ${Object.keys(backupOrders).length} orders in backup storage`);
        }
      } catch (e) {}
      
      // Filter out expired orders (like expired OTPs in cab system)
      const now = new Date();
      Object.keys(allOrders).forEach(orderCode => {
        const order = allOrders[orderCode];
        if (order.expires_at && new Date(order.expires_at) < now) {
          delete allOrders[orderCode];
        }
      });
      
  const totalOrders = Object.keys(allOrders).length;
  if (DEBUG_ORDERS) console.log(`🎯 TOTAL: ${totalOrders} orders found across ALL storage locations`);
      
      // Update all storage keys with the merged data
      if (totalOrders > 0) {
        allKeys.forEach(key => {
          try {
            localStorage.setItem(key, JSON.stringify(allOrders));
          } catch (e) {}
        });
      }
      
      return allOrders;
    } catch (error) {
      console.error('Error reading orders:', error);
      return {};
    }
  }

  // Removed legacy cross-port sync (postMessage/iframe). Server is source of truth.

  // Save order with DIRECT cross-port localStorage sharing
  saveOrder(orderData) {
    try {
      const orderWithOTP = {
        ...orderData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        otp_status: 'active', // Like cab OTP - active until used
        generated_by: window.location.origin, // Track where it was created
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hour expiry
      };
      
      // Get existing orders
      const orders = this.getAllOrders();
      orders[orderData.order_code] = orderWithOTP;
      
      // Save to ALL possible localStorage keys for maximum compatibility
      const allKeys = [
        'kgbites_orders',           // Main key
        'kgbites_shared_orders',    // Shared key
        'kgbites_student_orders',   // Student-specific
        'kgbites_staff_orders',     // Staff-specific
        'kgbites_cross_port_orders' // Cross-port key
      ];
      
      allKeys.forEach(key => {
        try {
          localStorage.setItem(key, JSON.stringify(orders));
          if (DEBUG_ORDERS) console.log(`✅ Saved to ${key}`);
        } catch (e) {
          if (DEBUG_ORDERS) console.log(`❌ Failed to save to ${key}:`, e.message);
        }
      });
      
      // Also save to sessionStorage as backup
      try {
        sessionStorage.setItem('kgbites_orders_backup', JSON.stringify(orders));
      } catch (e) {}
      
  if (DEBUG_ORDERS) console.log(`🎯 Order ${orderData.order_code} saved to ALL storage keys`);
      
      return true;
    } catch (error) {
      console.error('Error saving order:', error);
      return false;
    }
  }

  // Server: create OTP order from payload
  async createOtpOnServer(payload) {
    const res = await fetch(`${API_BASE_URL}/otp/create/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ payload, generated_by: window.location.origin })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create OTP');
    }
    return res.json();
  }

  // Server: fetch OTP by code (for student-side status sync)
  async fetchOtpByCode(orderCode) {
    const res = await fetch(`${API_BASE_URL}/otp/code/${orderCode}/`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to fetch order by code');
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  // Server: fetch only OTP status (always 200), avoids noisy 4xx for polling
  async fetchOtpStatus(orderCode) {
    try {
      const res = await fetch(`${API_BASE_URL}/otp/code/${orderCode}/status/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      // Endpoint designed to return 200 with a status field; still parse JSON on failure
      const data = await res.json().catch(() => ({}));
      return data; // { status: 'active'|'used'|'expired'|'not_found'|'error', ... }
    } catch (e) {
      return { status: 'error', detail: e?.message };
    }
  }

  // Sync a local order's completion/otp status from server OTP record
  async syncOrderStatusFromServer(orderCode) {
    // Prefer lightweight status endpoint to avoid 4xx noise
    const statusRes = await this.fetchOtpStatus(orderCode);
    const currentAll = this.getAllOrders();
    const current = currentAll[orderCode] || {};
    const updates = {};
    const s = statusRes?.status;

    if (s === 'used') {
      updates.otp_status = 'used';
      updates.is_complete = true;
      // Try to infer counters from local payload
      const countersInvolved = current.counters_involved || Object.keys(current.items_by_counter || {});
      updates.counters_completed = countersInvolved;
      updates.used_at = statusRes.used_at || new Date().toISOString();
      this.updateOrder(orderCode, updates);
    } else if (s === 'expired') {
      updates.otp_status = 'expired';
      // Keep is_complete as-is for UI; do not mark completed
      this.updateOrder(orderCode, updates);
    } else if (s === 'active') {
      // Ensure active is reflected
      updates.otp_status = 'active';
      this.updateOrder(orderCode, updates);
    } else if (s === 'not_found') {
      // No server record: keep local state, no-op
    } else if (s === 'error') {
      // Network/parse err: keep local state
    }

    const all = this.getAllOrders();
    return all[orderCode] || null;
  }

  // Get order by code (like validating OTP in cab system)
  getOrderByCode(orderCode) {
    try {
      const orders = this.getAllOrders();
      const order = orders[orderCode] || null;
      
      // Check if order exists and is still valid (like checking OTP validity)
      if (order) {
        // Handle legacy orders (created before OTP system) - assume they're active
        if (!order.otp_status) {
          console.log(`🔄 Legacy order ${orderCode} found - upgrading to OTP system`);
          order.otp_status = 'active';
          order.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h from now
          order.generated_by = order.generated_by || 'Legacy System';
          // Update the order with new OTP fields
          this.updateOrder(orderCode, order);
        }
        
        // Check if OTP/order is still active
        if (order.otp_status === 'used') {
          if (DEBUG_ORDERS) console.log(`Order ${orderCode} has already been used (OTP consumed)`);
          return null; // Return null for used orders like expired OTPs
        }
        
        // Check if order has expired
        if (order.expires_at && new Date(order.expires_at) < new Date()) {
          console.log(`Order ${orderCode} has expired`);
          return null;
        }
        
        if (DEBUG_ORDERS) console.log(`✅ Order ${orderCode} is valid - OTP Status: ${order.otp_status}`);
      }
      
      return order;
    } catch (error) {
      console.error('Error getting order:', error);
      return null;
    }
  }

  // Mark order as used (like consuming OTP in cab system)
  markOrderAsUsed(orderCode) {
    try {
      const orders = this.getAllOrders();
      if (orders[orderCode] && orders[orderCode].otp_status === 'active') {
        orders[orderCode].otp_status = 'used';
        orders[orderCode].used_at = new Date().toISOString();
        
        // Update both regular and shared storage
        localStorage.setItem(this.storageKey, JSON.stringify(orders));
        const globalKey = 'kgbites_shared_orders';
        localStorage.setItem(globalKey, JSON.stringify(orders));
        
        // Broadcast the change
        if (window.BroadcastChannel) {
          const channel = new BroadcastChannel('kgbites_orders');
          channel.postMessage({
            type: 'ORDER_USED',
            orderCode: orderCode,
            orderData: orders[orderCode]
          });
        }
        
        console.log(`Order ${orderCode} marked as used (OTP consumed)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking order as used:', error);
      return false;
    }
  }

  // Update order (for delivery status)
  updateOrder(orderCode, updates) {
    try {
      const orders = this.getAllOrders();
      if (orders[orderCode]) {
        orders[orderCode] = {
          ...orders[orderCode],
          ...updates,
          updated_at: new Date().toISOString()
        };
        // Write to ALL known keys to avoid stale merges overriding newer status
        const allKeys = [
          'kgbites_orders',
          'kgbites_shared_orders',
          'kgbites_student_orders',
          'kgbites_staff_orders',
          'kgbites_cross_port_orders'
        ];
        allKeys.forEach(key => {
          try { localStorage.setItem(key, JSON.stringify(orders)); } catch {}
        });
        try { sessionStorage.setItem('kgbites_orders_backup', JSON.stringify(orders)); } catch {}
        
        // Broadcast the change
        if (window.BroadcastChannel) {
          const channel = new BroadcastChannel('kgbites_orders');
          channel.postMessage({
            type: 'ORDER_UPDATED',
            orderCode: orderCode,
            orderData: orders[orderCode]
          });
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating order:', error);
      return false;
    }
  }

  // Mark counter as delivered
  markCounterDelivered(orderCode, counterName, deliveredItems) {
    try {
      const order = this.getOrderByCode(orderCode);
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

      return this.updateOrder(orderCode, order);
    } catch (error) {
      console.error('Error marking counter delivered:', error);
      return false;
    }
  }

  // Generate unique 6-digit order code
  generateOrderCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let code;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      // Generate 2 random letters + 4 random numbers
      const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
      const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));
      const num1 = numbers.charAt(Math.floor(Math.random() * numbers.length));
      const num2 = numbers.charAt(Math.floor(Math.random() * numbers.length));
      const num3 = numbers.charAt(Math.floor(Math.random() * numbers.length));
      const num4 = numbers.charAt(Math.floor(Math.random() * numbers.length));
      
      code = letter1 + letter2 + num1 + num2 + num3 + num4;
      attempts++;
      
      // Safety check to prevent infinite loop
      if (attempts >= maxAttempts) {
        code = 'OR' + Date.now().toString().slice(-4);
        break;
      }
    } while (this.getOrderByCode(code)); // Ensure code is unique
    
    return code;
  }

  // Create order from cart data
  createOrderFromCart(cartItems, userInfo) {
    try {
      const orderCode = this.generateOrderCode();
      
      // Group items by counter
      const itemsByCounter = {};
      let subtotal = 0;
      
      cartItems.forEach(item => {
        // Get counter name from different possible fields
        const counter = item.counter_name || item.counter || item.counter_id || 'General';
        if (!itemsByCounter[counter]) {
          itemsByCounter[counter] = [];
        }
        
        const price = parseFloat(item.price || 0);
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;
        
        itemsByCounter[counter].push({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: price,
          total_price: itemTotal,
          delivered: false
        });
      });
      
      // Calculate tax (10% for demo)
      const taxAmount = Math.round(subtotal * 0.10 * 100) / 100;
      const totalAmount = subtotal + taxAmount;
      
      const orderData = {
        order_code: orderCode,
        student_name: userInfo.name || 'Student',
        student_id: userInfo.student_id || 'Unknown',
        student_email: userInfo.email || '',
        total_amount: totalAmount,
        subtotal: subtotal,
        tax_amount: taxAmount,
        status: 'confirmed',
        created_at: new Date().toISOString(),
        items_by_counter: itemsByCounter,
        counters_involved: Object.keys(itemsByCounter),
        counters_completed: [],
        is_complete: false
      };
      
      // Save the order
      const saved = this.saveOrder(orderData);
      if (saved) {
        console.log('=== ORDER CREATED IN STUDENT PORTAL ===');
        console.log('Order code:', orderCode);
        console.log('Storage key:', this.storageKey);
        console.log('Current localStorage content:', localStorage.getItem(this.storageKey));
        console.log('All orders after save:', this.getAllOrders());
        console.log('Port/Domain:', window.location.origin);
        return { success: true, orderCode, orderData };
      } else {
        console.error('Failed to save order to localStorage');
        return { success: false, error: 'Failed to save order' };
      }
      
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear all orders (for testing)
  clearAllOrders() {
    localStorage.removeItem(this.storageKey);
  }

  // Removed legacy BroadcastChannel/cross-port listeners. No-ops retained for API stability.
  setupBroadcastListener() { return null; }

  setupCrossPortListener() { /* deprecated */ }

  broadcastToOtherPort() { /* deprecated */ }
}

// Export singleton instance
const orderService = new OrderService();

export default orderService;