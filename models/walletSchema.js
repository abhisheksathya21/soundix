const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0, // Add this to prevent negative balance
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ["Deposit", "Withdrawal", "Purchase", "Refund", "Referal"],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      orderId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Order",
        required: function () {
          return this.type === "Purchase" || this.type === "Refund";
        },
      },
      status: {
        type: String,
        enum: ["Completed", "Failed", "Pending"],
        default: "Completed",
      },
      description: {
        type: String,
        required: false,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Update lastUpdated timestamp before saving
walletSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

// Add index for better query performance
walletSchema.index({ userId: 1 });

// Helper method to add transaction
// ✅ Ensure balance is updated after adding a transaction
walletSchema.methods.addTransaction = async function (transactionData) {
  if (
    (transactionData.type === "Withdrawal" || transactionData.type === "Purchase") &&
    this.balance < transactionData.amount
  ) {
    throw new Error("Insufficient balance");
  }

  this.transactions.push(transactionData);
  this.balance +=
    transactionData.type === "Withdrawal" || transactionData.type === "Purchase"
      ? -transactionData.amount
      : transactionData.amount;

  await this.save(); // ✅ Ensure changes are saved to DB
};


module.exports = mongoose.model("Wallet", walletSchema);
