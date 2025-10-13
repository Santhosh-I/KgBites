import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/ToastProvider';
import OrderManagement from './dashboard/OrderManagement';
import ItemManagement from './dashboard/ItemManagement';
import Analytics from './dashboard/Analytics';
import './StaffDashboard.css';

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [activeTab, setActiveTab] = useState('items');
  const [dashboardData, setDashboardData] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeItems: 0,
    lowStockItems: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/staff/dashboard/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        showError('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showError('Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    showSuccess('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="staff-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Staff Dashboard</h1>
          <p>Welcome back, {user?.full_name || user?.username}!</p>
        </div>
        
        <div className="header-right">
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-number">{dashboardData.totalOrders}</div>
              <div className="stat-label">Today's Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">₹{dashboardData.totalRevenue}</div>
              <div className="stat-label">Revenue</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{dashboardData.activeItems}</div>
              <div className="stat-label">Active Items</div>
            </div>
            <div className="stat-card low-stock">
              <div className="stat-number">{dashboardData.lowStockItems}</div>
              <div className="stat-label">Low Stock</div>
            </div>
          </div>
          
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <span>🍽️</span>
          Item Management
        </button>
        <button 
          className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span>📋</span>
          Order Management
        </button>
        <button 
          className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span>📊</span>
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'items' && <ItemManagement onDataUpdate={fetchDashboardData} />}
        {activeTab === 'orders' && <OrderManagement onDataUpdate={fetchDashboardData} />}
        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
};

export default StaffDashboard;