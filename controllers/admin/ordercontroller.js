const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const { generatePDF, generateExcel } = require("../../utils/reportGenerator");




const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find()
      .populate("userId", "fullname email")
      .populate("items.productId")
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit);

    const transformedOrders = orders.map((order) => ({
      ...order.toObject(),
      status: order.orderStatus,
      isCancellable:
        order.orderStatus !== "Cancelled" && order.orderStatus !== "Delivered",
    }));

    res.render("orders", {
      orders: transformedOrders,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).render("error", { message: "Failed to load orders" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status value",
      });
    }

    const order = await Order.findById(orderId)
      .populate("userId", "fullname email")
      .populate("items.productId");

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    if (
      order.orderStatus === "Cancelled" ||
      order.orderStatus === "Delivered"
    ) {
      return res.status(400).json({
        success: false,
        error: "Cannot modify cancelled or delivered orders",
      });
    }

    if (status === "Cancelled") {
      try {
        if (order.paymentMethod === "Razorpay") {
          let wallet = await Wallet.findOne({ userId: order.userId });

          if (!wallet) {
            wallet = new Wallet({ userId: order.userId });
          }

          // Add refund transaction
          await wallet.addTransaction({
            type: "Refund",
            amount: order.totalAmount,
            orderId: order._id,
            description: `Admin cancelled order ${order.orderId}`,
            status: "Completed",
          });
        }

        for (const item of order.items) {
          const product = await Product.findById(item.productId._id);
          if (product) {
            product.quantity += item.quantity;
            await product.save();
            console.log(
              `Updated quantity for product ${product.productName}: New quantity = ${product.quantity}`
            );
          }
        }

        order.orderStatus = status;
        await order.save();

        return res.status(200).json({
          success: true,
          message:
            "Order cancelled, stock updated, and refund processed successfully",
        });
      } catch (error) {
        console.error("Error processing cancellation:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to process cancellation",
        });
      }
    }

    // If order is being marked as "Delivered", update all non-cancelled items
    if (status === "Delivered") {
      order.items.forEach((item) => {
        if (item.status !== "Cancelled") {
          item.status = "Delivered";
        }
      });
    }

    order.orderStatus = status;
    order.statusHistory.push({ status, updatedAt: new Date() });

    await order.save();

    const transformedOrder = {
      ...order.toObject(),
      status: order.orderStatus,
      isCancellable: status !== "Cancelled" && status !== "Delivered",
    };

    res.json({
      success: true,
      order: transformedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update order status",
    });
  }
};

const cancelProductOrder = async (req, res) => {
  try {
    console.log("cancelproductOrder");
    const { orderId, productId } = req.body;
    console.log("orderid,productid", orderId, productId);

    const order = await Order.findOne({ _id: orderId });
    console.log("order", order);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
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

    if (order.paymentMethod === "Razorpay") {
      let wallet = await Wallet.findOne({ userId: order.userId });

      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = new Wallet({ userId: order.userId });
      }

      // Add refund transaction
      await wallet.addTransaction({
        type: "Refund",
        amount: refundAmount,
        orderId: order._id,
        description: `Admin cancelled product in order ${order.orderId}`,
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
      message: "Product cancelled and refund processed successfully",
    });
    console.log("product cancelled successfully");
  } catch (error) {
    console.error("Cancel product error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling product",
    });
  }
};

const getReturnRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const orders = await Order.find({
      "items.returnStatus": "Pending", // Only pending return requests
      "items.status": "Return Requested", // Ensures the product has a return request
      "items.returnReason": { $exists: true, $ne: "" }, // Must have a reason
    })
      .populate("userId", "fullname email")
      .populate("items.productId", "productName productImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const filteredOrders = orders
      .map((order) => {
        const filteredItems = order.items.filter(
          (item) =>
            item.returnStatus === "Pending" &&
            item.status === "Return Requested" && // Ensures it has a pending return request
            item.returnReason &&
            item.returnReason.trim() !== ""
        );

        if (filteredItems.length === 0) return null;

        return {
          ...order.toObject(),
          items: filteredItems,
        };
      })
      .filter((order) => order !== null);

    const totalRequests = await Order.countDocuments({
      "items.returnStatus": "Pending",
      "items.status": "Return Requested",
      "items.returnReason": { $exists: true, $ne: "" },
    });

    const totalPages = Math.ceil(totalRequests / limit);

    res.render("return-requests", {
      orders: filteredOrders,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
    });
  } catch (error) {
    console.error("Error fetching return requests:", error);
    res
      .status(500)
      .render("error", { message: "Failed to load return requests" });
  }
};




