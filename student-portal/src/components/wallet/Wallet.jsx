/**
 * Modern Wallet Component
 * Swiggy/Zomato-inspired design with comprehensive functionality
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastProvider';
import walletService from '../../services/walletService';
import './Wallet.css';

function Wallet() {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  // State Management
  const [walletData, setWalletData] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(false);

  // Modal States
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Form States
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Filters
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [dateRange, setDateRange] = useState('month');

  // Load initial data
  useEffect(() => {
    loadWalletData();
    loadPaymentMethods();
  }, []);

  // Load transactions when filters change
  useEffect(() => {
    if (walletData) {
      loadTransactions();
    }
  }, [transactionFilter, dateRange, walletData]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletInfo, summary] = await Promise.all([
        walletService.getWalletInfo(),
        walletService.getPaymentSummary()
      ]);
      
      setWalletData(walletInfo);
      setPaymentSummary(summary);
    } catch (error) {
      showError('Failed to load wallet data');
      console.error('Wallet data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await walletService.getPaymentMethods();
      // Handle different response structures (array directly or paginated response)
      const methods = Array.isArray(response) ? response : (response.results || response.data || []);
      const filteredMethods = methods.filter(method => method.payment_type !== 'wallet');
      console.log('Loaded payment methods:', filteredMethods);
      setPaymentMethods(filteredMethods);
    } catch (error) {
      console.error('Payment methods error:', error);
      setPaymentMethods([]); // Set empty array as fallback
    }
  };

  const loadTransactions = async () => {
    try {
      setTransactionLoading(true);
      
      const filters = {};
      
      if (transactionFilter !== 'all') {
        filters.type = transactionFilter;
      }
      
      const dateRangeOptions = walletService.getDateRangeOptions();
      if (dateRange !== 'all' && dateRangeOptions[dateRange]) {
        filters.start_date = dateRangeOptions[dateRange].start_date;
        filters.end_date = dateRangeOptions[dateRange].end_date;
      }

      const response = await walletService.getTransactions(filters);
      setTransactions(response.results || []);
    } catch (error) {
      showError('Failed to load transactions');
      console.error('Transactions error:', error);
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    
    const validation = walletService.validateAmount(topUpAmount);
    if (!validation.valid) {
      showError(validation.message);
      return;
    }

    if (!selectedPaymentMethod) {
      showError('Please select a payment method');
      return;
    }

    try {
      setTopUpLoading(true);
      
      console.log('Top-up request:', {
        amount: topUpAmount,
        paymentMethodId: selectedPaymentMethod,
        paymentMethods: paymentMethods
      });
      
      // Create top-up request
      const topUpRequest = await walletService.createTopUpRequest(
        topUpAmount,
        selectedPaymentMethod
      );

      // For demo purposes, simulate successful payment
      await walletService.simulatePaymentSuccess(topUpRequest.payment_request.request_id);
      
      showSuccess(`Wallet topped up with ₹${topUpAmount}`);
      setShowTopUpModal(false);
      setTopUpAmount('');
      setSelectedPaymentMethod('');
      
      // Reload wallet data
      loadWalletData();
      
    } catch (error) {
      showError(error.message || 'Failed to top up wallet');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  if (loading) {
    return (
      <div className="wallet-loading">
        <div className="loading-spinner"></div>
        <p>Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="wallet-container">
      {/* Header */}
      <div className="wallet-header">
        <div className="wallet-header-content">
          <h1 className="wallet-title">💳 My Wallet</h1>
          <p className="wallet-subtitle">Manage your payments and transactions</p>
        </div>
        <button 
          className="wallet-topup-btn"
          onClick={() => setShowTopUpModal(true)}
        >
          <span className="btn-icon">+</span>
          Add Money
        </button>
      </div>

      {/* Balance Cards */}
      <div className="wallet-balance-section">
        <div className="balance-main-card">
          <div className="balance-content">
            <div className="balance-icon">💰</div>
            <div className="balance-info">
              <h3 className="balance-label">Available Balance</h3>
              <h2 className="balance-amount">
                {walletService.formatCurrency(walletData?.balance || 0)}
              </h2>
              <p className="balance-status">
                Status: <span className={`status ${walletData?.status}`}>
                  {walletData?.status || 'Active'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="balance-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h4 className="stat-value">
                {walletService.formatCurrency(paymentSummary?.total_spent_today || 0)}
              </h4>
              <p className="stat-label">Spent Today</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h4 className="stat-value">
                {walletService.formatCurrency(paymentSummary?.total_spent_month || 0)}
              </h4>
              <p className="stat-label">This Month</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🧾</div>
            <div className="stat-content">
              <h4 className="stat-value">{paymentSummary?.total_transactions || 0}</h4>
              <p className="stat-label">Total Transactions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="wallet-quick-actions">
        <h3 className="section-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          <button 
            className="quick-action-btn"
            onClick={() => setShowTopUpModal(true)}
          >
            <span className="action-icon">💳</span>
            <span>Add Money</span>
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => setTransactionFilter('credit')}
          >
            <span className="action-icon">📥</span>
            <span>Credits</span>
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => setTransactionFilter('debit')}
          >
            <span className="action-icon">📤</span>
            <span>Debits</span>
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => setDateRange('today')}
          >
            <span className="action-icon">📅</span>
            <span>Today</span>
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="wallet-transactions-section">
        <div className="transactions-header">
          <h3 className="section-title">Transaction History</h3>
          
          {/* Filters */}
          <div className="transactions-filters">
            <select 
              value={transactionFilter}
              onChange={(e) => setTransactionFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Transactions</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
              <option value="refund">Refunds</option>
            </select>
            
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">Last 3 Months</option>
            </select>
          </div>
        </div>

        {/* Transaction List */}
        <div className="transactions-list">
          {transactionLoading ? (
            <div className="transactions-loading">
              <div className="loading-spinner"></div>
              <p>Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="no-transactions">
              <div className="no-transactions-icon">📄</div>
              <h4>No Transactions Found</h4>
              <p>No transactions match your current filters</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="transaction-item"
                onClick={() => handleTransactionClick(transaction)}
              >
                <div className="transaction-icon">
                  {walletService.formatTransactionType(transaction.transaction_type).icon}
                </div>
                <div className="transaction-content">
                  <h4 className="transaction-description">{transaction.description}</h4>
                  <p className="transaction-meta">
                    {new Date(transaction.created_at).toLocaleDateString()} • 
                    {transaction.payment_method_name || 'System'}
                  </p>
                </div>
                <div className="transaction-amount">
                  <span className={`amount ${transaction.transaction_type}`}>
                    {transaction.formatted_amount}
                  </span>
                  <span className="transaction-status">
                    {transaction.status_display}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top-up Modal */}
      {showTopUpModal && (
        <div className="modal-overlay" onClick={() => setShowTopUpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💳 Add Money to Wallet</h3>
              <button 
                className="modal-close"
                onClick={() => setShowTopUpModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="topup-form">
              <div className="form-group">
                <label htmlFor="topup-amount">Amount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">₹</span>
                  <input
                    id="topup-amount"
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    max="50000"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Select Payment Method</label>
                <div className="payment-methods-grid">
                  {paymentMethods.map((method) => (
                    <label 
                      key={method.id}
                      className={`payment-method-option ${
                        selectedPaymentMethod === method.id ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={selectedPaymentMethod === method.id}
                        onChange={(e) => setSelectedPaymentMethod(parseInt(e.target.value))}
                      />
                      <div className="method-content">
                        <span className="method-icon">
                          {walletService.getPaymentMethodIcon(method.payment_type)}
                        </span>
                        <span className="method-name">{method.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowTopUpModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  disabled={topUpLoading}
                >
                  {topUpLoading ? 'Processing...' : 'Add Money'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

            <div className="transaction-details">
              <div className="detail-row">
                <span className="detail-label">Transaction ID</span>
                <span className="detail-value">{selectedTransaction.transaction_id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type</span>
                <span className="detail-value">
                  {selectedTransaction.transaction_type_display}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount</span>
                <span className={`detail-value amount ${selectedTransaction.transaction_type}`}>
                  {selectedTransaction.formatted_amount}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">{selectedTransaction.status_display}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date</span>
                <span className="detail-value">
                  {new Date(selectedTransaction.created_at).toLocaleString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Description</span>
                <span className="detail-value">{selectedTransaction.description}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wallet;