// Socket.IO client utilities
import { io } from 'socket.io-client';

// Derive socket URL from API URL (remove /api if present)
const getSocketURL = () => {
  // If NEXT_PUBLIC_SOCKET_URL is explicitly set, use it
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  
  // Otherwise, derive from API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  // Remove /api from the end if present, and use the base URL
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  return baseUrl;
};

const SOCKET_URL = getSocketURL();

let socket = null;

// Initialize socket connection
export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // Force polling first on Render, then upgrade to websocket
      upgrade: true,
      rememberUpgrade: true,
    });

    // Add connection event listeners for debugging
    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket.id, 'URL:', SOCKET_URL);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message, 'URL:', SOCKET_URL);
    });
  }
  return socket;
};

// Get socket instance
export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Join auction room
export const joinAuction = (tournamentId) => {
  const socket = getSocket();
  socket.emit('join:auction', tournamentId);
};

// Leave auction room
export const leaveAuction = (tournamentId) => {
  const socket = getSocket();
  socket.emit('leave:auction', tournamentId);
};

export default getSocket;

