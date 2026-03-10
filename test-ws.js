const WebSocket = require('ws');

const token = 'RzBFAiEAmayywbrkQfmDLb7TP9ar6FjiLq3DMOGYTREAxQ9Ppn4CIAh1BViHsJlALWRztueoGz2OEfuAo0ZJSCf88AvHmWhAeyJ1IjoxLCJlIjoiMjAyNi0wMy0yNlQxNjowMDowMC4wMDArMDA6MDAifQ';
const url = `wss://tracker.fod.aamlo.net/api/socket?token=${token}`;

console.log('Connecting to:', url);

const ws = new WebSocket(url, {
  origin: 'https://tracker.fod.aamlo.net'
});

ws.on('open', () => {
  console.log('Connected successfully!');
  ws.close();
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err.message);
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString());
});
