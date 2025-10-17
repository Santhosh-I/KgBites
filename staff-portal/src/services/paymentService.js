// API Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Token ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || 'Request failed');
  }
  return response.json();
};

class PaymentService {
  // Get payment statistics for staff dashboard
  async getPaymentStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/staff/stats/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      throw error;
    }
  }

  // Get all transactions for staff monitoring
  async getTransactions(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.type && filters.type !== 'all') {
        params.append('transaction_type', filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.date_from) {
        params.append('date_from', filters.date_from);
      }
      if (filters.date_to) {
        params.append('date_to', filters.date_to);
      }

      const url = `${API_BASE_URL}/payments/staff/transactions/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // Get pending payment requests
  async getPaymentRequests() {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/staff/requests/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      throw error;
    }
  }

  // Get transaction details
  async getTransactionDetails(transactionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/transactions/${transactionId}/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      throw error;
    }
  }

  // Process refund (staff action)
  async processRefund(transactionId, reason) {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/staff/refund/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          transaction_id: transactionId,
          reason
        }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }
}

export default new PaymentService();