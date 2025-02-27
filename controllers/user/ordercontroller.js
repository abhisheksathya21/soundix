const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

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
      comment: `Product ${product.name || productId} cancelled. Reason: ${reason}`,
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

const getOrderForInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user;

    const order = await Order.findOne({ orderId, userId })
      .populate('items.productId')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        id: order.orderId,
        date: new Date(order.orderDate).toLocaleDateString(),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        shippingMethod: order.shippingMethod,
        total: order.totalAmount,
        products: order.items.map(item => ({
          productId: item.productId._id,
          name: item.productId.name,
          quantity: item.quantity,
          price: item.price,
          image: item.productId.images[0],
          status: item.status
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching order for invoice:", error);
    res.status(500).json({ success: false, message: "Error fetching order data" });
  }
};
const generateInvoicePDF = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user;

    // Fetch order with populated productId, category, and user
    const order = await Order.findOne({ orderId, userId })
      .populate({
        path: 'items.productId',
        populate: { path: 'category' }
      })
      .populate('userId') // Populate user for customer details
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
  

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderId}.pdf`);
    doc.pipe(res);

    // 1. Header with Logo and Company Name
    const logoPath = path.join(__dirname, '../../public/assets/img/beat-logo-161616.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 40, { width: 50 }); // Logo size as per your current setting
    } else {
      doc.fontSize(20).font('Helvetica-Bold').text('Beats Zone', 50, 40);
    }
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Beats Zone', 160, 50)
       .fontSize(16)
       .text('Invoice', 160, 75);

    // 2. Customer Details
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Customer Details', 50, 110);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Customer Name: ${order.userId.fullname || 'N/A'}`, 50, 130)
       .text(`Email: ${order.userId.email || 'N/A'}`, 50, 145)
       .text(`Phone: ${order.userId.phone || order.shippingAddress.phoneNumber || 'N/A'}`, 50, 160);

    // Shipping Address
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Shipping Address', 300, 110);
    doc.fontSize(10)
       .font('Helvetica')
       .text(order.shippingAddress.name || 'N/A', 300, 130)
       .text(order.shippingAddress.street || 'N/A', 300, 145)
       .text(`${order.shippingAddress.city || 'N/A'}, ${order.shippingAddress.state || 'N/A'}`, 300, 160)
       .text(`${order.shippingAddress.pinCode || 'N/A'}, ${order.shippingAddress.country || 'N/A'}`, 300, 175);

    // Line separator
    doc.moveTo(50, 200).lineTo(550, 200).stroke(); // Adjusted position for more space

    // 3. Invoice Details
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Invoice Details', 50, 220);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Invoice Number: ${order.orderId}`, 50, 240)
       .text(`Invoice Date: ${new Date(order.orderDate).toLocaleDateString()}`, 50, 255)
       .text(`Order Number: ${order.orderId}`, 50, 270) // Assuming orderId is the order number
       .text(`Payment Method: ${order.paymentMethod || 'N/A'}`, 50, 285);

    // 4. Product Details Table (Improved alignment)
    const tableTop = 310; // Adjusted to provide more space
    doc.font('Helvetica-Bold')
       .fontSize(11)
       .text('Item Name', 50, tableTop, { width: 150 })
       .text('Category', 200, tableTop, { width: 100 })
       .text('Qty', 300, tableTop, { width: 50, align: 'center' })
       .text('Unit Price', 350, tableTop, { width: 80, align: 'right' })
       .text('Subtotal', 430, tableTop, { width: 60, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let yPos = tableTop + 25;
    order.items.forEach(item => {
      if (item.status !== 'Cancelled') {
        const productName = item.productId?.productName || 'N/A';
        const categoryName = item.productId?.category?.name || 'N/A';
        const subtotal = (item.price || 0) * (item.quantity || 0);
        doc.font('Helvetica')
           .fontSize(10)
           .text(productName, 50, yPos, { width: 150 })
           .text(categoryName, 200, yPos, { width: 100 })
           .text(item.quantity || 0, 300, yPos, { width: 50, align: 'center' })
           .text(`${(item.price || 0).toFixed(2)}`, 350, yPos, { width: 80, align: 'right' })
           .text(`${subtotal.toFixed(2)}`, 430, yPos, { width: 60, align: 'right' });
        yPos += 20;
      }
    });

    // Line separator after items
    doc.moveTo(50, yPos + 15).lineTo(550, yPos + 15).stroke(); // Increased spacing

    // 5. Taxes & Discounts
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Taxes & Discounts', 50, yPos + 30); // Increased spacing
    yPos += 50; // More space before details
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Subtotal (Before Tax & Discount): ₹${(order.subTotal || 0).toFixed(2)}`, 50, yPos, { align: 'left' });
    yPos += 15;
    doc.text(`Tax Amount: ${(order.taxAmount || 0).toFixed(2)}`, 50, yPos, { align: 'left' });
    yPos += 15;
    doc.text(`Discount Applied: ${(order.discountAmount || 0).toFixed(2)}`, 50, yPos, { align: 'left' });
    yPos += 15;
    if (order.coupon?.code) {
      doc.text(`Coupon Code: ${order.coupon.code} (${order.coupon.discountType === 'percentage' ? `${order.coupon.discountAmount}%` : `₹${order.coupon.discountAmount}`})`, 50, yPos, { align: 'left' });
      yPos += 15;
    }
    doc.text(`Offer Discount: ${(order.offerDiscount || 0).toFixed(2)}`, 50, yPos, { align: 'left' });

    // 6. Shipping Details
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Shipping Details', 300, yPos - 60); // Adjusted position for alignment
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Shipping Method: ${order.shippingAddress.addressType || 'N/A'}`, 300, yPos - 45, { align: 'left' })
       .text(`Shipping Charges: ₹0.00`, 300, yPos - 30, { align: 'left' }) // No explicit field; adjust if available
       .text(`Tracking Number: N/A`, 300, yPos - 15, { align: 'left' }); // Add field if needed

    // 7. Total Amount (Moved below Shipping Details and Payment Status)
    yPos += 50; // Increased spacing to avoid overlap with previous sections
    doc.moveTo(400, yPos - 10).lineTo(550, yPos - 10).stroke();
    const grandTotal = order.totalAmount || 0;
    doc.font('Helvetica-Bold')
       .fontSize(14) // Increased for emphasis
       .text('Grand Total:', 300, yPos, { align: 'right' });
    doc.text(`${grandTotal.toFixed(2)}`, 500, yPos + 30, { align: 'right' }); // Added 10 points of vertical space
    // 8. Payment Status
    yPos += 30; // Increased spacing
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Payment Status', 50, yPos);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Status: ${order.paymentStatus || 'N/A'}`, 50, yPos + 15, { align: 'left' });
    if (order.paymentDetails?.razorpayPaymentId) {
      doc.text(`Transaction ID: ${order.paymentDetails.razorpayPaymentId}`, 50, yPos + 30, { align: 'left' });
      yPos += 15;
    }

    // Footer
    yPos += 50; // More spacing before footer
    doc.fontSize(10)
       .font('Helvetica')
       .text('Thank you for shopping with Beats Zone!', 300, yPos, { align: 'center' })
       .text('Contact us: support@beats_zone.com | +91-920-779-3404', 300, yPos + 15, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).send(`Failed to generate invoice: ${error.message}`);
  }
};

// Include with your existing exports
module.exports = {
  orderSuccess,
  cancelOrder,
  cancelProductOrder,
  verifyPayment,
  createReturnRequest,
  processReturnRequest,
  paymentDismissed,
  getOrderForInvoice,
  generateInvoicePDF
};