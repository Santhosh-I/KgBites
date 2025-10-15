import React from 'react';
import { useCart } from '../../contexts/CartContext';
import { useToast } from './ToastProvider';
import './FloatingCart.css';

const FloatingCart = () => {
  const { 
    items, 
    totalItems, 
    totalAmount, 
    isOpen, 
    toggleCart, 
    addItem, 
    removeItem, 
    clearCart 
  } = useCart();
  
  const { showError, showSuccess } = useToast();

  const handleAddItem = (item) => {
    // Check if adding one more would exceed available stock
    if (item.quantity >= item.stock) {
      showError(`Maximum stock limit reached! Only ${item.stock} ${item.stock === 1 ? 'item' : 'items'} available for "${item.name}"`);
      return;
    }
    
    // Show success message when reaching max stock
    if (item.quantity + 1 === item.stock) {
      addItem(item);
      showSuccess(`Maximum available quantity (${item.stock}) now in cart`);
      return;
    }
    
    addItem(item);
  };

  if (totalItems === 0) return null;

  return (
    <>
      {/* Cart Button */}
      <div className="floating-cart-button" onClick={toggleCart}>
        <div className="cart-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            <path d="M17 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            <path d="M7.17 14.75l.03-.12.9-2.63H15.7c.67 0 1.26-.37 1.58-.93L19.88 6H6.39l-.28-1.25C6.01 4.32 5.6 4 5.1 4H2v2h2.21l1.94 8.75H7.17z"/>
          </svg>
          <span className="cart-badge">{totalItems}</span>
        </div>
        <div className="cart-info">
          <span className="cart-items">{totalItems} items</span>
          <span className="cart-total">₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Cart Overlay */}
      {isOpen && (
        <div className="cart-overlay" onClick={() => toggleCart()}>
          <div className="cart-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h3>Your Order</h3>
              <button className="close-cart" onClick={toggleCart}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <div className="cart-items">
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p className="item-counter">{item.counter_name}</p>
                    <p className="item-price">₹{item.price}</p>
                    {item.quantity >= item.stock && (
                      <p style={{ fontSize: '11px', color: '#ff6b6b', marginTop: '2px' }}>
                        Max stock reached
                      </p>
                    )}
                  </div>
                  
                  <div className="item-controls">
                    <button 
                      className="quantity-btn"
                      onClick={() => removeItem(item)}
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button 
                      className="quantity-btn"
                      onClick={() => handleAddItem(item)}
                      disabled={item.quantity >= item.stock}
                      style={{ 
                        opacity: item.quantity >= item.stock ? 0.5 : 1,
                        cursor: item.quantity >= item.stock ? 'not-allowed' : 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Total Items:</span>
                  <span>{totalItems}</span>
                </div>
                <div className="summary-row total">
                  <span>Total Amount:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="cart-actions">
                <button className="clear-cart-btn" onClick={clearCart}>
                  Clear Cart
                </button>
                <button className="checkout-btn">
                  Proceed to Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingCart;