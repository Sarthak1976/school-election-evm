const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Standard Express Middlewares
app.use(cors());
app.use(express.json());


// 1. Wrap Express inside a standard HTTP server
const server = http.createServer(app);

// 2. Attach Socket.io to that HTTP server
const io = new Server(server,{
    cors: {
        origin: "http://localhost:5173",  // This is where our Vite React app will live
        methods: ["GET", "POST"]
    }
});


// 3. The Socket Connection Hub
io.on('connection', (socket) => {
  // Whenever a new device loads the website, this fires
  console.log('A device connected! ID:', socket.id);

  // When that device closes the browser tab, this fires
  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('EVM Brain Server is running!');
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`EVM Brain Server is running on port ${PORT}`);
});

