import React, { useState, useEffect } from 'react';
import { useToast } from '../common/ToastProvider';
import './Analytics.css';

const Analytics = () => {
  const { showError } = useToast();
  const [analytics, setAnalytics] = useState({
    todayStats: {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topSellingItems: [],
      dailyRevenue: []
    },
    weekStats: {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topSellingItems: [],
      dailyRevenue: []
    },
    monthStats: {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topSellingItems: [],
      dailyRevenue: []
    },
    itemStats: {
      mostPopular: [],
      leastPopular: [],
      outOfStock: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/analytics/?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        showError('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showError('Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const value = amount || 0;
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  const getProgressBarWidth = (current, total) => {
    return total > 0 ? (current / total) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  const currentStats = analytics[selectedPeriod] || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    topSellingItems: [],
    dailyRevenue: []
  };

  return (
    <div className="analytics">
      {/* Period Selection */}
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <select
          id="analytics-period"
          name="selected_period"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="period-select"
          autoComplete="off"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card revenue">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>Total Revenue</h3>
            <p className="metric-value">{formatCurrency(currentStats.totalRevenue)}</p>
            <span className="metric-label">{selectedPeriod === 'today' ? 'Today' : `This ${selectedPeriod}`}</span>
          </div>
        </div>

        <div className="metric-card orders">
          <div className="metric-icon">📋</div>
          <div className="metric-content">
            <h3>Total Orders</h3>
            <p className="metric-value">{currentStats.totalOrders}</p>
            <span className="metric-label">{selectedPeriod === 'today' ? 'Today' : `This ${selectedPeriod}`}</span>
          </div>
        </div>

        <div className="metric-card average">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>Average Order Value</h3>
            <p className="metric-value">{formatCurrency(currentStats.averageOrderValue)}</p>
            <span className="metric-label">Per order</span>
          </div>
        </div>

        <div className="metric-card items">
          <div className="metric-icon">🍽️</div>
          <div className="metric-content">
            <h3>Items Sold</h3>
            <p className="metric-value">
              {(currentStats.topSellingItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0)}
            </p>
            <span className="metric-label">Total quantity</span>
          </div>
        </div>
      </div>

      {/* Charts and Lists */}
      <div className="analytics-content">
        {/* Top Selling Items */}
        <div className="analytics-section">
          <h3>Top Selling Items</h3>
          <div className="top-items-list">
            {(currentStats.topSellingItems || []).length > 0 ? (
              (currentStats.topSellingItems || []).slice(0, 5).map((item, index) => (
                <div key={item.id} className="top-item">
                  <div className="item-rank">#{index + 1}</div>
                  <div className="item-details">
                    <h4>{item.name}</h4>
                    <p>{item.quantity || 0} sold • {formatCurrency(item.revenue)} revenue</p>
                  </div>
                  <div className="item-progress">
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${getProgressBarWidth(item.quantity || 0, (currentStats.topSellingItems || [])[0]?.quantity || 1)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">
                <span>📊</span>
                <p>No sales data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue Chart (Simple Bar Representation) */}
        {selectedPeriod === 'week' && (analytics.weekStats?.dailyRevenue || []).length > 0 && (
          <div className="analytics-section">
            <h3>Daily Revenue (This Week)</h3>
            <div className="revenue-chart">
              {(analytics.weekStats?.dailyRevenue || []).map((day, index) => (
                <div key={index} className="chart-bar">
                  <div 
                    className="bar"
                    style={{ 
                      height: `${getProgressBarWidth(day.revenue || 0, Math.max(...(analytics.weekStats?.dailyRevenue || []).map(d => d.revenue || 0), 1))}%` 
                    }}
                  ></div>
                  <span className="bar-label">{day.day}</span>
                  <span className="bar-value">{formatCurrency(day.revenue || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Item Performance */}
        <div className="analytics-section">
          <h3>Item Performance</h3>
          <div className="performance-grid">
            <div className="performance-card popular">
              <h4>🔥 Most Popular</h4>
              <div className="item-list">
                {(analytics.itemStats?.mostPopular || []).slice(0, 3).map(item => (
                  <div key={item.id} className="perf-item">
                    <span className="item-name">{item.name}</span>
                    <span className="item-metric">{item.orders || 0} orders</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="performance-card slow">
              <h4>📉 Slow Moving</h4>
              <div className="item-list">
                {(analytics.itemStats?.leastPopular || []).slice(0, 3).map(item => (
                  <div key={item.id} className="perf-item">
                    <span className="item-name">{item.name}</span>
                    <span className="item-metric">{item.orders || 0} orders</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="performance-card stock">
              <h4>⚠️ Low/Out of Stock</h4>
              <div className="item-list">
                {(analytics.itemStats?.outOfStock || []).slice(0, 3).map(item => (
                  <div key={item.id} className="perf-item">
                    <span className="item-name">{item.name}</span>
                    <span className="item-metric">{item.stock || 0} left</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;