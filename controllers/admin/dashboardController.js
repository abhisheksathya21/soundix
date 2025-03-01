const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

const getDashboardData = async (req, res) => {
  try {
    const { filter = "monthly", startDate, endDate } = req.query;

    
    const dateFilter = buildDateFilter(filter, startDate, endDate);
    const orderFilter = { orderStatus: "Delivered", ...dateFilter };

    // 1. Sales Chart Data
    const salesAggregation = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: {
            $dateToString: {
              format:
                filter === "yearly" ? "%Y" : filter === "monthly" ? "%Y-%m" : "%Y-%m-%d",
              date: "$orderDate",
            },
          },
          totalSales: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const chartData = {
      labels: salesAggregation.map((item) => item._id),
      data: salesAggregation.map((item) => item.totalSales),
    };

    // 2. Top 10 Best-Selling Products
    const topProducts = await Order.aggregate([
      { $match: orderFilter },
      { $unwind: "$items" },
      { $match: { "items.status": { $nin: ["Cancelled", "Returned"] } } },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.productName",
          totalSold: 1,
          totalRevenue: 1,
        },
      },
    ]);

    // 3. Top 10 Best-Selling Categories
    const topCategories = await Order.aggregate([
      { $match: orderFilter },
      { $unwind: "$items" },
      { $match: { "items.status": { $nin: ["Cancelled", "Returned"] } } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          name: "$category.name",
          totalSold: 1,
          totalRevenue: 1,
        },
      },
    ]);

    res.json({
      chartData,
      topProducts,
      topCategories,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};


const buildDateFilter = (filter, startDate, endDate) => {
  let dateFilter = {};

  if (filter === "custom" && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end day

    if (isNaN(start) || isNaN(end) || end < start) {
      throw new Error("Invalid custom date range");
    }

    dateFilter = { orderDate: { $gte: start, $lte: end } };
  } else {
    const currentDate = new Date();
    let start, end;

    switch (filter) {
      case "yearly":
        start = new Date(currentDate.getFullYear(), 0, 1);
        end = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case "monthly":
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "weekly":
        start = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = new Date(0); // All time
        end = new Date();
    }

    dateFilter = { orderDate: { $gte: start, $lte: end } };
  }

  return dateFilter;
};

module.exports = { getDashboardData };