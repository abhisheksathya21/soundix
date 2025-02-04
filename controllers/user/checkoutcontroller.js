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
    const cartData = await Cart.findOne({ user: userId }).populate(
      "items.product"
    );
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
      availableCoupons: availableCoupons,
    });
  } catch (error) {
    console.error("Error loading checkout page:", error);
    res.redirect("/pageNotFound");
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, paymentMethod, cartItems, appliedCoupon } = req.body;

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
    if (appliedCoupon) {
      await Coupon.findByIdAndUpdate(appliedCoupon._id, {
        $inc: {
          usedCount: 1,
        },
        $push: {
          usersUsed: {
            user: req.session.user,
            count: 1,
          },
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
       
        const wallet = await Wallet.findOne({ userId });

        if (!wallet || wallet.balance < totalAmount) {
          return res.status(400).json({ error: "Insufficient wallet balance" });
        }

       
        await wallet.addTransaction({
          type: "Purchase",
          amount: totalAmount,
          orderId: orderId,
          description: `Payment for order ${orderId}`,
          status: "Completed",
        });

       
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

   
    if (paymentMethod === "RAZORPAY") {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(totalAmount * 100), // Explicit rounding
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
          payment_capture: 1,
        });

        return res.status(200).json({
          orderId: razorpayOrder.id,
          amount: Math.round(totalAmount * 100),
          currency: "INR",
          key_id: process.env.RAZORPAY_KEY_ID,
          orderData: {
            items: orderItems,
            shippingAddress,
            subTotal,
            shippingCost,
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

module.exports = {
  loadCheckout,
  placeOrder,
  validateCoupon,
};
