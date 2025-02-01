const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const crypto = require('crypto'); //


const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, paymentMethod } = req.body;

    console.log("Received payment method:", paymentMethod); 

    if (!userId) {
      return res.status(400).json({ error: "User is not logged in" });
    }

    const cartData = await Cart.findOne({ user: userId }).populate(
      "items.product"
    );

    if (!cartData || cartData.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    if (!addressId) {
      return res.status(400).json({ error: "Invalid or missing address ID" });
    }

    const addressDocument = await Address.findOne({ userId });
    if (!addressDocument) {
      return res.status(400).json({ error: "No addresses found for the user" });
    }

    const addressData = addressDocument.address.find(
      (addr) => addr._id.toString() === addressId
    );

    if (!addressData) {
      return res.status(400).json({ error: "Shipping address not found" });
    }

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

    const subTotal = cartData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const taxAmount = 0;
    const shippingCost = 0;
    const totalAmount = subTotal + shippingCost;

    const orderItems = cartData.items.map((item) => ({
      productId: item.product._id,
      quantity: item.quantity,
      price: item.price,
    }));

   
    for (const cartItem of cartData.items) {
      const product = cartItem.product;
      const newStock = product.quantity - cartItem.quantity;

      if (newStock < 0) {
        return res.status(400).json({
          error: `Insufficient stock for product: ${product.name}`,
        });
      }
    }
    if (paymentMethod === "WALLET") {
  try {
    // Get user's wallet
    const wallet = await Wallet.findOne({ userId });
    
    if (!wallet || wallet.balance < totalAmount) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    // Create wallet transaction
    await wallet.addTransaction({
      type: "Purchase",
      amount: totalAmount,
      orderId: orderId,
      description: `Payment for order ${orderId}`,
      status: "Completed"
    });

    // Create order with wallet payment
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newOrder = new Order({
      orderId,
      userId,
      items: orderItems,
      shippingAddress,
      subTotal,
      taxAmount,
      totalAmount,
      paymentMethod: "WALLET",
      orderStatus: "Pending",
      paymentStatus: "Paid",
    });

    await newOrder.save();
    await Cart.updateOne({ user: userId }, { $set: { items: [] } });

    return res.status(200).json({
      success: true,
      message: "Order placed successfully using wallet",
      orderId: newOrder.orderId,
    });
  } catch (error) {
    console.error("Wallet payment error:", error);
    return res.status(500).json({ error: "Wallet payment failed" });
  }
}

    // Handle Razorpay payment
    if (paymentMethod === "RAZORPAY") {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: totalAmount * 100, // Convert to paise
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
          payment_capture: 1,
        });

        return res.status(200).json({
          orderId: razorpayOrder.id,
          amount: totalAmount * 100,
          currency: "INR",
          key_id: process.env.RAZORPAY_KEY_ID,
          orderData: {
            items: orderItems,
            shippingAddress,
            subTotal,
            taxAmount,
            totalAmount,
            userId,
          },
        });
      } catch (error) {
        console.error("Razorpay order creation failed:", error);
        return res
          .status(500)
          .json({ error: "Failed to create payment order" });
      }
    }

    // For COD, proceed with order creation
    if (paymentMethod === "COD") {
      // Update stock
      for (const cartItem of cartData.items) {
        const product = cartItem.product;
        const newStock = product.quantity - cartItem.quantity;
        await Product.updateOne(
          { _id: product._id },
          { $set: { quantity: newStock } }
        );
      }

      const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newOrder = new Order({
        orderId,
        userId,
        items: orderItems,
        shippingAddress,
        subTotal,
        taxAmount,
        totalAmount,
        paymentMethod: "COD",
        orderStatus: "Pending",
        paymentStatus: "Pending",
      });

      await newOrder.save();
      await Cart.updateOne({ user: userId }, { $set: { items: [] } });

      return res.status(200).json({
        success: true,
        message: "Order placed successfully",
        orderId: newOrder.orderId,
      });
    }

    
    return res.status(400).json({ error: "Invalid payment method" });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};




const orderSuccess = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/login");
    }
    const OrderData = await Order.find({ userId: userId });

    res.render("order-success", { orderData: OrderData });
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

    // Verify signature
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

    // Get address
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



const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.user;

    const order = await Order.findOne({ orderId: orderId, userId: userId });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    if (
      order.orderStatus === "Shipped" ||
      order.orderStatus === "Delivered" ||
      order.orderStatus === "Cancelled"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Order cannot be cancelled" });
    }
    // In cancelOrder function, add wallet refund
    if (
      order.paymentMethod === "WALLET" ||
      order.paymentMethod === "RAZORPAY"
    ) {
      const wallet = await Wallet.findOne({ userId });
      await wallet.addTransaction({
        type: "Refund",
        amount: order.totalAmount,
        orderId: order._id,
        description: `Refund for order ${order.orderId}`,
        status: "Completed",
      });
    }

    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.quantity += item.quantity;
        await product.save();

        item.status = "Cancelled";
        item.cancelledAt = new Date();
      } else {
        console.error(
          `Product with ID ${item.productId} not found in inventory`
        );
      }
    }

    order.orderStatus = "Cancelled";
    order.cancelledAt = new Date();
    await order.save();

    res
      .status(200)
      .json({ success: true, message: "order cancelled successfully" });
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
    const { orderId, productId } = req.body;
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

    
    const product = await Product.findById(productId);
    if (product) {
      product.quantity += productItem.quantity;
      await product.save();
    }

   
    productItem.status = "Cancelled";
    productItem.cancelledAt = new Date();

   
    const activeItems = order.items.filter(
      (item) => item.status !== "Cancelled"
    );
    if (activeItems.length === 0) {
      order.orderStatus = "Cancelled";
      order.cancelledAt = new Date();
    } else {
      order.totalAmount = activeItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Product cancelled successfully",
    });
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
  placeOrder,
  cancelOrder,
  cancelProductOrder,
  verifyPayment,
};
