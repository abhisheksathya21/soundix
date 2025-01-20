const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    default: null,
  },
  googleId: {
    type: String,
    sparse: true, // Only enforce uniqueness if field exists
    unique: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('User', userSchema);



