const ExcelJS = require("exceljs");

exports.generateExcel = async (orders) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Report", {
    properties: { tabColor: { argb: "FF00FF00" } },
  });

  // Define columns
  worksheet.columns = [
    { header: "Order ID", key: "orderId", width: 20 },
    { header: "Date", key: "orderDate", width: 15 },
    { header: "Subtotal", key: "subTotal", width: 15 },
    { header: "Discount", key: "discountAmount", width: 15 },
    { header: "Offers", key: "productOffers", width: 15 }, // Fixed field name
    { header: "Final Amount", key: "totalAmount", width: 20 },
    { header: "Payment Method", key: "paymentMethod", width: 20 },
    { header: "Status", key: "orderStatus", width: 15 },
  ];

  // Header Styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "4472C4" },
  };
  headerRow.alignment = { horizontal: "center" };

  // AutoFilter
  worksheet.autoFilter = {
    from: "A1",
    to: "H1",
  };

  // Adding Data with alternating row colors
  orders.forEach((order, index) => {
    const row = worksheet.addRow({
      orderId: order.orderId || "N/A",
      orderDate: order.orderDate
        ? new Date(order.orderDate).toLocaleDateString()
        : "N/A",
      subTotal: Number(order.subTotal || 0),
      discountAmount: Number(order.discountAmount || 0),
      productOffers: Number(order.productOffers || 0), // Fixed field name
      totalAmount: Number(order.totalAmount || 0),
      paymentMethod: order.paymentMethod || "N/A",
      orderStatus: order.orderStatus || "N/A",
    });

    // Alternating row color
    if (index % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F3F3F3" },
      };
    }

    row.alignment = { vertical: "middle", horizontal: "left" };
  });

  return await workbook.xlsx.writeBuffer();
};

const PDFDocument = require("pdfkit");

exports.generatePDF = async (orders) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        layout: "portrait",
      });
      let buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Report Title
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Sales Report", { align: "center" })
        .moveDown(1);

      // Adjusted Column Layout
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

      // Draw Table Header
      doc
        .rect(40, yPosition - 5, 515, rowHeight) // Adjusted width from 640 to 515
        .fill("#DDDDDD")
        .stroke();
      doc.fillColor("black").fontSize(10);

      columns.forEach((col) => {
        doc.text(col.name, col.x, yPosition, {
          width: col.width,
          align: "left",
        });
      });

      doc
        .moveDown(0.5)
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y) // Adjusted from 680 to 555
        .stroke();
      yPosition = doc.y + 5;

      // Table Content
      doc.font("Helvetica").fontSize(9);
      orders.forEach((order, index) => {
        if (yPosition > 750) {
          doc.addPage();
          yPosition = 50;
        }

        // Alternating Row Colors
        if (index % 2 === 0) {
          doc
            .rect(40, yPosition - 5, 515, rowHeight) // Adjusted width from 640 to 515
            .fill("#F3F3F3")
            .stroke();
          doc.fillColor("black");
        }

        const values = [
          order.orderId || "N/A",
          order.orderDate
            ? new Date(order.orderDate).toLocaleDateString()
            : "N/A",
          `₹${Number(order.subTotal || 0).toFixed(2)}`,
          `₹${Number(order.discountAmount || 0).toFixed(2)}`,
          `₹${Number(order.totalAmount || 0).toFixed(2)}`,
          order.paymentMethod || "N/A",
          order.orderStatus || "N/A",
        ];

        columns.forEach((col, idx) => {
          doc.text(values[idx], col.x, yPosition, {
            width: col.width,
            align: "left",
          });
        });

        yPosition += rowHeight;
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
