import { io } from 'socket.io-client';

// We export it from here instead!
export const socket = io('https://school-election-evm-backend.onrender.com');