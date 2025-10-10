// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api';

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
  // Staff registration
  registerStaff: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/accounts/auth/staff/register/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        user: {
          username: userData.staffId,
          email: userData.email,
          password: userData.password,
          confirm_password: userData.confirmPassword
        },
        full_name: userData.fullName,
        gender: userData.gender,
        id_number: userData.staffId
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }
    
    return response.json();
  },

  // Staff login
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/accounts/auth/login/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        username: credentials.staffId,
        password: credentials.password
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }
    
    return response.json();
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
  }
};