import { io } from 'socket.io-client';

// We export it from here instead!
export const socket = io('http://localhost:5000');