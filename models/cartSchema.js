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
          ref: "Product", // Reference to the Product model
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
      default: 0, // Total cost of all items in the cart
    },
  },
  {
    timestamps: true, // Automatically add `createdAt` and `updatedAt` fields
  }
);

// Add index for querying by user
cartSchema.index({ user: 1 });

// Pre-save middleware to calculate the total amount
cartSchema.pre("save", function (next) {
  this.totalAmount = this.items.reduce((sum, item) => {
    return sum + item.discountedPrice * item.quantity;
  }, 0);
  next();
});

// Export the model
module.exports = mongoose.model("Cart", cartSchema);
