// backend/src/routes/devices.js
const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const auth = require('../middleware/authMiddleware');
const crypto = require('crypto');

/**
 * Helper: emit event if io available
 */
function emitIo(req, event, payload){
  try {
    const io = req.app && req.app.locals && req.app.locals.io;
    if (io && typeof io.emit === 'function') io.emit(event, payload);
  } catch(err){
    console.warn('emitIo error', err);
  }
}

/**
 * criar device (admin)
 */
router.post('/', auth, async (req,res)=>{
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const payload = Object.assign({}, req.body);
    const id = payload._id || ('dev-' + crypto.randomBytes(4).toString('hex'));
    payload._id = id;

    const d = new Device(payload);
    await d.save();

    // Emit real-time event for frontends
    emitIo(req, 'device:created', d);

    return res.status(201).json(d);
  } catch (err) {
    console.error('POST /api/devices error', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

/**
 * listar devices
 */
router.get('/', auth, async (req,res)=>{
  try {
    const list = await Device.find({});
    return res.json(list);
  } catch (err) {
    console.error('GET /api/devices error', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

/**
 * obter device
 */
router.get('/:id', auth, async (req,res)=>{
  try {
    const d = await Device.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Device not found' });
    return res.json(d);
  } catch (err) {
    console.error('GET /api/devices/:id error', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

/**
 * atualizar device (admin)
 */
router.put('/:id', auth, async (req,res)=>{
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const updates = Object.assign({}, req.body);
    // optional: prevent _id rewrite
    delete updates._id;

    const upd = await Device.findByIdAndUpdate(req.params.id, updates, { new: true, upsert: false });
    if (!upd) return res.status(404).json({ message: 'Device not found' });

    // emitir update
    emitIo(req, 'device:update', upd);

    return res.json(upd);
  } catch (err) {
    console.error('PUT /api/devices/:id error', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

/**
 * apagar device (admin)
 */
router.delete('/:id', auth, async (req,res)=>{
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const d = await Device.findByIdAndDelete(req.params.id);
    if (!d) return res.status(404).json({ message: 'Device not found' });

    emitIo(req, 'device:deleted', { _id: req.params.id });

    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/devices/:id error', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

/**
 * gerar token de dispositivo (admin)
 */
router.post('/:id/token', auth, async (req,res)=>{
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Device not found' });

    const token = crypto.randomBytes(20).toString('hex');
    device.config = device.config || {};
    device.config.deviceToken = token;
    await device.save();

    // emit optional update so frontends can refresh
    emitIo(req, 'device:update', device);

    return res.json({ token });
  } catch (err) {
    console.error('POST /api/devices/:id/token error', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

module.exports = router;
