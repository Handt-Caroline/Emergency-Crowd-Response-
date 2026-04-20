const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const alertsRoutes = require('./src/routes/alertsRoutes');/const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Middleware — runs on every request
app.use(cors());
app.use(express.json());
//app.use('/api/alerts', alertsRoutes);

// Test route — confirms server is alive
app.get('/', (req, res) => {
  res.json({ message: 'ECRS server is running' });
});

// WebSocket — hospital joins their room on connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', (institutionId) => {
    socket.join(`institution_room_${institutionId}`);
    console.log(`Hospital ${institutionId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible inside controllers
app.set('io', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`ECRS server running on port ${PORT}`);
});