const processReturnRequest = async (req, res) => {
  try {
    console.log("Processing Return Request");
    const { orderId, productId, status, reason } = req.body;

    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("items.productId");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const productItem = order.items.find(
      (item) => item.productId._id.toString() === productId.toString()
    );

    if (!productItem) {
      return res.status(404).json({ success: false, message: "Product not found in the order" });
    }

    if (productItem.returnStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "No pending return request found for this product",
      });
    }

    if (status === "Approved") {
      const refundAmount = productItem.price * productItem.quantity;

      let wallet = await Wallet.findOne({ userId: order.userId._id });
      if (!wallet) {
        wallet = new Wallet({ userId: order.userId._id, transactions: [] });
      }

     
      await wallet.addTransaction({
        type: "Refund",
        amount: refundAmount,
        orderId: order._id,
        description: `Refund for returned product in order ${order.orderId}`,
        status: "Completed",
      });

     
      wallet.balance += refundAmount;
      await wallet.save();

   
      if (productItem.status !== "Cancelled") {
        const product = await Product.findById(productId);
        if (product) {
          product.quantity += productItem.quantity;
          await product.save();
        }
      }

      productItem.status = "Returned";
      productItem.returnStatus = "Approved";
      productItem.returnedAt = new Date();

      order.statusHistory.push({
        status: "Return Approved",
        comment: `Return request approved for product ${productItem.productId.productName}. Refund processed.`,
        date: new Date(),
      });
    } else {
      productItem.status = "Delivered";
      productItem.returnStatus = "Rejected";
      productItem.returnReason = reason;

      order.statusHistory.push({
        status: "Return Rejected",
        comment: `Return request rejected for product ${productItem.productId.productName}. Reason: ${reason}`,
        date: new Date(),
      });
    }

    const allItemsReturned = order.items.every((item) => item.returnStatus === "Approved");
    if (allItemsReturned) {
      order.orderStatus = "Returned";
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Return request ${status.toLowerCase()} successfully`,
      data: {
        orderId: order.orderId,
        productId,
        status: productItem.returnStatus,
      },
    });
  } catch (error) {
    console.error("Error processing return request:", error);
    res.status(500).json({ success: false, message: "Error processing return request" });
  }
};



const getSalesReport = async (req, res) => {
  try {
    const orders = await Order.find(
      {},
      "orderId orderDate totalAmount discountAmount"
    );

    const salesData = orders.map((order) => ({
      orderId: order.orderId,
      date: order.orderDate,
      amount: order.totalAmount,
      discount: order.discountAmount,
    }));

    res.json(salesData);
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ error: "Failed to fetch sales report" });
  }
};


const exportSalesReportPDF = async (req, res) => {
  try {
    const orders = await Order.find(
      {},
      "orderId orderDate totalAmount discountAmount"
    );
    const pdfBuffer = await generatePDF(orders);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="sales-report.pdf"',
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};


const exportSalesReportExcel = async (req, res) => {
  try {
    const orders = await Order.find(
      {},
      "orderId orderDate totalAmount discountAmount"
    );
    const excelBuffer = await generateExcel(orders);

    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sales-report.xlsx"',
    });
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ error: "Failed to generate Excel" });
  }
};



module.exports = {
  getAllOrders,
  updateOrderStatus,
  cancelProductOrder,
  processReturnRequest,
  getReturnRequests,
  exportSalesReportExcel,
  exportSalesReportPDF,
  getSalesReport,
};
