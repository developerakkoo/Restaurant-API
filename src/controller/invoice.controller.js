// controllers/partnerEarnings.controller.js
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const moment = require("moment");

exports.generatePartnerInvoice = async (req, res) => {
  try {
    const { partnerId, hotelName, earnings } = req.body;

    if (!earnings || earnings.length === 0) {
      return res.status(400).json({ message: "No earnings data provided" });
    }

    const fileName = `partner-earnings-${partnerId}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../invoices/${fileName}`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(fs.createWriteStream(filePath));

    // ---------- HEADER ----------
    doc.fontSize(20).text("Partner Earning Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).text(`Hotel Name: ${hotelName}`);
    // doc.text(`Partner ID: ${partnerId}`);
    doc.text(`Invoice Date: ${moment().format("DD-MM-YYYY")}`);
    doc.moveDown(1.5);

    // ---------- TABLE HEADER ----------
    const tableTop = doc.y;
    const colWidths = {
      orderId: 90,
      dish: 100,
      qty: 30,
      type: 50,
      price: 50,
      earning: 60,
      settledAt: 70,
    };

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Order ID", 40, tableTop)
      .text("Dish", 40 + colWidths.orderId, tableTop)
      .text("Qty", 40 + colWidths.orderId + colWidths.dish, tableTop)
      .text("Type", 40 + colWidths.orderId + colWidths.dish + colWidths.qty, tableTop)
      .text("Price", 40 + colWidths.orderId + colWidths.dish + colWidths.qty + colWidths.type, tableTop)
      .text("Earning", 40 + colWidths.orderId + colWidths.dish + colWidths.qty + colWidths.type + colWidths.price, tableTop)
      .text("Settled", 40 + colWidths.orderId + colWidths.dish + colWidths.qty + colWidths.type + colWidths.price + colWidths.earning, tableTop);

    doc.moveDown();

    // ---------- TABLE ROWS ----------
    let y = tableTop + 20;
    let totalEarning = 0;

    earnings.forEach((item) => {
      totalEarning += item.totalPartnerEarning;
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(item.orderId.orderId, 40, y)
        .text(item.dishId.name, 40 + colWidths.orderId, y)
        .text(String(item.quantity), 40 + colWidths.orderId + colWidths.dish, y)
        .text(item.dishId.dishType, 40 + colWidths.orderId + colWidths.dish + colWidths.qty, y)
        .text(`${item.partnerPrice}`, 40 + colWidths.orderId + colWidths.dish + colWidths.qty + colWidths.type, y)
        .text(`${item.totalPartnerEarning}`, 40 + colWidths.orderId + colWidths.dish + colWidths.qty + colWidths.type + colWidths.price, y)
        .text(moment(item.settledAt).format("DD-MM-YYYY"), 40 + colWidths.orderId + colWidths.dish + colWidths.qty + colWidths.type + colWidths.price + colWidths.earning, y);
      y += 20;

      // Add page break if needed
      if (y > 720) {
        doc.addPage();
        y = 50;
      }
    });

    // ---------- FOOTER ----------
    doc.moveTo(40, y).lineTo(550, y).stroke();
    y += 10;

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`Total Earnings: ${totalEarning}`, 40, y, { align: "right" });

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`Generated on: ${moment().format("dddd, MMMM Do YYYY")}`, 40, y + 15, {
        align: "right",
      });

    // ---------- STAMP ----------
    const stampPath = path.join(__dirname, "../assets/stamp.jpg");
    if (fs.existsSync(stampPath)) {
      doc.image(stampPath, 420, y + 40, { width: 100 });
      doc.text("Authorized", 440, y + 105);
    }

    // Finalize PDF
    doc.end();

    const invoiceUrl = `${req.protocol}://${req.get("host")}/invoices/${fileName}`;
    res.json({ success: true, url: invoiceUrl });
  } catch (err) {
    console.error("Invoice Error:", err);
    res.status(500).json({ message: "Invoice generation failed" });
  }
};
