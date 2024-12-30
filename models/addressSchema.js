const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  addressType: {
    type: String,
    enum: ["Home", "Office", "Other"],
    required: true
  },
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 100
  },
  city: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 50
  },
  landmark: {
    type: String,
    maxlength: 100
  },
  district: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 50
  },
  state: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 50
  },
  pincode: {
    type: String,
    required: true,
    match: /^[0-9]{6}$/
  },
  phone: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/
  },
  alternativePhone: {
    type: String,
    match: /^[0-9]{10}$/,
    default: null
  }
});

const Address = mongoose.model('Address', AddressSchema);


module.exports =Address;
