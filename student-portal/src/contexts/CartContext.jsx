import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItemIndex = state.items.findIndex(item => item.id === action.payload.id);
      
      if (existingItemIndex > -1) {
        const existingItem = state.items[existingItemIndex];
        
        // Check if adding one more would exceed available stock
        if (existingItem.quantity >= action.payload.stock) {
          // Don't add more if stock limit reached
          return state;
        }
        
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex].quantity += 1;
        return {
          ...state,
          items: updatedItems,
          totalItems: state.totalItems + 1,
          totalAmount: state.totalAmount + action.payload.price
        };
      } else {
        // Check if item has stock available
        if (!action.payload.stock || action.payload.stock <= 0) {
          return state;
        }
        
        return {
          ...state,
          items: [...state.items, { ...action.payload, quantity: 1 }],
          totalItems: state.totalItems + 1,
          totalAmount: state.totalAmount + action.payload.price
        };
      }

    case 'REMOVE_ITEM':
      const itemToRemove = state.items.find(item => item.id === action.payload.id);
      if (!itemToRemove) return state;

      if (itemToRemove.quantity === 1) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.payload.id),
          totalItems: state.totalItems - 1,
          totalAmount: state.totalAmount - itemToRemove.price
        };
      } else {
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
        return {
          ...state,
          items: updatedItems,
          totalItems: state.totalItems - 1,
          totalAmount: state.totalAmount - itemToRemove.price
        };
      }

    case 'CLEAR_CART':
      return {
        items: [],
        totalItems: 0,
        totalAmount: 0,
        isOpen: false
      };

    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen
      };

    case 'SET_CART_OPEN':
      return {
        ...state,
        isOpen: action.payload
      };

    default:
      return state;
  }
};

const initialState = {
  items: [],
  totalItems: 0,
  totalAmount: 0,
  isOpen: false
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = (item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (item) => {
    dispatch({ type: 'REMOVE_ITEM', payload: item });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  const setCartOpen = (isOpen) => {
    dispatch({ type: 'SET_CART_OPEN', payload: isOpen });
  };

  const getItemQuantity = (itemId) => {
    const item = state.items.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        clearCart,
        toggleCart,
        setCartOpen,
        getItemQuantity
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};