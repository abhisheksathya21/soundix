const Order = require("../../models/orderSchema");


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
    
    const { startDate, endDate, dateRange } = req.query;

    
    const dateFilter = buildDateFilter(startDate, endDate, dateRange);
    const filter = {
      ...dateFilter,
      orderStatus: "Delivered", 
    };

    

    const orders = await Order.find(filter)
    .sort({ _id: -1 })
      .select(
        "orderId orderDate subTotal discountAmount paymentMethod orderStatus"
      )
      .lean();

  

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

const PDFDocument = require("pdfkit");
const exportSalesReportPDF = async (req, res) => {
  try {
    const { startDate, endDate, dateRange } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate, dateRange);
    
    const filter = {
      ...dateFilter,
      orderStatus: "Delivered",
    };

    const orders = await Order.find(filter)
      .select("orderId orderDate subTotal discountAmount totalAmount paymentMethod orderStatus")
      .lean();

    
    const totalOrders = orders.length;
    const grossSales = orders.reduce((sum, order) => sum + (order.subTotal || 0), 0);
    const totalDiscounts = orders.reduce((sum, order) => sum + (order.discountAmount || 0), 0);
    const netRevenue = grossSales - totalDiscounts;
    const avgOrderValue = totalOrders > 0 ? netRevenue / totalOrders : 0;

   
    const paymentMethods = {};
    orders.forEach((order) => {
      const method = order.paymentMethod || "Unknown";
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, amount: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].amount += order.totalAmount || 0;
    });

   
    const start = startDate ? new Date(startDate) : new Date(dateFilter.orderDate.$gte);
    const end = endDate ? new Date(endDate) : new Date(dateFilter.orderDate.$lte);
    const periodText = `${start.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}`;

   
    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      layout: "portrait",
    });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sales-report-${startDate || dateRange}-to-${endDate || dateRange}.pdf"`,
      });
      res.send(pdfBuffer);
    });

    // Summary Section
    doc.font("Helvetica-Bold").fontSize(18).text("Sales Report", { align: "center" });
    doc.fontSize(12).text(`Period: ${periodText}`, { align: "center" });
    doc.moveDown(1);

    doc.fontSize(14).text("Summary", { underline: true });
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(10);
    doc.text(`Total Orders: ${totalOrders}`);
    doc.text(`Gross Sales: Rs.${grossSales.toFixed(2)}`);
    doc.text(`Total Discounts: Rs.${totalDiscounts.toFixed(2)}`);
    doc.text(`Net Revenue: Rs.${netRevenue.toFixed(2)}`);
    doc.text(`Average Order Value: Rs.${avgOrderValue.toFixed(2)}`);
    doc.moveDown(0.5);

    doc.text("Payment Methods:");
    for (const [method, data] of Object.entries(paymentMethods)) {
      doc.text(`- ${method}: ${data.count} orders (Rs.${data.amount.toFixed(2)})`);
    }

   
    doc.moveDown(2);
    doc.fontSize(14).text("Detailed Sales Data", { underline: true });
    doc.moveDown(1);

    const columns = [
      { name: "Order ID", x: 40, width: 80 },
      { name: "Date", x: 120, width: 70 },
      { name: "Subtotal", x: 190, width: 70 },
      { name: "Discount", x: 260, width: 70 },
      { name: "Final Amount", x: 330, width: 80 },
      { name: "Payment", x: 410, width: 70 },
      { name: "Status", x: 480, width: 75 },
    ];

    let yPosition = doc.y + 10;
    const rowHeight = 20;
    const rowSpacing = 5; // Add 5 points of space between rows

    
    doc.rect(40, yPosition - 5, 515, rowHeight).fill("#DDDDDD").stroke();
    doc.fillColor("black").fontSize(10);
    columns.forEach((col) => {
      doc.text(col.name, col.x, yPosition, { width: col.width, align: "left" });
    });
    doc.moveDown(0.5).strokeColor("#cccccc").lineWidth(0.5)
      .moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    yPosition = doc.y + 5;

    // Table Content
    doc.font("Helvetica").fontSize(9);
    orders.forEach((order, index) => {
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }

      if (index % 2 === 0) {
        doc.rect(40, yPosition - 5, 515, rowHeight).fill("#F3F3F3").stroke();
        doc.fillColor("black");
      }

      const values = [
        order.orderId || "N/A",
        order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A",
        `Rs.${Number(order.subTotal || 0).toFixed(2)}`,
        `Rs.${Number(order.discountAmount || 0).toFixed(2)}`,
        `Rs.${Number(order.totalAmount || 0).toFixed(2)}`,
        order.paymentMethod || "N/A",
        order.orderStatus || "N/A",
      ];

      columns.forEach((col, idx) => {
        doc.text(values[idx], col.x, yPosition, { width: col.width, align: "left" });
      });

      // Add spacing after each row
      yPosition += rowHeight + rowSpacing;
    });

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};
const ExcelJS = require("exceljs");
const exportSalesReportExcel = async (req, res) => {
  try {
    const { startDate, endDate, dateRange } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate, dateRange);
    
    const filter = {
      ...dateFilter,
      orderStatus: "Delivered",
    };

    const orders = await Order.find(filter)
      .select("orderId orderDate subTotal discountAmount totalAmount paymentMethod orderStatus")
      .lean();

    
    const totalOrders = orders.length;
    const grossSales = orders.reduce((sum, order) => sum + (order.subTotal || 0), 0);
    const totalDiscounts = orders.reduce((sum, order) => sum + (order.discountAmount || 0), 0);
    const netRevenue = grossSales - totalDiscounts;
    const avgOrderValue = totalOrders > 0 ? netRevenue / totalOrders : 0;

    
    const paymentMethods = {};
    orders.forEach((order) => {
      const method = order.paymentMethod || "Unknown";
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, amount: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].amount += order.totalAmount || 0;
    });

    
    const start = startDate ? new Date(startDate) : new Date(dateFilter.orderDate.$gte);
    const end = endDate ? new Date(endDate) : new Date(dateFilter.orderDate.$lte);
    const periodText = `${start.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}`;

    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report", {
      properties: { tabColor: { argb: "FF00FF00" } },
    });

    
    worksheet.mergeCells("A1:H1");
    worksheet.getCell("A1").value = "Sales Report";
    worksheet.getCell("A1").font = { bold: true, size: 16 };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:H2");
    worksheet.getCell("A2").value = `Period: ${periodText}`;
    worksheet.getCell("A2").font = { size: 12 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    worksheet.addRow(["Summary"]).font = { bold: true, size: 14, underline: true };
    worksheet.addRow(["Total Orders", totalOrders]);
    worksheet.addRow(["Gross Sales", `₹${grossSales.toFixed(2)}`]);
    worksheet.addRow(["Total Discounts", `₹${totalDiscounts.toFixed(2)}`]);
    worksheet.addRow(["Net Revenue", `₹${netRevenue.toFixed(2)}`]);
    worksheet.addRow(["Average Order Value", `₹${avgOrderValue.toFixed(2)}`]);
    worksheet.addRow(["Payment Methods", ""]);

    let rowIndex = 8; 
    for (const [method, data] of Object.entries(paymentMethods)) {
      worksheet.addRow([`- ${method}`, `${data.count} orders (₹${data.amount.toFixed(2)})`]);
      rowIndex++;
    }

  
    worksheet.getRow(3).font = { bold: true };
    for (let i = 4; i <= rowIndex; i++) {
      worksheet.getRow(i).getCell(1).font = { bold: true };
      worksheet.getRow(i).getCell(2).alignment = { horizontal: "left" };
    }
    worksheet.addRow([]); // Empty row for spacing
    rowIndex += 1;

   
    worksheet.addRow([
      "Order ID",
      "Date",
      "Subtotal",
      "Discount",
      "Final Amount",
      "Payment Method",
      "Status",
    ]);
    const headerRow = worksheet.getRow(rowIndex);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" },
    };
    headerRow.alignment = { horizontal: "center" };

    worksheet.autoFilter = {
      from: `A${rowIndex}`,
      to: `G${rowIndex}`,
    };

    orders.forEach((order, index) => {
      const row = worksheet.addRow([
        order.orderId || "N/A",
        order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A",
        Number(order.subTotal || 0),
        Number(order.discountAmount || 0),
        Number(order.totalAmount || 0),
        order.paymentMethod || "N/A",
        order.orderStatus || "N/A",
      ]);

      if (index % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F3F3F3" },
        };
      }
      row.alignment = { vertical: "middle", horizontal: "left" };
    });

    // Column Widths
    worksheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 20 },
      { width: 20 },
      { width: 15 },
    ];

    const excelBuffer = await workbook.xlsx.writeBuffer();
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sales-report-${startDate || dateRange}-to-${endDate || dateRange}.xlsx"`,
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
