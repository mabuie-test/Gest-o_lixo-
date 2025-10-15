 const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });
  const ok = await user.verifyPassword(password);
  if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });
  const token = jwt.sign({ sub: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
});

module.exports = router;
