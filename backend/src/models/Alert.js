// backend/src/models/Alert.js
const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  deviceId: { type: String, index: true },
  ts: { type: Date, default: Date.now, index: true },
  type: { type: String }, // e.g. 'fill', 'battery', 'rssi', 'offline'
  level: { type: String, enum: ['info','warning','critical'], default: 'info' },
  message: String,
  acknowledged: { type: Boolean, default: false },
  meta: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
