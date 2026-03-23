import { io } from 'socket.io-client';

// In production the frontend is served by the same server → relative URL
// In dev use localhost:3001
const SERVER_URL = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');

export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
});
