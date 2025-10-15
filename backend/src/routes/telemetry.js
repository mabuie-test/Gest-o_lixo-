const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');
const Device = require('../models/Device');

// device posts telemetry (no auth assumed for devices; if desired, add token)
router.post('/:id/telemetry', async (req,res)=>{
  const deviceId = req.params.id;
  const payload = Object.assign({}, req.body, { deviceId });
  const t = new Telemetry(payload);
  await t.save();

  // update device location if provided
  if (req.body.location && Array.isArray(req.body.location.coordinates)){
    await Device.findByIdAndUpdate(deviceId, { $set: { location: req.body.location }}, { upsert: true });
  }

  // emit realtime
  const io = req.app.locals.io;
  io.emit('telemetry', t);

  // simple alert example
  if (t.fillPercent && t.fillPercent >= 85){
    // here you could call smsService to notify operators
    // smsService.sendAlert(...)
  }

  res.json({ ok: true });
});

router.get('/:id/telemetry', async (req,res)=>{
  const q = { deviceId: req.params.id };
  if (req.query.from || req.query.to) q.ts = {};
  if (req.query.from) q.ts.$gte = new Date(req.query.from);
  if (req.query.to) q.ts.$lte = new Date(req.query.to);
  const rows = await Telemetry.find(q).sort({ ts: -1 }).limit(500);
  res.json(rows);
});

module.exports = router;
