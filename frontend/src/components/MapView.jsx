 // backend/src/routes/devices.js
const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const auth = require('../middleware/authMiddleware');
const crypto = require('crypto');

// criar device (admin)
router.post('/', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');
  const payload = req.body;
  // id pode ser passado ou gerado
  const id = payload._id || ('dev-' + crypto.randomBytes(4).toString('hex'));
  payload._id = id;
  const d = new Device(payload); await d.save();
  res.status(201).json(d);
});

// listar devices
router.get('/', auth, async (req,res)=>{
  const list = await Device.find({}); res.json(list);
});

// obter device
router.get('/:id', auth, async (req,res)=>{
  const d = await Device.findById(req.params.id); if(!d) return res.status(404).end(); res.json(d);
});

// atualizar device (admin)
router.put('/:id', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');
  const upd = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true, upsert: false });
  if (!upd) return res.status(404).end();
  // emitir update
  const io = req.app.locals.io;
  io.emit('device:update', upd);
  res.json(upd);
});

// apagar device (admin)
router.delete('/:id', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');
  await Device.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// gerar token de dispositivo (admin) — token simples p/ provar autenticação de device
router.post('/:id/token', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');
  // token = random hex + deviceId (não é JWT; podes trocar por JWT se preferir)
  const token = crypto.randomBytes(20).toString('hex');
  // guardar token no campo config.deviceToken (ou numa coleção dedicada)
  await Device.findByIdAndUpdate(req.params.id, { $set: { 'config.deviceToken': token }}, { upsert: false });
  res.json({ token });
});

module.exports = router;
