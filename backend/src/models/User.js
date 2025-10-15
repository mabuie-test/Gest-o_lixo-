const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','operator','viewer'], default: 'viewer' },
  name: String
}, { timestamps: true });

UserSchema.methods.verifyPassword = function(pw) { return bcrypt.compare(pw, this.passwordHash); };

module.exports = mongoose.model('User', UserSchema);
