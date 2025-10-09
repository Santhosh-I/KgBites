import { useState } from 'react';
import './StaffLogin.css';

function StaffLogin() {
  const [formData, setFormData] = useState({
    staffId: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.staffId.trim()) {
      newErrors.staffId = 'Staff ID is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      console.log('Staff login submitted:', formData);
      alert('Staff login successful!');
      setFormData({
        staffId: '',
        password: ''
      });
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="staff-auth-container">
      <div className="staff-auth-card">
        {/* Left Side - Form */}
        <div className="staff-auth-form-section">
          <div className="staff-form-content">
            {/* Logo Section */}
            <div className="staff-logo-section">
              <div className="staff-logo-badge">
                <img src="/KGLogo.png" alt="KgBites Logo" className="staff-logo-image" />
              </div>
              <h1 className="staff-brand-name">KgBites</h1>
              <p className="staff-brand-tagline">Staff Portal</p>
            </div>

            {/* Form Header */}
            <div className="staff-form-header">
              <h2 className="staff-form-title">Staff Login</h2>
              <p className="staff-form-description">
                Sign in with your Staff ID and Password
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="staff-auth-form">
              <div className="staff-input-group">
                <label htmlFor="staffId">Staff ID</label>
                <input
                  type="text"
                  id="staffId"
                  name="staffId"
                  value={formData.staffId}
                  onChange={handleChange}
                  placeholder="Enter your Staff ID"
                  className={errors.staffId ? 'error' : ''}
                />
                {errors.staffId && <span className="staff-error-message">{errors.staffId}</span>}
              </div>

              <div className="staff-input-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <span className="staff-error-message">{errors.password}</span>}
              </div>

              <div className="staff-forgot-link">
                <a href="#forgot">Forgot Password?</a>
              </div>

              <button type="submit" className="staff-submit-button">
                Login
              </button>
            </form>

            <div className="staff-footer-note">
              <p>
                <span className="staff-info-icon">ℹ</span>
                For staff members only. Contact admin for assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="staff-auth-image-section">
          <div className="staff-image-overlay">
            <div className="staff-overlay-content">
              <h2 className="staff-overlay-title">Manage Orders</h2>
              <p className="staff-overlay-text">
                Efficiently handle canteen operations and serve students with ease
              </p>
              <div className="staff-features">
                <div className="staff-feature-item">
                  <span className="staff-feature-icon">✓</span>
                  <span>Scan QR Codes</span>
                </div>
                <div className="staff-feature-item">
                  <span className="staff-feature-icon">✓</span>
                  <span>Manage Inventory</span>
                </div>
                <div className="staff-feature-item">
                  <span className="staff-feature-icon">✓</span>
                  <span>Process Orders</span>
                </div>
              </div>
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=1000&fit=crop" 
            alt="Staff managing orders" 
            className="staff-food-image"
          />
        </div>
      </div>
    </div>
  );
}

export default StaffLogin;
