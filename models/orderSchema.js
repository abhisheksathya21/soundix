const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      productId: {
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
      },
      status: {
        type: String,
        enum: [
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Return Requested",
          "Returned",
        ],
        default: "Pending",
      },
      cancellationReason: {
        type: String, // Stores the reason if the product is canceled
        trim: true,
      },
      cancelledAt: {
        type: Date, // Timestamp when the product was canceled
      },
      // Return-related fields
      returnReason: {
        type: String,
        trim: true,
      },
      returnStatus: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending",
      },
      returnedAt: {
        type: Date, // Timestamp when the product was returned
      },
      refundAmount: {
        type: Number,
        default: 0,
      },
      refundStatus: {
        type: String,
        enum: ["Pending", "Processed"],
        default: "Pending",
      },
    },
  ],
  shippingAddress: {
    name: {
      type: String,
      required: true,
    },
    addressType: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
      default: "India",
    },
    pinCode: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
  },
  subTotal: {
    type: Number,
    required: true,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  coupon: {
    code: {
      type: String,
    },
    discountAmount: {
      type: Number,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
    },
  },
  taxAmount: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  offerDiscount: {
    type: Number,
    default: 0,
  },
  paymentMethod: {
    type: String,
    enum: ["COD", "Razorpay", "WALLET"],
    required: true,
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Processing", "Paid", "Failed"],
    default: "Pending",
  },
  orderStatus: {
    type: String,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returned",
    ],
    default: "Pending",
  },
  cancellationReason: {
    type: String, // Stores the reason if the entire order is canceled
    trim: true,
  },
  cancelledAt: {
    type: Date, // Timestamp when the order was canceled
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  statusHistory: [
    {
      status: {
        type: String,
        required: true,
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  returnRequests: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      reason: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending",
      },
      requestDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

orderSchema.methods.updateStatus = async function (status, comment) {
  this.orderStatus = status;
  this.statusHistory.push({ status, comment });
  return this.save();
};

module.exports = mongoose.model("Order", orderSchema);
