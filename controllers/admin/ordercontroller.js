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
         message: "Order cancelled and stock updated successfully",
       });
     } catch (error) {
       console.error("Error updating product stock:", error);
       return res.status(500).json({
         success: false,
         error: "Failed to update product stock",
       });
     }
   }

   
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


const cancelProductOrder = async (req, res) => {

  try {
    console.log("cancelproductOrder");
    const { orderId, productId } = req.body;
    console.log("orderid,productid", orderId, productId);
    const order = await Order.findOne({ _id:orderId });
    console.log("order",order);
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
    console.log("product cancelled successfully");
  } catch (error) {
    console.error("Cancel product error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling product",
    });
  }
};
module.exports = {
  getAllOrders,
  updateOrderStatus,
  cancelProductOrder,
};
