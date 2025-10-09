import { useState } from 'react';
import './Login.css';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNumber: '',
    password: '',
    confirmPassword: ''
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

    if (!isLogin && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid';
    }

    if (!isLogin && !formData.rollNumber.trim()) {
      newErrors.rollNumber = 'Roll number is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin && !formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      console.log('Form submitted:', formData);
      alert(`${isLogin ? 'Login' : 'Registration'} successful!`);
      setFormData({
        name: '',
        email: '',
        rollNumber: '',
        password: '',
        confirmPassword: ''
      });
    } else {
      setErrors(newErrors);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({
      name: '',
      email: '',
      rollNumber: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Left Side - Form */}
        <div className="auth-form-section">
          <div className="form-content">
            {/* Logo Section */}
            <div className="logo-section">
              <div className="logo-badge">
                <img src="/KGLogo.png" alt="KgBites Logo" className="logo-image" />
              </div>
              <h1 className="brand-name">KgBites</h1>
              <p className="brand-tagline">Canteen Food Ordering</p>
            </div>

            {/* Form Header */}
            <div className="form-header">
              <h2 className="form-title">
                {isLogin ? 'Welcome Back!' : 'Create Account'}
              </h2>
              <p className="form-description">
                {isLogin 
                  ? 'Sign in with your Username and Password' 
                  : 'Register to start ordering delicious food'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="input-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="email">{isLogin ? 'Username' : 'Email Address'}</label>
                <input
                  type={isLogin ? 'text' : 'email'}
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={isLogin ? 'Username' : 'Email'}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              {!isLogin && (
                <div className="input-group">
                  <label htmlFor="rollNumber">Roll Number</label>
                  <input
                    type="text"
                    id="rollNumber"
                    name="rollNumber"
                    value={formData.rollNumber}
                    onChange={handleChange}
                    placeholder="Roll Number"
                    className={errors.rollNumber ? 'error' : ''}
                  />
                  {errors.rollNumber && <span className="error-message">{errors.rollNumber}</span>}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              {!isLogin && (
                <div className="input-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    className={errors.confirmPassword ? 'error' : ''}
                  />
                  {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>
              )}

              {isLogin && (
                <div className="forgot-link">
                  <a href="#forgot">Forgot Password?</a>
                </div>
              )}

              <button type="submit" className="submit-button">
                {isLogin ? 'Login' : 'Register'}
              </button>

            </form>

            <div className="toggle-section">
              <p>
                {isLogin ? "Did not have any account? " : "Already have an account? "}
                <button type="button" onClick={toggleForm} className="toggle-link">
                  {isLogin ? 'Register Now' : 'Login'}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="auth-image-section">
          <div className="image-overlay">
            <div className="overlay-content">
              <h2 className="overlay-title">Delicious Food</h2>
              <p className="overlay-text">Order your favorite meals from our canteen with just a few clicks!</p>
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=1000&fit=crop" 
            alt="Delicious food" 
            className="food-image"
          />
        </div>
      </div>
    </div>
  );
}

export default Login;
