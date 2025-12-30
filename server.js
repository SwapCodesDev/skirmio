const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const GameManager = require('./gameManager');

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Initialize Game Manager
const gameManager = new GameManager(io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  gameManager.handleConnection(socket);
});

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
