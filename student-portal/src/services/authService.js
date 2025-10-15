// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Helper function to clear invalid auth data
const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Token ${token}` })
  };
};

// Auth API calls
export const authAPI = {
  // Student registration
  registerStudent: async (userData) => {
    // Clear any existing auth data before registration
    clearAuthData();
    
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/auth/student/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: {
            username: userData.email, // Using email as username
            email: userData.email,
            password: userData.password,
            confirm_password: userData.confirmPassword
          },
          full_name: userData.name,
          roll_number: userData.rollNumber
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
      }
      
      return await response.json();
    } catch (error) {
      console.error('Registration failed:', error);
      throw new Error('Network error during registration. Please check your connection and try again.');
    }
  },

  // User login (works for both students and staff)
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: credentials.username || credentials.email,
          password: credentials.password
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
      }
      
      return await response.json();
    } catch (error) {
      console.error('Login failed:', error);
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please check if the backend is running on http://127.0.0.1:8000');
      }
      throw error;
    }
  },

  // User logout
  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/accounts/auth/logout/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }
    
    return response.json();
  },

  // Get user profile
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/accounts/auth/profile/`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }
    
    return response.json();
  }
};

// Local storage helpers
export const tokenService = {
  setToken: (token) => {
    localStorage.setItem('authToken', token);
  },
  
  getToken: () => {
    return localStorage.getItem('authToken');
  },
  
  removeToken: () => {
    localStorage.removeItem('authToken');
  },
  
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  removeUser: () => {
    localStorage.removeItem('user');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
  
  clearAll: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
};