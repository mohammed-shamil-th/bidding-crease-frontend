// Utility functions

// Format currency
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Format date and time
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calculate bid increment
export const calculateBidIncrement = (currentPrice) => {
  if (currentPrice >= 1 && currentPrice <= 1000) {
    return 100;
  } else if (currentPrice >= 1001 && currentPrice <= 5000) {
    return 200;
  } else if (currentPrice >= 5001) {
    return 500;
  }
  return 100;
};

// Get next bid amount
export const getNextBidAmount = (currentPrice) => {
  return currentPrice + calculateBidIncrement(currentPrice);
};

// Check if user is admin (has token)
export const isAdmin = () => {
  if (typeof window === 'undefined') return false;
  const Cookies = require('js-cookie');
  return !!Cookies.get('token');
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

