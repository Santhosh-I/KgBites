import React, { useState, useEffect } from 'react';
import { useToast } from '../common/ToastProvider';
import './OrderManagement.css';

const OrderManagement = ({ onDataUpdate }) => {
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateFilter]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter !== 'all') params.append('date', dateFilter);

      const response = await fetch(`http://localhost:8000/api/orders/?${params}`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        showError('Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      showError('Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(orders.map(order => order.id === orderId ? updatedOrder : order));
        showSuccess(`Order ${newStatus} successfully`);
        onDataUpdate();
      } else {
        showError('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      showError('Error updating order');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#fdcb6e',
      'confirmed': '#0984e3',
      'preparing': '#00b894',
      'ready': '#00cec9',
      'completed': '#00b894',
      'cancelled': '#e17055'
    };
    return colors[status] || '#74b9ff';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'pending': '⏳',
      'confirmed': '✅',
      'preparing': '👨‍🍳',
      'ready': '🔔',
      'completed': '✅',
      'cancelled': '❌'
    };
    return icons[status] || '📋';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="order-management">
      {/* Header Controls */}
      <div className="order-header">
        <div className="filter-controls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-filter"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="all">All Time</option>
          </select>
          
          <button className="refresh-btn" onClick={fetchOrders}>
            🔄 Refresh
          </button>
        </div>
        
        <div className="order-stats">
          <div className="stat-item">
            <span className="stat-number">{orders.length}</span>
            <span className="stat-label">Total Orders</span>
          </div>
          <div className="stat-item pending">
            <span className="stat-number">
              {orders.filter(o => o.status === 'pending').length}
            </span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-item preparing">
            <span className="stat-number">
              {orders.filter(o => o.status === 'preparing').length}
            </span>
            <span className="stat-label">Preparing</span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-container">
        {orders.length === 0 ? (
          <div className="no-orders">
            <span>📋</span>
            <p>No orders found for the selected criteria</p>
          </div>
        ) : (
          <div className="orders-grid">
            {orders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-header-card">
                  <div className="order-info">
                    <h3 className="order-id">Order #{order.id}</h3>
                    <p className="order-customer">{order.customer_name}</p>
                    <p className="order-time">{formatTime(order.created_at)}</p>
                  </div>
                  <div 
                    className="order-status"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    <span className="status-icon">{getStatusIcon(order.status)}</span>
                    <span className="status-text">{order.status.toUpperCase()}</span>
                  </div>
                </div>
                
                <div className="order-items">
                  <h4>Items:</h4>
                  <div className="items-list">
                    {order.items.map(item => (
                      <div key={item.id} className="order-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-quantity">x{item.quantity}</span>
                        <span className="item-price">₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="order-footer">
                  <div className="order-total">
                    <strong>Total: ₹{order.total_amount}</strong>
                  </div>
                  
                  <div className="order-actions">
                    {order.status === 'pending' && (
                      <>
                        <button
                          className="action-btn confirm"
                          onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        >
                          ✅ Confirm
                        </button>
                        <button
                          className="action-btn cancel"
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        >
                          ❌ Cancel
                        </button>
                      </>
                    )}
                    
                    {order.status === 'confirmed' && (
                      <button
                        className="action-btn prepare"
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                      >
                        👨‍🍳 Start Preparing
                      </button>
                    )}
                    
                    {order.status === 'preparing' && (
                      <button
                        className="action-btn ready"
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                      >
                        🔔 Mark Ready
                      </button>
                    )}
                    
                    {order.status === 'ready' && (
                      <button
                        className="action-btn complete"
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                      >
                        ✅ Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;