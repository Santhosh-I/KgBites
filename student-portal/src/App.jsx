import React from 'react'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { ToastProvider } from './components/common/ToastProvider'
import './App.css'

// App loading styles
const appLoadingStyles = `
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.app-loading .loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  if (!document.querySelector('#app-loading-styles')) {
    const style = document.createElement('style');
    style.id = 'app-loading-styles';
    style.textContent = appLoadingStyles;
    document.head.appendChild(style);
  }
}

// Main App Content Component
const AppContent = () => {
  const { isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <CartProvider>
      {isAuthenticated ? (
        <Dashboard onLogout={logout} />
      ) : (
        <Login />
      )}
    </CartProvider>
  );
};

function App() {
  return (
    <div className="App">
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </div>
  )
}

export default App
