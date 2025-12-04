const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  offer: {
    discountPercentage: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
  },
});

module.exports = mongoose.model("Category", categorySchema);
