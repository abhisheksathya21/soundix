const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "fullname email") // Populate user details
      .populate("items.productId") // Populate product details
      .sort({ orderDate: -1 }); // Sort by newest first

    res.render("orders", { orders });
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
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        orderStatus: status,
        $push: {
          statusHistory: { status, updatedAt: new Date() },
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true, updatedOrder });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
};

module.exports = {
  getAllOrders,
  updateOrderStatus,
};
