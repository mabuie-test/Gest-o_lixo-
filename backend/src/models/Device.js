const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  _id: String, // deviceId
  name: String,
  location: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  status: { type: String, enum: ['active','inactive','maintenance'], default: 'active' },
  config: { telemetryInterval: Number, alertThreshold: Number }
}, { timestamps: true });

DeviceSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Device', DeviceSchema);
