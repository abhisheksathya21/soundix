const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

const getDashboardData = async (req, res) => {
  try {
    const { filter = "monthly", startDate, endDate } = req.query;

    const dateFilter = buildDateFilter(filter, startDate, endDate);
    const orderFilter = { orderStatus: "Delivered", ...dateFilter };

  
    const summaryAggregation = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const summary = summaryAggregation[0] || { totalSales: 0, totalOrders: 0 };
    summary.avgOrderValue = summary.totalOrders > 0 ? summary.totalSales / summary.totalOrders : 0;

    let periodDescription = getPeriodDescription(filter, dateFilter, startDate, endDate);


    const salesAggregation = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: filter === "yearly" ? "%Y" : filter === "monthly" ? "%Y-%m" : "%Y-%m-%d",
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

    // 4. Top 10 Best-Selling Products
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
      summary: {
        totalSales: summary.totalSales,
        totalOrders: summary.totalOrders,
        avgOrderValue: summary.avgOrderValue,
      },
      periodDescription,
      chartData,
      topProducts,
      topCategories,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};


const getPeriodDescription = (filter, dateFilter, startDate, endDate) => {
  const currentDate = new Date();
  let description;

  if (filter === "custom" && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `Custom Range: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
  }

  switch (filter) {
    case "yearly":
      description = `All Years`;
      break;
    case "monthly":
      const year = currentDate.getFullYear();
      description = `All Months in ${year}`;
      break;
    case "weekly":
      const start = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      description = `Week of ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
      break;
    default:
      description = "All Time";
  }

  return description;
};

const buildDateFilter = (filter, startDate, endDate) => {
  let dateFilter = {};

  if (filter === "custom" && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (isNaN(start) || isNaN(end) || end < start) {
      throw new Error("Invalid custom date range");
    }
    dateFilter = { orderDate: { $gte: start, $lte: end } };
  } else {
    const currentDate = new Date();
    let start, end;

    switch (filter) {
      case "yearly":
        dateFilter = {};
        break;
      case "monthly":
        start = new Date(currentDate.getFullYear(), 0, 1);
        end = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        dateFilter = { orderDate: { $gte: start, $lte: end } };
        break;
      case "weekly":
        start = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        dateFilter = { orderDate: { $gte: start, $lte: end } };
        break;
      default:
        start = new Date(0);
        end = new Date();
        dateFilter = { orderDate: { $gte: start, $lte: end } };
    }
  }

  return dateFilter;
};

module.exports = { getDashboardData };