const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // References the User collection
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // References the Product collection
        required: true,
      },
      finalPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      addedOn: {
        type: Date,
        default: Date.now, // Tracks when the product was added to
      },
    },
  ],
  createdOn: {
    type: Date,
    default: Date.now,
  },
  updatedOn: {
    type: Date,
    default: Date.now,
  },
});


wishlistSchema.pre("save", function (next) {
  this.updatedOn = Date.now();
  next();
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

module.exports = Wishlist;
