/**
 * Staff Payment Management Component
 * Modern interface for staff to monitor payments and transactions
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastProvider';
import paymentService from '../../services/paymentService';
import './StaffPayments.css';

function StaffPayments() {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  // State Management
  const [paymentStats, setPaymentStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Load payment data
  useEffect(() => {
    loadPaymentData();
  }, [dateFilter, statusFilter]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // Build filters object
      const currentFilters = {
        status: statusFilter,
        search: searchQuery
      };

      // Add date filters
      if (dateFilter === 'today') {
        currentFilters.date_from = new Date().toISOString().split('T')[0];
        currentFilters.date_to = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        currentFilters.date_from = weekAgo.toISOString().split('T')[0];
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        currentFilters.date_from = monthAgo.toISOString().split('T')[0];
      }
      
      // Load payment statistics
      const stats = await paymentService.getPaymentStats();
      setPaymentStats(stats);
      
      // Load recent transactions
      const transactionData = await paymentService.getTransactions(currentFilters);
      setTransactions(transactionData.results || transactionData);
      
      // Load pending payment requests
      const requests = await paymentService.getPaymentRequests();
      setPaymentRequests(requests);
      
    } catch (error) {
      showError('Failed to load payment data');
      console.error('Payment data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // Debounce search to avoid too many API calls
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      loadPaymentData();
    }, 500);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatTransactionType = (type) => {
    const typeMap = {
      'credit': { label: 'Credit', color: 'success', icon: '💰' },
      'debit': { label: 'Debit', color: 'danger', icon: '💸' },
      'refund': { label: 'Refund', color: 'info', icon: '↩️' },
      'fee': { label: 'Fee', color: 'warning', icon: '💳' },
    };
    return typeMap[type] || { label: type, color: 'secondary', icon: '📄' };
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'completed': 'success',
      'pending': 'warning', 
      'processing': 'info',
      'failed': 'danger',
      'cancelled': 'secondary'
    };
    return statusMap[status] || 'secondary';
  };

  if (loading) {
    return (
      <div className="staff-payments-loading">
        <div className="loading-spinner"></div>
        <p>Loading payment data...</p>
      </div>
    );
  }

  return (
    <div className="staff-payments-container">
      {/* Header */}
      <div className="staff-payments-header">
        <div className="header-content">
          <h1 className="page-title">💳 Payment Management</h1>
          <p className="page-subtitle">Monitor transactions and payment activities</p>
        </div>
        
        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-item">
            <span className="stat-value">{paymentStats?.totalTransactionsToday || 0}</span>
            <span className="stat-label">Today's Transactions</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{formatCurrency(paymentStats?.totalAmountToday || 0)}</span>
            <span className="stat-label">Today's Volume</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="payment-stats-grid">
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3 className="stat-number">{paymentStats?.totalTransactionsToday || 0}</h3>
              <p className="stat-description">Transactions Today</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3 className="stat-number">{formatCurrency(paymentStats?.totalAmountToday || 0)}</h3>
              <p className="stat-description">Total Volume</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3 className="stat-number">{paymentStats?.totalWalletsActive || 0}</h3>
              <p className="stat-description">Active Wallets</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <h3 className="stat-number">{paymentStats?.successRate || 0}%</h3>
              <p className="stat-description">Success Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payment Requests */}
      {paymentRequests.length > 0 && (
        <div className="payment-requests-section">
          <h2 className="section-title">🔄 Pending Payment Requests</h2>
          <div className="payment-requests-list">
            {paymentRequests.map((request) => (
              <div key={request.id} className="payment-request-item">
                <div className="request-info">
                  <h4 className="request-user">{request.user_name}</h4>
                  <p className="request-details">
                    {formatCurrency(request.amount)} via {request.payment_method.toUpperCase()}
                  </p>
                  <span className="request-time">
                    {new Date(request.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="request-status">
                  <span className={`status-badge ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="transactions-section">
        <div className="transactions-header">
          <h2 className="section-title">📋 Recent Transactions</h2>
          
          {/* Filters */}
          <div className="transactions-filters">
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search by user or transaction ID..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="transactions-list">
          {transactions.length === 0 ? (
            <div className="no-transactions">
              <div className="no-data-icon">📄</div>
              <h4>No Transactions Found</h4>
              <p>No transactions match your current filters</p>
            </div>
          ) : (
            transactions.map((transaction) => {
                const typeInfo = formatTransactionType(transaction.transaction_type);
                return (
                  <div 
                    key={transaction.id}
                    className="transaction-item"
                    onClick={() => handleTransactionClick(transaction)}
                  >
                    <div className="transaction-icon">
                      {typeInfo.icon}
                    </div>
                    <div className="transaction-details">
                      <h4 className="transaction-user">{transaction.user_name}</h4>
                      <p className="transaction-description">{transaction.description}</p>
                      <span className="transaction-id">ID: {transaction.transaction_id}</span>
                    </div>
                    <div className="transaction-meta">
                      <span className={`transaction-amount ${transaction.transaction_type}`}>
                        {transaction.transaction_type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                      <span className={`transaction-status ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                      <span className="transaction-time">
                        {new Date(transaction.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button 
                className="modal-close"
                onClick={() => setShowTransactionModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="transaction-details-modal">
              <div className="detail-section">
                <h4>Transaction Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Transaction ID</span>
                    <span className="detail-value">{selectedTransaction.transaction_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">User</span>
                    <span className="detail-value">{selectedTransaction.user_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Type</span>
                    <span className="detail-value">
                      {formatTransactionType(selectedTransaction.transaction_type).label}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Amount</span>
                    <span className={`detail-value amount ${selectedTransaction.transaction_type}`}>
                      {formatCurrency(selectedTransaction.amount)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`detail-value status ${getStatusColor(selectedTransaction.status)}`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Payment Method</span>
                    <span className="detail-value">{selectedTransaction.payment_method}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date & Time</span>
                    <span className="detail-value">
                      {new Date(selectedTransaction.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Description</span>
                    <span className="detail-value">{selectedTransaction.description}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffPayments;