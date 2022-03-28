import { Manager } from 'socket.io-client';
const manager = new Manager('http://qa.nextologies.com:1987');
// const manager = new Manager('http://localhost:1987');
const socket = manager.socket('/logger');

socket.on('connect', () => {
    console.log('client connected to Logger...');
    socket.emit('subscribe', { nodeId: 1234134234, logType: 'appLog' });
});

socket.on('data', (message) => {
    console.log(`Message to ${socket.id}`, message);
});
socket.on('error', (error) => {
    console.log(`Message to ${socket.id}`, error);
});
