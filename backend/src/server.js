const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const telemetryRoutes = require('./routes/telemetry');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new socketio.Server(server, { cors: { origin: process.env.FRONTEND_URL || '*' } });

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Health check (útil para Render)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/devices', telemetryRoutes); // telemetry route uses /:id/telemetry

// Socket.io basic: broadcast telemetry
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
  socket.on('join', (room) => { socket.join(room); });
});

// Expose io to routes via app.locals
app.locals.io = io;

const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => { console.error('Mongo conn error', err); process.exit(1); });
