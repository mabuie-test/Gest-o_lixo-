// backend/src/routes/telemetry.js
const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');
const Device = require('../models/Device');
const Alert = require('../models/Alert');

// ingestão (sem auth para devices por enquanto)
router.post('/:id/telemetry', async (req,res)=>{
  const deviceId = req.params.id;
  const payload = Object.assign({}, req.body, { deviceId, ts: req.body.ts ? new Date(req.body.ts) : undefined });
  const t = new Telemetry(payload);
  await t.save();

  // opcional: atualizar location do device
  if (req.body.location && Array.isArray(req.body.location.coordinates)){
    await Device.findByIdAndUpdate(deviceId, { $set: { location: req.body.location }}, { upsert: true });
  }

  // emitir realtime
  const io = req.app.locals.io;
  io.emit('telemetry', t);

  // gerar alert se crítico
  if (t.fillPercent && t.fillPercent >= 85) {
    const a = new Alert({ deviceId, type: 'fill', level: 'critical', message: `Fill ${t.fillPercent}%`, meta: { fillPercent: t.fillPercent } });
    await a.save();
    io.emit('alert', a);
  }

  // battery low
  if (t.battery_percent && t.battery_percent <= 15) {
    const a = new Alert({ deviceId, type: 'battery', level: 'warning', message: `Battery ${t.battery_percent}%`, meta: { battery_percent: t.battery_percent } });
    await a.save();
    io.emit('alert', a);
  }

  res.json({ ok: true });
});

// historic telemetry
router.get('/:id/telemetry', async (req,res)=>{
  const q = { deviceId: req.params.id };
  if (req.query.from || req.query.to) q.ts = {};
  if (req.query.from) q.ts.$gte = new Date(req.query.from);
  if (req.query.to) q.ts.$lte = new Date(req.query.to);
  const rows = await Telemetry.find(q).sort({ ts: -1 }).limit(1000);
  res.json(rows);
});

// stats endpoint (avg/min/max fill & battery in last N days)
router.get('/:id/telemetry/stats', async (req,res)=>{
  const deviceId = req.params.id;
  const days = parseInt(req.query.days || '7', 10);
  const since = new Date(Date.now() - days * 24*3600*1000);
  const agg = await Telemetry.aggregate([
    { $match: { deviceId, ts: { $gte: since } } },
    { $group: {
      _id: null,
      avgFill: { $avg: '$fillPercent' },
      minFill: { $min: '$fillPercent' },
      maxFill: { $max: '$fillPercent' },
      avgBattery: { $avg: '$battery_percent' },
      minBattery: { $min: '$battery_percent' },
      maxBattery: { $max: '$battery_percent' },
      count: { $sum: 1 }
    }}
  ]);
  res.json(agg[0] || {});
});

module.exports = router;
