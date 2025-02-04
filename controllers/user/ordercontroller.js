const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const crypto = require("crypto"); //

const Razorpay = require("razorpay");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const orderSuccess = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/login");
    }
    const OrderData = await Order.find({ userId: userId });
    const userData = await User.findById(userId);
    res.render("order-success", { orderData: OrderData, userData: userData });
  } catch (error) {
    console.error("Error loading order success page:", error);
    res.redirect("/pageNotFound");
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
    } = req.body;

   
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const userId = req.session.user;
    const cartData = await Cart.findOne({ user: userId }).populate(
      "items.product"
    );

    if (!cartData || cartData.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

  
    const addressDocument = await Address.findOne({ userId });
    const addressData = addressDocument.address.find(
      (addr) => addr._id.toString() === addressId
    );

    const shippingAddress = {
      name: addressData.name,
      addressType: addressData.addressType,
      street: addressData.landmark || "",
      city: addressData.city,
      state: addressData.state,
      country: "India",
      pinCode: addressData.pincode,
      phoneNumber: addressData.phone,
    };

    // Calculate totals
    const orderItems = cartData.items.map((item) => ({
      productId: item.product._id,
      quantity: item.quantity,
      price: item.price,
    }));

    const subTotal = cartData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shippingCost = 10;
    const totalAmount = subTotal + shippingCost;

    // Update stock
    for (const cartItem of cartData.items) {
      const product = cartItem.product;
      const newStock = product.quantity - cartItem.quantity;
      await Product.updateOne(
        { _id: product._id },
        { $set: { quantity: newStock } }
      );
    }

    const newOrder = new Order({
      orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      items: orderItems,
      shippingAddress,
      subTotal,
      taxAmount: 0,
      totalAmount,
      paymentMethod: "Razorpay",
      orderStatus: "Pending", // Changed from "Confirmed" to "Pending"
      paymentStatus: "Paid",
      paymentDetails: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
    });

    await newOrder.save();
    await Cart.updateOne({ user: userId }, { $set: { items: [] } });

    res.status(200).json({ success: true, orderId: newOrder.orderId });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: "Payment verification failed" });
  }
};

const createReturnRequest = async (req, res) => {
  try {
    const { orderId, productId, reason } = req.body;
    const userId = req.session.user;

    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order is delivered
    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Order must be delivered to initiate return",
      });
    }

    const productItem = order.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!productItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in order",
      });
    }

    // Check if product is already returned or cancellable
    if (
      productItem.status === "Returned" ||
      productItem.returnStatus === "Approved"
    ) {
      return res.status(400).json({
        success: false,
        message: "Product cannot be returned",
      });
    }

    // Create return request
    order.returnRequests.push({
      productId: productItem.productId,
      reason: reason,
      status: "Pending",
      requestDate: new Date(),
    });

    // Update product status
    productItem.status = "Return Requested";
    productItem.returnReason = reason;
    productItem.returnStatus = "Pending";

    // Add to status history
    order.statusHistory.push({
      status: "Return Requested",
      comment: `Return requested for product ${productId}. Reason: ${reason}`,
      date: new Date(),
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Return request submitted successfully",
      data: {
        orderId: order.orderId,
        productId: productId,
        returnStatus: "Pending",
        reason: reason,
      },
    });
  } catch (error) {
    console.error("Error creating return request:", error);
    res.status(500).json({
      success: false,
      message: "Error processing return request",
    });
  }
};

