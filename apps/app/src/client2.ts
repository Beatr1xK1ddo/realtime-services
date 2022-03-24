import { Manager } from 'socket.io-client';
const manager = new Manager('http://localhost:3000');
const socket = manager.socket('/logger');

socket.on('connect', () => {
    console.log('client connected to Logger...');
    socket.emit('subscribe', 'syslog');
});

socket.on('message', (message) => {
    console.log(`Message to ${socket.id}`, message);
});
socket.on('error', (error) => {
    console.log(`Message to ${socket.id}`, error);
});
