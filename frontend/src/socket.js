import { io } from 'socket.io-client';
const URL = process.env.REACT_APP_API_WS || 'http://localhost:4000';
export const socket = io(URL);
