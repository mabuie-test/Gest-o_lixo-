require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/smartbins';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const pw = process.env.SEED_ADMIN_PW || 'password';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin already exists:', email);
    process.exit(0);
  }
  const hash = await bcrypt.hash(pw, 10);
  const u = new User({ email, passwordHash: hash, role: 'admin', name: 'Admin' });
  await u.save();
  console.log('Created admin', email, 'with password', pw);
  process.exit(0);
}

run().catch(e=>{ console.error(e); process.exit(1); });
