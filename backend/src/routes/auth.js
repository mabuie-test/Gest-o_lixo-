 // backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const JWT_EXPIRES = '12h';

// LOGIN (existente)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email e password são obrigatórios' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });

    const token = jwt.sign({ sub: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

// REGISTER (novo) — cria utilizador; criação de admin exige secret
// Header esperado para criar admin: `x-admin-secret: <valor>`
// Se ADMIN_REG_SECRET não estiver definido, criação de admin via API é desactivada.
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email e password são obrigatórios' });

    // Normaliza role
    const allowedRoles = ['admin','operator','viewer'];
    const r = (role && allowedRoles.includes(role)) ? role : 'viewer';

    // Se pedido role admin, validar secret
    if (r === 'admin') {
      const adminSecretEnv = process.env.ADMIN_REG_SECRET;
      const provided = req.headers['x-admin-secret'] || req.body.adminSecret;
      if (!adminSecretEnv) {
        return res.status(403).json({ message: 'Registo de admin desactivado no servidor' });
      }
      if (!provided || provided !== adminSecretEnv) {
        return res.status(403).json({ message: 'Secret inválido para registo de admin' });
      }
    }

    // Verifica se já existe
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Utilizador já existe' });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash: hash, role: r, name });
    await user.save();

    const token = jwt.sign({ sub: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

module.exports = router;
