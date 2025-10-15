 // backend/src/routes/alerts.js
const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const auth = require('../middleware/authMiddleware');

// listar (admin+operator)
router.get('/', auth, async (req,res)=>{
  try {
    const q = {};
    if (req.query.unack === 'true') q.acknowledged = false;
    const rows = await Alert.find(q).sort({ ts: -1 }).limit(500);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/alerts error', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

// ack an alert (operator or admin)
router.post('/:id/ack', auth, async (req,res)=>{
  try {
    if (!['admin','operator'].includes(req.user.role)) return res.status(403).send('Forbidden');
    const a = await Alert.findByIdAndUpdate(req.params.id, { $set: { acknowledged: true }}, { new: true });
    if (!a) return res.status(404).json({ message: 'Not found' });
    const io = req.app.locals.io;
    io.emit('alert:ack', a);
    res.json(a);
  } catch (err) {
    console.error('POST /api/alerts/:id/ack error', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

module.exports = router;
