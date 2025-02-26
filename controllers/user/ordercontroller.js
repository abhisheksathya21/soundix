const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const crypto = require("crypto");

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
   
    const latestOrder = await Order.findOne({ userId: userId })
      .sort({ _id: -1 })
      .populate('items.productId'); 
      
    const userData = await User.findById(userId);
    console.log("latestOrder", latestOrder);
    res.render("order-success", { 
      orderData: latestOrder, 
      userData: userData 
    });
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
      internalOrderId,
    } = req.body;

    console.log("Verifying payment for order:", internalOrderId);

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    const order = await Order.findOne({ orderId: internalOrderId }).populate('items.productId');
    if (!order) {
      console.log("Order not found:", internalOrderId);
      return res.status(404).json({ success: false, error: "Order not found in verify payment" });
    }

    if (razorpay_signature !== expectedSign) {
      order.paymentStatus = "Failed";
      await order.save();
      console.log("Invalid signature for order:", internalOrderId);
      return res.status(400).json({ success: false, error: "Invalid payment signature", orderId: order.orderId });
    }

    // Successful payment
    order.paymentStatus = "Paid";
    order.paymentDetails = {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    };

    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const newStock = product.quantity - item.quantity;
        await Product.updateOne({ _id: item.productId }, { $set: { quantity: newStock } });
      }
    }

    await order.save();
    await Cart.updateOne({ user: order.userId }, { $set: { items: [] } });
    console.log("Payment verified successfully for order:", internalOrderId);

    res.status(200).json({ success: true, orderId: order.orderId, message: "Payment verified successfully" });
  } catch (error) {
    console.error("Payment verification error for order:", req.body.internalOrderId, error);
    res.status(500).json({ success: false, error: "Payment verification failed", details: error.message });
  }
};

const paymentDismissed = async (req, res) => {
  try {
    const { internalOrderId } = req.body;
    console.log("Payment dismissed for order:", internalOrderId);

    const order = await Order.findOne({ orderId: internalOrderId });
    if (!order) {
      console.log("Order not found:", internalOrderId);
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (order.paymentStatus === "Paid") {
      console.log("Payment already completed for order:", internalOrderId);
      return res.status(400).json({ success: false, error: "Payment already completed" });
    }

    order.paymentStatus = "Failed";
    await order.save();
    console.log("Payment status updated to Failed for order:", internalOrderId);

    res.status(200).json({ success: true, orderId: order.orderId, message: "Payment dismissed, status updated to Failed" });
  } catch (error) {
    console.error("Error updating payment status on dismiss for order:", req.body.internalOrderId, error);
    res.status(500).json({ success: false, error: "Failed to update payment status", details: error.message });
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

  
    if (
      productItem.status === "Returned" ||
      productItem.returnStatus === "Approved"
    ) {
      return res.status(400).json({
        success: false,
        message: "Product cannot be returned",
      });
    }

  
    order.returnRequests.push({
      productId: productItem.productId,
      reason: reason,
      status: "Pending",
      requestDate: new Date(),
    });

   
    productItem.status = "Return Requested";
    productItem.returnReason = reason;
    productItem.returnStatus = "Pending";


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
    const adminId = req.session.admin; 

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

      
      const product = await Product.findById(productId);
      if (product) {
        product.quantity += productItem.quantity;
        await product.save();
      }

      
      productItem.status = "Returned";
      productItem.returnStatus = "Approved";
      productItem.refundAmount = refundAmount;
      productItem.refundStatus = "Processed";
      returnRequest.status = "Approved";

      order.statusHistory.push({
        status: "Product Returned",
        comment: `Product ${productId} return approved and refunded`,
        date: new Date(),
      });
    } else {
     
      productItem.status = "Delivered";
      productItem.returnStatus = "Rejected";
      returnRequest.status = "Rejected";

    
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
    const { reason } = req.body; 
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

   
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }

      item.status = "Cancelled";
      item.cancelledAt = new Date();
      item.cancellationReason = reason; 
    }

    
    order.orderStatus = "Cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = reason;

   
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
    const { orderId, productId, reason } = req.body; 
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

   
    const product = await Product.findById(productId);
    if (product) {
      product.quantity += productItem.quantity;
      await product.save();
    }

    
    productItem.status = "Cancelled";
    productItem.cancelledAt = new Date();
    productItem.cancellationReason = reason;

    
    order.statusHistory.push({
      status: "Product Cancelled",
      comment: `Product ${
        product.name || productId
      } cancelled. Reason: ${reason}`,
      date: new Date(),
    });

   
    const activeItems = order.items.filter(
      (item) => item.status !== "Cancelled"
    );
    if (activeItems.length === 0) {
      order.orderStatus = "Cancelled";
      order.cancelledAt = new Date();
      order.cancellationReason = "All products cancelled";
    } else {
      
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
  paymentDismissed
};
