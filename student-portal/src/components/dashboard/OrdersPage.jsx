import { useState, useEffect } from 'react';
import { useToast } from '../common/ToastProvider';
import orderService from '../../services/orderService';
import './OrdersPage.css';

function OrdersPage() {
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Load orders on component mount and then sync their status from server
  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (orders.length === 0) return;
    let cancelled = false;
    let intervalId = null;

    const syncAll = async () => {
      try {
        // Only sync orders that are not yet complete to avoid unnecessary 409s
        const toSync = orders.filter(o => !o.is_complete && o.otp_status !== 'used');
        if (toSync.length === 0) {
          // Nothing to sync; stop polling if running
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
        const mapByCode = orders.reduce((acc, o) => { acc[o.order_code] = o; return acc; }, {});
        const results = await Promise.all(
          toSync.map(async (o) => {
            try {
              const synced = await orderService.syncOrderStatusFromServer(o.order_code);
              return synced || o;
            } catch {
              return o;
            }
          })
        );
        // Merge results back into the full list
        results.forEach(updated => { if (updated) mapByCode[updated.order_code] = updated; });
        const merged = Object.values(mapByCode).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (!cancelled) setOrders(merged);
      } catch (e) {
        // ignore silently
      }
    };

    // initial sync
    syncAll();
    // periodic sync every 8s for quicker feedback, but only while there are pending orders
    intervalId = setInterval(syncAll, 8000);
    return () => { cancelled = true; if (intervalId) clearInterval(intervalId); };
  }, [orders]);

  const loadOrders = () => {
    try {
      setLoading(true);
      const allOrders = orderService.getAllOrders();
      const ordersList = Object.values(allOrders).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(ordersList);
    } catch (error) {
      showError('Failed to load orders');
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Copy order code to clipboard
  const copyOrderCode = async (orderCode) => {
    try {
      await navigator.clipboard.writeText(orderCode);
      showSuccess('Order code copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = orderCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess('Order code copied to clipboard!');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get order status badge
  const getStatusBadge = (order) => {
    if (order.is_complete) {
      return <span className="status-badge complete">Completed</span>;
    } else if (order.counters_completed && order.counters_completed.length > 0) {
      return <span className="status-badge partial">In Progress</span>;
    } else {
      return <span className="status-badge pending">Pending</span>;
    }
  };

  // Get progress percentage
  const getProgress = (order) => {
    if (!order.counters_involved || order.counters_involved.length === 0) return 0;
    const completed = order.counters_completed ? order.counters_completed.length : 0;
    return Math.round((completed / order.counters_involved.length) * 100);
  };

  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-loading">
          <div className="loading-spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="orders-page">
        <div className="orders-header">
          <h2>Your Orders</h2>
          <p>Keep track of all your food orders here</p>
        </div>
        <div className="no-orders">
          <div className="no-orders-icon">📋</div>
          <h3>No Orders Yet</h3>
          <p>Start by adding items to your cart and placing your first order!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h2>Your Orders</h2>
        <p>Track your food orders and their preparation status</p>
      </div>

      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.order_code} className="order-card">
            <div className="order-header">
              <div className="order-info">
                <h3 className="order-code" onClick={() => copyOrderCode(order.order_code)}>
                  #{order.order_code}
                  <span className="copy-hint">Click to copy</span>
                </h3>
                <p className="order-date">{formatDate(order.created_at)}</p>
              </div>
              <div className="order-status">
                {getStatusBadge(order)}
                <div className="order-total">₹{order.total_amount.toFixed(2)}</div>
              </div>
            </div>

            <div className="order-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${getProgress(order)}%` }}
                ></div>
              </div>
              <span className="progress-text">{getProgress(order)}% Complete</span>
            </div>

            <div className="order-counters">
              <h4>Preparation Status by Counter:</h4>
              {Object.entries(order.items_by_counter || {}).map(([counterName, items]) => {
                const isCompleted = order.counters_completed && 
                  order.counters_completed.includes(counterName);
                
                return (
                  <div key={counterName} className={`counter-status ${isCompleted ? 'completed' : 'pending'}`}>
                    <div className="counter-name">
                      <span className={`counter-icon ${isCompleted ? 'check' : 'clock'}`}>
                        {isCompleted ? '✓' : '⏱'}
                      </span>
                      {counterName}
                    </div>
                    <div className="counter-items">
                      {items.map((item, index) => (
                        <span key={index} className="item-tag">
                          {item.quantity}x {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="order-actions">
              <button 
                className="btn-secondary"
                onClick={() => setSelectedOrder(selectedOrder === order.order_code ? null : order.order_code)}
              >
                {selectedOrder === order.order_code ? 'Hide Details' : 'View Details'}
              </button>
              <button 
                className="btn-primary"
                onClick={() => copyOrderCode(order.order_code)}
              >
                Copy Order Code
              </button>
            </div>

            {selectedOrder === order.order_code && (
              <div className="order-details">
                <h4>Order Summary:</h4>
                <div className="order-breakdown">
                  <div className="breakdown-row">
                    <span>Subtotal:</span>
                    <span>₹{order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Tax:</span>
                    <span>₹{order.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="breakdown-row total">
                    <span>Total:</span>
                    <span>₹{order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="student-info">
                  <h5>Order Details:</h5>
                  <p><strong>Student:</strong> {order.student_name}</p>
                  <p><strong>ID:</strong> {order.student_id}</p>
                  {order.student_email && <p><strong>Email:</strong> {order.student_email}</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrdersPage;