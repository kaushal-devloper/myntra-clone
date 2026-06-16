const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

/**
 * Escapes characters for CSV format.
 */
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generates a CSV export of user transactions and writes to the given path.
 */
function generateCSV(transactions, summary, filePath) {
  let csvContent = "";
  csvContent += `"TRANSACTIONS REPORT SUMMARY"\n`;
  csvContent += `"Generated On",${escapeCSV(new Date().toLocaleString())}\n\n`;
  csvContent += `"Metric","Value"\n`;
  csvContent += `"Total Transactions",${summary.totalTransactions}\n`;
  csvContent += `"Total Amount Spent (Success)",${summary.totalSpent}\n`;
  csvContent += `"Successful Payments",${summary.successful}\n`;
  csvContent += `"Failed/Cancelled/Pending Payments",${summary.failed}\n\n\n`;

  const headers = [
    "Transaction ID",
    "Order ID",
    "Ordered Products",
    "Amount (INR)",
    "Payment Status",
    "Payment Mode",
    "Date & Time",
    "Description"
  ];
  csvContent += headers.map(escapeCSV).join(",") + "\n";

  transactions.forEach((t) => {
    let products = "";
    if (t.orderId && t.orderId.items) {
      products = t.orderId.items
        .map((item) => `${item.name} (${item.brand}) x${item.quantity}`)
        .join("; ");
    }
    const row = [
      t._id.toString(),
      t.orderId ? (t.orderId.orderId || t.orderId._id.toString()) : "N/A",
      products || "N/A",
      t.amount,
      t.paymentStatus,
      t.paymentMode,
      new Date(t.createdAt).toLocaleString(),
      t.description || ""
    ];
    csvContent += row.map(escapeCSV).join(",") + "\n";
  });

  fs.writeFileSync(filePath, csvContent, "utf8");
}

/**
 * Generates an Excel (xlsx) export of user transactions and writes to the given path.
 */
function generateExcel(transactions, summary, filePath) {
  const summaryRows = [
    ["TRANSACTIONS REPORT SUMMARY"],
    ["Generated On", new Date().toLocaleString()],
    [],
    ["Metric", "Value"],
    ["Total Transactions", summary.totalTransactions],
    ["Total Amount Spent (Success)", summary.totalSpent],
    ["Successful Payments", summary.successful],
    ["Failed/Cancelled/Pending Payments", summary.failed],
    [],
    [] // Blank rows before transactions log
  ];

  const transactionHeaders = [
    "Transaction ID",
    "Order ID",
    "Ordered Products",
    "Amount (INR)",
    "Payment Status",
    "Payment Mode",
    "Date & Time",
    "Description"
  ];

  const transactionRows = transactions.map((t) => {
    let products = "";
    if (t.orderId && t.orderId.items) {
      products = t.orderId.items
        .map((item) => `${item.name} (${item.brand}) x${item.quantity}`)
        .join("; ");
    }
    return [
      t._id.toString(),
      t.orderId ? (t.orderId.orderId || t.orderId._id.toString()) : "N/A",
      products || "N/A",
      t.amount,
      t.paymentStatus,
      t.paymentMode,
      new Date(t.createdAt).toLocaleString(),
      t.description || ""
    ];
  });

  const worksheetData = [...summaryRows, transactionHeaders, ...transactionRows];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, filePath);
}

/**
 * Generates a professional PDF report and returns a Promise that resolves when finished.
 */
