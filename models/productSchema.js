const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
    enum: ["headphone", "speaker", "earbud"],
  },
  specifications: {
    type: Map,
    of: String, // Flexible key-value pairs for specifications
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  images: {
    type: [String], // Array of image URLs
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: "At least one image is required.",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
