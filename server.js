console.log('Starting server initialization...');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

console.log('Loading GameManager...');
const GameManager = require('./gameManager');

const PORT = process.env.PORT || 3000;
console.log(`Port configured as: ${PORT}`);

// LOGGING MIDDLEWARE - MUST BE FIRST
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// HEALTH CHECK - BEFORE STATIC
app.get('/health', (req, res) => {
  console.log('Health check received');
  res.status(200).send('OK');
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Initialize Game Manager
try {
  console.log('Initializing GameManager instance...');
  const gameManager = new GameManager(io);

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    gameManager.handleConnection(socket);
  });
} catch (err) {
  console.error('FAILED to initialize GameManager:', err);
}

console.log('Attempting to bind server...');
// Explicitly bind to 0.0.0.0 for Railway/Docker
const server = http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server successfully running on port ${PORT}`);
});

// Fix for 502 Bad Gateway (Keep-Alive Timeouts)
// Ensure Node's keep-alive is longer than the Load Balancer's (usually 60s)
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
