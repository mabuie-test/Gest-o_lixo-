 const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');
  const d = new Device(req.body); await d.save(); res.json(d);
});

router.get('/', auth, async (req,res)=>{
  const list = await Device.find({}); res.json(list);
});

router.get('/:id', auth, async (req,res)=>{
  const d = await Device.findById(req.params.id); if(!d) return res.status(404).end(); res.json(d);
});

module.exports = router;
