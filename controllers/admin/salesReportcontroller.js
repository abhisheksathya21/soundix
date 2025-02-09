const Order = require("../../models/orderSchema");
const { generatePDF, generateExcel } = require("../../utils/reportGenerator");

const getSalesReport = async (req, res) => {
  try {
    res.render("sales-report");
  } catch (error) {
    console.error("Error loading sales report:", error);
    res.status(500).json({ error: "Failed to load sales report" });
  }
};


const buildDateFilter = (startDate, endDate, dateRange) => {
  let filter = { orderStatus: { $ne: "Cancelled" } };

  if (dateRange && dateRange !== "custom") {
    const currentDate = new Date();

    switch (dateRange) {
      case "this-month":
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        endDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        break;

      case "last-month":
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          1
        );
        endDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          0,
          23,
          59,
          59,
          999
        );
        break;

      case "this-year":
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        endDate = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
    }
  } else if (startDate && endDate) {
    startDate = new Date(startDate);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(endDate);
    endDate.setHours(23, 59, 59, 999);
  }

  if (
    startDate &&
    endDate &&
    startDate instanceof Date &&
    endDate instanceof Date &&
    !isNaN(startDate) &&
    !isNaN(endDate)
  ) {
    filter.orderDate = {
      $gte: startDate,
      $lte: endDate,
    };
  }

  return filter;
};

const getSalesReportData = async (req, res) => {
  try {
    console.log("Query parameters received:", req.query);
    const { startDate, endDate, dateRange } = req.query;

    // Combine date filter with delivered status filter
    const dateFilter = buildDateFilter(startDate, endDate, dateRange);
    const filter = {
      ...dateFilter,
      orderStatus: "Delivered", // Only include delivered orders
    };

    console.log("Final MongoDB filter:", filter);

    const orders = await Order.find(filter)
      .select(
        "orderId orderDate subTotal discountAmount paymentMethod orderStatus"
      )
      .lean();

    console.log(`Found ${orders.length} delivered orders`);

    const totalOrders = orders.length;
    const grossSales = orders.reduce(
      (sum, order) => sum + (order.subTotal || 0),
      0
    );
    const totalDiscounts = orders.reduce(
      (sum, order) => sum + (order.discountAmount || 0),
      0
    );
    const netRevenue = grossSales - totalDiscounts;

    const response = {
      totalOrders,
      grossSales,
      totalDiscounts,
      netRevenue,
      orders: orders.map((order) => ({
        orderId: order.orderId,
        orderDate: order.orderDate,
        subTotal: order.subTotal,
        discountAmount: order.discountAmount || 0,
        finalAmount: order.subTotal - (order.discountAmount || 0),
        paymentMethod: order.paymentMethod,
        status: order.orderStatus,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Error in getSalesReportData:", error);
    res.status(500).json({
      error: "Failed to fetch sales report data",
      details: error.message,
    });
  }
};

const exportSalesReportPDF = async (req, res) => {
  try {
    const { startDate, endDate, dateRange } = req.query;
    const filter = buildDateFilter(startDate, endDate, dateRange);

    const orders = await Order.find(filter)
      .select(
        "orderId orderDate subTotal discountAmount totalAmount paymentMethod orderStatus"
      )
      .lean();

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
    const { startDate, endDate, dateRange } = req.query;
    const filter = buildDateFilter(startDate, endDate, dateRange);

    const orders = await Order.find(filter)
      .select(
        "orderId orderDate subTotal discountAmount totalAmount paymentMethod orderStatus"
      )
      .lean();

    console.log("Exporting orders to Excel:", orders.length);
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
  getSalesReport,
  getSalesReportData,
  exportSalesReportPDF,
  exportSalesReportExcel,
};
