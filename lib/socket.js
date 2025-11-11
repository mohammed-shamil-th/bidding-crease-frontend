// Socket.IO client utilities
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket = null;

// Initialize socket connection
export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
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