const processReturnRequest = async (req, res) => {
  try {
    const { orderId, productId, status } = req.body;
    const adminId = req.session.admin; // Assuming admin authentication

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const returnRequest = order.returnRequests.find(
      (request) => request.productId.toString() === productId
    );

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    const productItem = order.items.find(
      (item) => item.productId.toString() === productId
    );

    if (status === "Approved") {
      // Process refund
      const refundAmount = productItem.price * productItem.quantity;

      let wallet = await Wallet.findOne({ userId: order.userId });
      if (!wallet) {
        wallet = new Wallet({ userId: order.userId });
      }

      await wallet.addTransaction({
        type: "Refund",
        amount: refundAmount,
        orderId: order._id,
        description: `Refund for returned product in order ${order.orderId}`,
        status: "Completed",
      });

      // Return product to inventory
      const product = await Product.findById(productId);
      if (product) {
        product.quantity += productItem.quantity;
        await product.save();
      }

      // Update order and product status
      productItem.status = "Returned";
      productItem.returnStatus = "Approved";
      productItem.refundAmount = refundAmount;
      productItem.refundStatus = "Processed";
      returnRequest.status = "Approved";

      // Add to status history
      order.statusHistory.push({
        status: "Product Returned",
        comment: `Product ${productId} return approved and refunded`,
        date: new Date(),
      });
    } else {
      // Reject return
      productItem.status = "Delivered";
      productItem.returnStatus = "Rejected";
      returnRequest.status = "Rejected";

      // Add to status history
      order.statusHistory.push({
        status: "Return Rejected",
        comment: `Product ${productId} return request rejected`,
        date: new Date(),
      });
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Return request ${status.toLowerCase()}`,
      data: {
        orderId: order.orderId,
        productId: productId,
        returnStatus: returnRequest.status,
      },
    });
  } catch (error) {
    console.error("Error processing return request:", error);
    res.status(500).json({
      success: false,
      message: "Error processing return request",
    });
  }
};


const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { reason } = req.body; // Get the cancellation reason from request
    const userId = req.session.user;

    const order = await Order.findOne({ orderId: orderId, userId: userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (["Shipped", "Delivered", "Cancelled"].includes(order.orderStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Order cannot be cancelled" });
    }

    // Process refund to wallet for Razorpay or Wallet payments
    if (["WALLET", "Razorpay"].includes(order.paymentMethod)) {
      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        wallet = new Wallet({ userId });
      }

      await wallet.addTransaction({
        type: "Refund",
        amount: order.totalAmount,
        orderId: order._id,
        description: `Refund for cancelled order ${order.orderId}`,
        status: "Completed",
      });
    }

    // Return products to inventory & update their status
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }

      item.status = "Cancelled";
      item.cancelledAt = new Date();
      item.cancellationReason = reason; // Add reason to each item
    }

    // Update order status and add cancellation details
    order.orderStatus = "Cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = reason;

    // Add to status history
    order.statusHistory.push({
      status: "Cancelled",
      comment: `Order cancelled by user. Reason: ${reason}`,
      date: new Date(),
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        orderId: order.orderId,
        status: "Cancelled",
        reason: reason,
        totalAmount: 0,
        products: order.items.map((item) => ({
          productId: item.productId,
          status: "Cancelled",
        })),
      },
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling order",
    });
  }
};

const cancelProductOrder = async (req, res) => {
  try {
    const { orderId, productId, reason } = req.body; // Get reason from request body
    const userId = req.session.user;

    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (["Shipped", "Delivered", "Cancelled"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Products cannot be cancelled from this order",
      });
    }

    const productItem = order.items.find(
      (item) => item.productId.toString() === productId
    );
    if (!productItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in order",
      });
    }

    if (productItem.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Product is already cancelled",
      });
    }

    const refundAmount = productItem.price * productItem.quantity;

    // Process refund to wallet for Razorpay or Wallet payments
    if (["WALLET", "Razorpay"].includes(order.paymentMethod)) {
      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        wallet = new Wallet({ userId });
      }

      await wallet.addTransaction({
        type: "Refund",
        amount: refundAmount,
        orderId: order._id,
        description: `Refund for cancelled product in order ${order.orderId}`,
        status: "Completed",
      });
    }

    // Return product to inventory
    const product = await Product.findById(productId);
    if (product) {
      product.quantity += productItem.quantity;
      await product.save();
    }

    // Update product status with cancellation reason
    productItem.status = "Cancelled";
    productItem.cancelledAt = new Date();
    productItem.cancellationReason = reason;

    // Add to status history
    order.statusHistory.push({
      status: "Product Cancelled",
      comment: `Product ${
        product.name || productId
      } cancelled. Reason: ${reason}`,
      date: new Date(),
    });

    // Check if all products are cancelled
    const activeItems = order.items.filter(
      (item) => item.status !== "Cancelled"
    );
    if (activeItems.length === 0) {
      order.orderStatus = "Cancelled";
      order.cancelledAt = new Date();
      order.cancellationReason = "All products cancelled";
    } else {
      // Update total amount for remaining active items
      order.totalAmount = activeItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );
    }

    await order.save();

    const result = {
      success: true,
      message: "Product cancelled successfully",
      data: {
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        totalAmount: order.totalAmount,
        productId: productId,
        productStatus: "Cancelled",
        reason: reason,
      },
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Cancel product error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling product",
    });
  }
};  



module.exports = {
  orderSuccess,
  cancelOrder,
  cancelProductOrder,
  verifyPayment,
  createReturnRequest,
  processReturnRequest,
};
