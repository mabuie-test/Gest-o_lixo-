const mongoose = require('mongoose');

const TelemetrySchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  ts: { type: Date, default: Date.now },
  fillPercent: Number,
  ultrasonic_cm: Number,
  ir1: Boolean,
  ir2: Boolean,
  battery_voltage: Number,
  battery_percent: Number,
  rssi: Number,
  firmware: String
}, { timestamps: true });

module.exports = mongoose.model('Telemetry', TelemetrySchema);
