const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category", // References the Category collection
    required: true,
  },
  regularPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  salePrice: {
    type: Number,
    min: 0,
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
 
  color: String, // Optional for color-based products
  productImage: {
    type: [String], // Array of image URLs
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: "At least one image is required.",
    },
  },
  status: {
    type: String,
    enum: ["Available", "Out of Stock", "Discontinued"],
    default: "Available",
  },
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
