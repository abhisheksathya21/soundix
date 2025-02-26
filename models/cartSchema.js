const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product", 
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1, 
        },
        price: {
          type: Number,
          required: true, 
        }
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0, 
    },
  },
  {
    timestamps: true, 
  }
);


cartSchema.index({ user: 1 });


cartSchema.pre("save", function (next) {
  this.totalAmount = this.items.reduce((sum, item) => {
    return sum + item.discountedPrice * item.quantity;
  }, 0);
  next();
});


module.exports = mongoose.model("Cart", cartSchema);
