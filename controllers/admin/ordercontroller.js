const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");

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

    // Check if order is already cancelled or delivered
    if (
      order.orderStatus === "Cancelled" ||
      order.orderStatus === "Delivered"
    ) {
      return res.status(400).json({
        success: false,
        error: "Cannot modify cancelled or delivered orders",
      });
    }

    // Handle stock updates if order is being cancelled
    if (status === "Cancelled") {
      try {
        // Update stock for each product in the order
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId._id, {
            $inc: { stock: item.quantity },
          });
        }
      } catch (error) {
        console.error("Error updating product stock:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to update product stock",
        });
      }
    }

    // Update order status
    order.orderStatus = status;
    order.statusHistory.push({ status, updatedAt: new Date() });
    await order.save();

    // Transform the updated order to match frontend expectations
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

module.exports = {
  getAllOrders,
  updateOrderStatus,
};
