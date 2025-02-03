const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true, // Ensures the code is always stored in uppercase
  },
  discountType: {
    type: String,
    enum: ["percentage"], // Only percentage-based discounts allowed
    default: "percentage",
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 1,
    max: 100, // Ensures percentage discount does not exceed 100%
  },
  minPurchaseAmount: {
    type: Number,
    default: 0, // Minimum cart value required to apply the coupon
  },
  maxDiscountAmount: {
    type: Number,
    default: null, // Caps the discount amount (useful for high percentage values)
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: true, // The date after which the coupon will be invalid
  },
  usageLimit: {
    type: Number,
    default: null, // Maximum number of times this coupon can be used overall
  },
  usedCount: {
    type: Number,
    default: 0, // Tracks how many times the coupon has been used
  },
  perUserLimit: {
    type: Number,
    default: 1, // Limits how many times a user can use this coupon
  },
  usersUsed: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      count: {
        type: Number,
        default: 0, // Tracks how many times a specific user has used this coupon
      },
    },
  ],
  isActive: {
    type: Boolean,
    default: true, // Whether the coupon is active or not
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
