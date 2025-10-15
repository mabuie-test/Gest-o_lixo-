// backend/src/server.js (substituir)
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketio = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new socketio.Server(server, { cors: { origin: process.env.FRONTEND_URL || '*' } });

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Health check (útil para Render)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- Helper para registar rotas com validação ---
function resolveRouter(moduleOrObj) {
  if (!moduleOrObj) return null;
  // CommonJS default interop (in case transpiled)
  if (moduleOrObj.default) moduleOrObj = moduleOrObj.default;
  // If it's already a router (function with stack or function)
  if (typeof moduleOrObj === 'function') return moduleOrObj;
  // If it's an express Router-like object it usually has .stack
  if (moduleOrObj && Array.isArray(moduleOrObj.stack)) return moduleOrObj;
  // If it's an object with router properties, try to find a router value
  if (typeof moduleOrObj === 'object') {
    for (const v of Object.values(moduleOrObj)) {
      if (v && (typeof v === 'function' || Array.isArray(v.stack))) return v;
      if (v && v.default && (typeof v.default === 'function' || Array.isArray(v.default.stack))) return v.default;
    }
  }
  return null;
}

function safeUse(path, mod, nameHint) {
  const r = resolveRouter(mod);
  if (!r) {
    console.error(`ERROR: Route module for path "${path}" is not a Router/middleware. Check the export in ${nameHint || 'module'}.`);
    console.error('Received value:', mod && Object.prototype.toString.call(mod), '\nModule keys:', mod && Object.keys(mod));
    // fail fast so Render logs show the problem
    process.exit(1);
  }
  app.use(path, r);
}

// --- require routes (faça require e valide) ---
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const telemetryRoutes = require('./routes/telemetry');
// optional routes (if exist)
let userRoutes; try { userRoutes = require('./routes/users'); } catch(e){ userRoutes = null; }
let alertRoutes; try { alertRoutes = require('./routes/alerts'); } catch(e){ alertRoutes = null; }

safeUse('/api/auth', authRoutes, './routes/auth');
safeUse('/api/devices', deviceRoutes, './routes/devices');
// telemetry is mounted under devices (e.g. /api/devices/:id/telemetry)
safeUse('/api/devices', telemetryRoutes, './routes/telemetry');

if (userRoutes) safeUse('/api/users', userRoutes, './routes/users');
if (alertRoutes) safeUse('/api/alerts', alertRoutes, './routes/alerts');

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
