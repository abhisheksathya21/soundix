const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const Coupon = require("../../models/couponSchema");
const crypto = require("crypto"); //

const Razorpay = require("razorpay");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const validateCoupon = async (req, res) => {
  try {
    const { couponCode, totalAmount } = req.body;
    const userId = req.session.user;

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() },
    });

    if (!coupon) {
      return res.json({ valid: false, message: "Invalid or expired coupon" });
    }

    if (totalAmount < coupon.minPurchaseAmount) {
      return res.json({
        valid: false,
        message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required`,
      });
    }

    const userUsage = coupon.usersUsed.find(
      (u) => u.user.toString() === userId
    );
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.json({
        valid: false,
        message: "Coupon has reached its usage limit",
      });
    }

    if (userUsage && userUsage.count >= coupon.perUserLimit) {
      return res.json({
        valid: false,
        message: "You have already used this coupon",
      });
    }

    let discountAmount = (totalAmount * coupon.discountValue) / 100;

    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }

    res.json({
      valid: true,
      coupon: coupon,
      discountAmount: Math.round(discountAmount),
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    res.status(500).json({ valid: false, message: "Error validating coupon" });
  }
};

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    const cartData = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      populate: { path: "category" },
    });

    if (!cartData || !cartData.items.length) {
      return res.render("checkout", {
        user: null,
        cart: null,
        Address: null,
        availableCoupons: [],
        error: "Your cart is empty",
      });
    }

    const unavailableItems = [];
    let totalAmount = 0;

    for (let i = 0; i < cartData.items.length; i++) {
      const item = cartData.items[i];
      const product = item.product;

      if (!product) {
        unavailableItems.push({
          productId: item.product._id,
          reason: "Product not found",
        });
        continue;
      }

      if (product.isBlocked) {
        unavailableItems.push({
          productId: item.product._id,
          reason: "Product is unavailable",
        });
        continue;
      }

      if (product.category && !product.category.isListed) {
        unavailableItems.push({
          productId: item.product._id,
          reason: "Category is unavailable",
        });
        continue;
      }

      if (item.quantity > product.quantity) {
        unavailableItems.push({
          productId: item.product._id,
          reason: `Insufficient stock. Only ${product.quantity} left`,
        });
        continue;
      }

      const categoryOffer = product.category?.offer || null;
      const productOffer = product.offer || null;
      let bestOffer = null;

      if (
        categoryOffer?.discountPercentage &&
        productOffer?.discountPercentage
      ) {
        bestOffer =
          categoryOffer.discountPercentage > productOffer.discountPercentage
            ? categoryOffer
            : productOffer;
      } else {
        bestOffer = categoryOffer || productOffer;
      }

      let finalPrice = product.salePrice;
      if (bestOffer) {
        finalPrice =
          product.salePrice -
          (product.salePrice * bestOffer.discountPercentage) / 100;
      }

      item.price = finalPrice;
      totalAmount += finalPrice * item.quantity;
    }

    if (unavailableItems.length > 0) {
      cartData.items = cartData.items.filter(
        (item) =>
          !unavailableItems.some(
            (u) => u.productId.toString() === item.product._id.toString()
          )
      );
      await cartData.save();
    }

    cartData.totalAmount = totalAmount;
    await cartData.save();

    if (cartData.items.length === 0) {
      return res.render("checkout", {
        user: null,
        cart: null,
        Address: null,
        availableCoupons: [],
        error: "No available items in your cart for checkout",
      });
    }

    // Fetch additional data
    const AddressData = await Address.findOne({ userId: userId });
    const userData = await User.findById(userId);
    const availableCoupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() },
      minPurchaseAmount: { $lte: cartData.totalAmount },
    });

    res.render("checkout", {
      user: userData,
      cart: cartData,
      Address: AddressData,
      availableCoupons,
      unavailableItems: unavailableItems.length > 0 ? unavailableItems : null,
    });
  } catch (error) {
    console.error("Error loading checkout page:", error);
    res.redirect("/pageNotFound");
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      addressId,
      paymentMethod,
      cartItems,
      appliedCoupon,
      discountAmount,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User is not logged in" });
    }

    const cartData = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      populate: { path: "category" },
    });

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

    const unavailableItems = [];
    let totalAmount = 0;

    for (const item of cartData.items) {
      const product = item.product;

      if (!product) {
        unavailableItems.push({
          productId: item.product._id,
          reason: "Product not found",
        });
        continue;
      }

      if (product.isBlocked) {
        unavailableItems.push({
          productId: item.product._id,
          reason: "Product is unavailable",
        });
        continue;
      }

      if (product.category && !product.category.isListed) {
        unavailableItems.push({
          productId: item.product._id,
          reason: "Category is unavailable",
        });
        continue;
      }

      if (item.quantity > product.quantity) {
        unavailableItems.push({
          productId: item.product._id,
          reason: `Insufficient stock. Only ${product.quantity} left`,
        });
        continue;
      }

      const categoryOffer = product.category?.offer || null;
      const productOffer = product.offer || null;
      let bestOffer = null;
      if (
        categoryOffer?.discountPercentage &&
        productOffer?.discountPercentage
      ) {
        bestOffer =
          categoryOffer.discountPercentage > productOffer.discountPercentage
            ? categoryOffer
            : productOffer;
      } else {
        bestOffer = categoryOffer || productOffer;
      }

      let finalPrice = product.salePrice;
      if (bestOffer) {
        finalPrice =
          product.salePrice -
          (product.salePrice * bestOffer.discountPercentage) / 100;
      }

      item.price = finalPrice;
      totalAmount += finalPrice * item.quantity;
    }

    if (unavailableItems.length > 0) {
      return res.status(400).json({
        error: "Some items in your cart are unavailable",
        unavailableItems,
      });
    }

    if (appliedCoupon) {
      await Coupon.findByIdAndUpdate(appliedCoupon._id, {
        $inc: { usedCount: 1 },
        $push: {
          usersUsed: { user: userId, count: 1 },
        },
      });
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

    const subTotal = totalAmount;
    const taxAmount = 0;
    const shippingCost = 0;
    const finalTotal = subTotal - (discountAmount || 0) + shippingCost;

    const orderItems = cartData.items.map((item) => ({
      productId: item.product._id,
      quantity: item.quantity,
      price: item.price,
    }));

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (paymentMethod === "RAZORPAY") {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(finalTotal * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1,
      });

      const newOrder = new Order({
        orderId,
        userId,
        items: orderItems,
        shippingAddress,
        subTotal,
        taxAmount,
        totalAmount: finalTotal,
        discountAmount,
        paymentMethod: "Razorpay",
        paymentStatus: "Pending",
        orderStatus: "Pending",
        paymentDetails: { razorpayOrderId: razorpayOrder.id },
      });

      await newOrder.save();
      return res.status(200).json({
        success: true,
        orderId: razorpayOrder.id,
        amount: Math.round(finalTotal * 100),
        currency: "INR",
        key_id: process.env.RAZORPAY_KEY_ID,
        internalOrderId: newOrder.orderId,
      });
    }

    if (paymentMethod === "COD") {
      if (finalTotal >= 5000) {
        return res.status(400).json({
          error:
            "Cash on Delivery is not available for orders above ₹5000. Please choose another payment method.",
        });
      }

      for (const cartItem of cartData.items) {
        const product = cartItem.product;
        const newStock = product.quantity - cartItem.quantity;
        await Product.updateOne(
          { _id: product._id },
          { $set: { quantity: newStock } }
        );
      }

      const newOrder = new Order({
        orderId,
        userId,
        items: orderItems,
        shippingAddress,
        subTotal,
        taxAmount,
        totalAmount: finalTotal,
        discountAmount,
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

    if (paymentMethod === "WALLET") {
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = await new Wallet({ userId }).save();
      }

      if (wallet.balance < finalTotal) {
        return res.status(400).json({ error: "Insufficient wallet balance" });
      }

      const newOrder = new Order({
        orderId,
        userId,
        items: orderItems,
        shippingAddress,
        subTotal,
        taxAmount,
        totalAmount: finalTotal,
        discountAmount,
        paymentMethod: "WALLET",
        orderStatus: "Pending",
        paymentStatus: "Paid",
      });

      await newOrder.save();

      // Use the Order's _id (ObjectId) instead of the custom orderId string
      await wallet.addTransaction({
        type: "Purchase",
        amount: finalTotal,
        orderId: newOrder._id, // Pass the ObjectId here
        description: `Payment for order ${orderId}`,
        status: "Completed",
      });

      for (const cartItem of cartData.items) {
        const product = cartItem.product;
        const newStock = product.quantity - cartItem.quantity;
        await Product.updateOne(
          { _id: product._id },
          { $set: { quantity: newStock } }
        );
      }

      await Cart.updateOne({ user: userId }, { $set: { items: [] } });

      return res.status(200).json({
        success: true,
        message: "Order placed successfully using wallet",
        orderId: newOrder.orderId,
      });
    }

    return res.status(400).json({ error: "Invalid payment method" });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.body; // Internal orderId
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({ error: "Payment already completed" });
    }

    if (order.paymentMethod !== "Razorpay") {
      return res
        .status(400)
        .json({ error: "Retry only applicable for Razorpay payments" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    order.paymentDetails.razorpayOrderId = razorpayOrder.id;
    order.paymentStatus = "Pending"; // Reset to Pending for retry
    await order.save();

    res.status(200).json({
      orderId: razorpayOrder.id,
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID,
      internalOrderId: order.orderId,
    });
  } catch (error) {
    console.error("Error retrying payment:", error);
    res.status(500).json({ error: "Failed to initiate payment retry" });
  }
};

module.exports = {
  loadCheckout,
  placeOrder,
  validateCoupon,
  retryPayment,
};
