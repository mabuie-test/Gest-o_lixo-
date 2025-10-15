// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const auth = require('../middleware/authMiddleware');

// listar users (admin)
router.get('/', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');
  const users = await User.find({}, { passwordHash:0 }).sort({ createdAt: -1 });
  res.json(users);
});

// criar user (admin)
router.post('/', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');
  const { email, password, name, role } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email & password required' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'User exists' });
  const hash = await bcrypt.hash(password, 10);
  const u = new User({ email, passwordHash: hash, name, role });
  await u.save();
  res.status(201).json({ id: u._id, email: u.email, name: u.name, role: u.role });
});

// atualizar user (admin)
router.put('/:id', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');
  const updates = req.body;
  if (updates.password) {
    updates.passwordHash = await bcrypt.hash(updates.password, 10);
    delete updates.password;
  }
  const u = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!u) return res.status(404).end();
  res.json({ id: u._id, email: u.email, name: u.name, role: u.role });
});

// apagar user (admin)
router.delete('/:id', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
