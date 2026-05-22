import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config.js';
import { getSessionToken } from './apiClient';

let socket: Socket | null = null;
let socketPromise: Promise<Socket | null> | null = null;

export const getRealtimeSocket = async () => {
  if (socket?.connected) return socket;
  if (socket && !socket.connected) {
    socket.connect();
    return socket;
  }
  if (socketPromise) return socketPromise;

  socketPromise = (async () => {
    const token = await getSessionToken();
    if (!token) return null;
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketPromise = null;
    return socket;
  })();

  return socketPromise;
};

export const disconnectRealtimeSocket = () => {
  socket?.disconnect();
  socket = null;
  socketPromise = null;
};
