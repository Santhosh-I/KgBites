/**
 * Wallet Service Module
 * Handles all wallet-related API operations with modern async/await patterns
 */

import { tokenService } from './authService';

const BASE_URL = 'http://127.0.0.1:8000/api/payments';

class WalletService {
  /**
   * Get authorization headers
   */
  getHeaders() {
    const token = tokenService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
    };
  }

  /**
   * Handle API response with proper error handling
   */
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Network error occurred',
        detail: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(errorData.error || errorData.detail || 'Something went wrong');
    }
    return response.json();
  }

  /**
   * Get wallet information
   */
  async getWalletInfo() {
    try {
      const response = await fetch(`${BASE_URL}/wallet/`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      throw error;
    }
  }

  /**
   * Get payment summary dashboard
   */
  async getPaymentSummary() {
    try {
      const response = await fetch(`${BASE_URL}/summary/`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      throw error;
    }
  }

  /**
   * Get transaction history with pagination and filters
   */
  async getTransactions(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const url = `${BASE_URL}/transactions/?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Get available payment methods
   */
  async getPaymentMethods() {
    try {
      const response = await fetch(`${BASE_URL}/methods/`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  /**
   * Create wallet top-up request
   */
  async createTopUpRequest(amount, paymentMethodId) {
    try {
      const response = await fetch(`${BASE_URL}/wallet/topup/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          amount: parseFloat(amount).toFixed(2),
          payment_method_id: paymentMethodId,
        }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating top-up request:', error);
      throw error;
    }
  }

  /**
   * Simulate payment success (for demo/testing)
   */
  async simulatePaymentSuccess(requestId) {
    try {
      const response = await fetch(`${BASE_URL}/wallet/topup/${requestId}/success/`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error simulating payment:', error);
      throw error;
    }
  }

  /**
   * Process order payment
   */
  async processOrderPayment(orderId) {
    try {
      const response = await fetch(`${BASE_URL}/orders/${orderId}/pay/`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error processing order payment:', error);
      throw error;
    }
  }

  /**
   * Request refund for transaction
   */
  async requestRefund(transactionId, reason, amount = null) {
    try {
      const requestData = {
        transaction_id: transactionId,
        reason: reason,
      };
      
      if (amount !== null) {
        requestData.amount = parseFloat(amount).toFixed(2);
      }

      const response = await fetch(`${BASE_URL}/refund/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error requesting refund:', error);
      throw error;
    }
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format transaction type for display
   */
  formatTransactionType(type) {
    const typeMap = {
      'credit': { label: 'Credit', color: 'success', icon: '💰' },
      'debit': { label: 'Debit', color: 'danger', icon: '💸' },
      'refund': { label: 'Refund', color: 'info', icon: '↩️' },
      'fee': { label: 'Fee', color: 'warning', icon: '💳' },
      'bonus': { label: 'Bonus', color: 'success', icon: '🎁' },
      'penalty': { label: 'Penalty', color: 'danger', icon: '⚠️' },
    };
    
    return typeMap[type] || { label: type, color: 'secondary', icon: '📄' };
  }

  /**
   * Get payment method icon
   */
  getPaymentMethodIcon(paymentType) {
    const iconMap = {
      'wallet': '💳',
      'upi': '📱',
      'card': '💳',
      'net_banking': '🏦',
      'cash': '💵',
      'campus_card': '🎓',
    };
    
    return iconMap[paymentType] || '💳';
  }

  /**
   * Validate amount input
   */
  validateAmount(amount, min = 1, max = 50000) {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return { valid: false, message: 'Please enter a valid amount' };
    }
    
    if (numAmount < min) {
      return { valid: false, message: `Minimum amount is ₹${min}` };
    }
    
    if (numAmount > max) {
      return { valid: false, message: `Maximum amount is ₹${max}` };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Get transaction date range options
   */
  getDateRangeOptions() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return {
      today: {
        label: 'Today',
        start_date: today.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      },
      week: {
        label: 'This Week',
        start_date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      },
      month: {
        label: 'This Month',
        start_date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      },
      quarter: {
        label: 'Last 3 Months',
        start_date: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      },
    };
  }
}

// Export singleton instance
const walletService = new WalletService();
export default walletService;