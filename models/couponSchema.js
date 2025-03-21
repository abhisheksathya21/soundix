const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true, 
  },
  discountType: {
    type: String,
    enum: ["percentage"], 
    default: "percentage",
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 1,
    max: 100, 
  },
  minPurchaseAmount: {
    type: Number,
    default: 0, 
  },
  maxDiscountAmount: {
    type: Number,
    default: null, 
  },
  startDate: {
  type: Date,
  default: () => new Date(new Date().toISOString()), // Ensures UTC
},
expiryDate: {
  type: Date,
  required: true,
  set: (val) => new Date(val.toISOString()), // Ensures UTC
},
  usageLimit: {
    type: Number,
    default: null, 
  },
  usedCount: {
    type: Number,
    default: 0, 
  },
  perUserLimit: {
    type: Number,
    default: 1, 
  },
  usersUsed: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      count: {
        type: Number,
        default: 0, 
      },
    },
  ],
  isActive: {
    type: Boolean,
    default: true, 
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