function generatePDF(transactions, summary, filePath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Color Palette
      const primaryColor = "#ff3f6c"; // Myntra Pink
      const darkColor = "#282c3f"; // Myntra Charcoal
      const greyColor = "#686b78";
      const lightGreyColor = "#f5f6f8";
      const successColor = "#03a685";
      const pendingColor = "#f58220";
      const failedColor = "#e03e2d";

      // --- Header banner ---
      doc.fillColor(primaryColor).rect(0, 0, 595.28, 90).fill();
      doc.fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text("MYNTRA CLONE", 40, 25);
      doc.fontSize(12)
        .font("Helvetica")
        .text("Transaction History Report", 40, 50);

      doc.fillColor("#ffffff")
        .font("Helvetica")
        .fontSize(9)
        .text(`Report Generated: ${new Date().toLocaleString()}`, 40, 70, { align: "left" });

      // --- Summary Section ---
      doc.fillColor(darkColor)
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Financial Summary", 40, 110);

      // Draw 4 cards for metrics
      const startY = 130;
      const cardWidth = 118;
      const cardHeight = 60;
      const gap = 14;

      const metrics = [
        { label: "Total Transactions", value: `${summary.totalTransactions}`, color: darkColor },
        { label: "Total Spent", value: `INR ${summary.totalSpent.toFixed(2)}`, color: successColor },
        { label: "Successful Payments", value: `${summary.successful}`, color: successColor },
        { label: "Failed/Cancelled/Pending", value: `${summary.failed}`, color: failedColor }
      ];

      metrics.forEach((m, idx) => {
        const x = 40 + idx * (cardWidth + gap);

        // Card background
        doc.roundedRect(x, startY, cardWidth, cardHeight, 6)
          .fillAndStroke(lightGreyColor, "#e2e5e8");

        // Card label
        doc.fillColor(greyColor)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(m.label, x + 6, startY + 12, { width: cardWidth - 12, align: "center" });

        // Card value
        doc.fillColor(m.color)
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(m.value, x + 6, startY + 32, { width: cardWidth - 12, align: "center" });
      });

      // --- Transactions List Header ---
      doc.fillColor(darkColor)
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Transactions Log", 40, 215);

      // Table Headers
      const tableHeaderY = 235;
      doc.fillColor(primaryColor)
        .rect(40, tableHeaderY, 515, 20)
        .fill();

      doc.fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8);

      doc.text("Date", 45, tableHeaderY + 6, { width: 65 });
      doc.text("Transaction ID", 115, tableHeaderY + 6, { width: 100 });
      doc.text("Ordered Items / Details", 220, tableHeaderY + 6, { width: 150 });
      doc.text("Mode / Status", 380, tableHeaderY + 6, { width: 85 });
      doc.text("Amount", 470, tableHeaderY + 6, { width: 80, align: "right" });

      // Table Body
      let currentY = tableHeaderY + 20;
      const rowHeight = 35;
      const pageHeightLimit = 750;

      doc.fillColor(darkColor).font("Helvetica").fontSize(7.5);

      transactions.forEach((t, index) => {
        // Page overflow check
        if (currentY + rowHeight > pageHeightLimit) {
          doc.addPage();
          currentY = 40; // reset to top margin

          // Redraw Table Headers
          doc.fillColor(primaryColor)
            .rect(40, currentY, 515, 20)
            .fill();

          doc.fillColor("#ffffff")
            .font("Helvetica-Bold")
            .fontSize(8);

          doc.text("Date", 45, currentY + 6, { width: 65 });
          doc.text("Transaction ID", 115, currentY + 6, { width: 100 });
          doc.text("Ordered Items / Details", 220, currentY + 6, { width: 150 });
          doc.text("Mode / Status", 380, currentY + 6, { width: 85 });
          doc.text("Amount", 470, currentY + 6, { width: 80, align: "right" });

          currentY += 20;
          doc.fillColor(darkColor).font("Helvetica").fontSize(7.5);
        }

        // Alternating background color
        if (index % 2 === 0) {
          doc.fillColor("#fafafa")
            .rect(40, currentY, 515, rowHeight)
            .fill();
        }

        // Bottom border line
        doc.strokeColor("#ececec")
          .lineWidth(0.5)
          .moveTo(40, currentY + rowHeight)
          .lineTo(555, currentY + rowHeight)
          .stroke();

        // Date & Time formatting
        const dateObj = new Date(t.createdAt);
        const dateStr = dateObj.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }) + "\n" + dateObj.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit"
        });

        const txnId = t._id.toString();
        const orderIdStr = t.orderId ? `Order: ${t.orderId.orderId || t.orderId._id?.toString() || t.orderId}` : "";

        // Format products list
        let products = t.description || "N/A";
        if (t.orderId && t.orderId.items && t.orderId.items.length > 0) {
          products = t.orderId.items.map((item) => `${item.name} x${item.quantity}`).join(", ");
        }
        if (products.length > 55) {
          products = products.substring(0, 52) + "...";
        }

        const statusColor = t.paymentStatus === "success"
          ? successColor
          : (t.paymentStatus === "pending" ? pendingColor : failedColor);

        // Print columns
        doc.fillColor(darkColor).text(dateStr, 45, currentY + 6, { width: 65 });
        doc.font("Helvetica-Bold").text(txnId, 115, currentY + 6, { width: 100 });
        if (orderIdStr) {
          doc.fillColor(greyColor).font("Helvetica").fontSize(7).text(orderIdStr, 115, currentY + 16, { width: 100 });
        }

        doc.fillColor(darkColor).font("Helvetica").fontSize(7.5).text(products, 220, currentY + 8, { width: 150 });

        doc.text(t.paymentMode, 380, currentY + 6, { width: 85 });
        doc.fillColor(statusColor).font("Helvetica-Bold").text(t.paymentStatus.toUpperCase(), 380, currentY + 16, { width: 85 });

        const amtText = `INR ${t.amount.toFixed(2)}`;
        doc.fillColor(darkColor).font("Helvetica-Bold").text(amtText, 470, currentY + 12, { width: 80, align: "right" });

        currentY += rowHeight;
      });

      // --- Page Numbers ---
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor(greyColor)
          .fontSize(7)
          .text(`Page ${i + 1} of ${pages.count}`, 40, 810, { align: "center", width: 515 });
      }

      doc.end();
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateCSV,
  generateExcel,
  generatePDF
};
