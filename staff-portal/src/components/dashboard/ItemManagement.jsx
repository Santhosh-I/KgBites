import React, { useState, useEffect } from 'react';
import { useToast } from '../common/ToastProvider';
import './ItemManagement.css';

const ItemManagement = ({ onDataUpdate }) => {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState([]);
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCounter, setSelectedCounter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [itemsResponse, countersResponse] = await Promise.all([
        fetch('http://localhost:8000/api/menu/items/', {
          headers: { 'Authorization': `Token ${token}` }
        }),
        fetch('http://localhost:8000/api/menu/counters/', {
          headers: { 'Authorization': `Token ${token}` }
        })
      ]);

      if (itemsResponse.ok && countersResponse.ok) {
        const itemsData = await itemsResponse.json();
        const countersData = await countersResponse.json();
        setItems(itemsData);
        setCounters(countersData);
      } else {
        showError('Failed to load data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const updateItemStock = async (itemId, newStock) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/menu/items/${itemId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock: newStock })
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems(items.map(item => item.id === itemId ? updatedItem : item));
        showSuccess('Stock updated successfully');
        onDataUpdate();
      } else {
        showError('Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      showError('Error updating stock');
    }
  };

  const toggleItemAvailability = async (itemId, isAvailable) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/menu/items/${itemId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_available: !isAvailable })
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems(items.map(item => item.id === itemId ? updatedItem : item));
        showSuccess(`Item ${!isAvailable ? 'enabled' : 'disabled'} successfully`);
        onDataUpdate();
      } else {
        showError('Failed to update availability');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      showError('Error updating availability');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesCounter = selectedCounter === 'all' || item.counter === selectedCounter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCounter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading items...</p>
      </div>
    );
  }

  return (
    <div className="item-management">
      {/* Header Controls */}
      <div className="management-header">
        <div className="header-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <select
            value={selectedCounter}
            onChange={(e) => setSelectedCounter(e.target.value)}
            className="counter-select"
          >
            <option value="all">All Counters</option>
            {counters.map(counter => (
              <option key={counter.id} value={counter.id}>
                {counter.name}
              </option>
            ))}
          </select>
          
          <button
            className="add-item-btn"
            onClick={() => setShowAddModal(true)}
          >
            <span>➕</span>
            Add Item
          </button>
        </div>
        
        <div className="summary-stats">
          <div className="summary-card">
            <span className="summary-number">{filteredItems.length}</span>
            <span className="summary-label">Total Items</span>
          </div>
          <div className="summary-card available">
            <span className="summary-number">
              {filteredItems.filter(item => item.is_available).length}
            </span>
            <span className="summary-label">Available</span>
          </div>
          <div className="summary-card low-stock">
            <span className="summary-number">
              {filteredItems.filter(item => item.stock <= 5).length}
            </span>
            <span className="summary-label">Low Stock</span>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="items-grid">
        {filteredItems.map(item => (
          <div key={item.id} className={`item-card ${!item.is_available ? 'unavailable' : ''} ${item.stock <= 5 ? 'low-stock' : ''}`}>
            <div className="item-image">
              {item.image ? (
                <img src={item.image} alt={item.name} />
              ) : (
                <div className="no-image">
                  <span>🍽️</span>
                </div>
              )}
              <div className="item-status">
                {!item.is_available && <span className="status-badge unavailable">Unavailable</span>}
                {item.stock <= 5 && item.stock > 0 && <span className="status-badge low-stock">Low Stock</span>}
                {item.stock === 0 && <span className="status-badge out-of-stock">Out of Stock</span>}
              </div>
            </div>
            
            <div className="item-details">
              <h3 className="item-name">{item.name}</h3>
              <p className="item-description">{item.description}</p>
              <div className="item-meta">
                <span className="item-price">₹{item.price}</span>
                <span className="item-counter">
                  {counters.find(c => c.id === item.counter)?.name || 'Unknown'}
                </span>
              </div>
            </div>
            
            <div className="item-controls">
              <div className="stock-control">
                <label>Stock:</label>
                <div className="stock-buttons">
                  <button
                    className="stock-btn decrease"
                    onClick={() => updateItemStock(item.id, Math.max(0, item.stock - 1))}
                    disabled={item.stock <= 0}
                  >
                    ➖
                  </button>
                  <span className="stock-value">{item.stock}</span>
                  <button
                    className="stock-btn increase"
                    onClick={() => updateItemStock(item.id, item.stock + 1)}
                  >
                    ➕
                  </button>
                </div>
              </div>
              
              <div className="item-actions">
                <button
                  className={`availability-btn ${item.is_available ? 'available' : 'unavailable'}`}
                  onClick={() => toggleItemAvailability(item.id, item.is_available)}
                >
                  {item.is_available ? '✅ Available' : '❌ Unavailable'}
                </button>
                
                <button
                  className="edit-btn"
                  onClick={() => setEditingItem(item)}
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredItems.length === 0 && (
        <div className="no-items">
          <span>🔍</span>
          <p>No items found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default ItemManagement;