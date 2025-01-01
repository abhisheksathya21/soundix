const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  address: [
    {
      addressType: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      landmark: {
        type: String,
      },
      district: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      alternativePhone: {
        type: String,
      },
    },
  ],
});

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
