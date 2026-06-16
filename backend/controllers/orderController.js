const Order = require("../modals/Order");
const Transaction = require("../models/Transaction");
const AuditLog = require("../models/AuditLog");

// ─── Receipt HTML generator ───────────────────────────────────────────────────

function generateReceiptHtml(order, user) {
  const itemRows = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">
        <div style="font-weight:700;color:#111;">${item.brand || ""}</div>
        <div style="font-size:13px;color:#555;margin-top:2px;">${item.name}</div>
        ${item.size ? `<div style="font-size:12px;color:#999;margin-top:2px;">Size: ${item.size}</div>` : ""}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;color:#333;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#111;">
        &#8377;${(item.discountedPrice || item.price).toLocaleString("en-IN")}
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt - ${order.orderId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f7; color: #111; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #ff3f6c; padding: 32px 28px 24px; color: #fff; }
    .header h1 { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
    .header p { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .status-badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 700; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .body { padding: 24px 28px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; font-weight: 800; color: #ff3f6c; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .meta-item label { display: block; font-size: 11px; color: #999; font-weight: 600; margin-bottom: 3px; }
    .meta-item span { font-size: 14px; font-weight: 700; color: #111; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 11px; color: #999; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 0 8px 10px; }
    th:last-child { text-align: right; }
    th:nth-child(2) { text-align: center; }
    .totals { border-top: 2px solid #f0f0f0; padding-top: 14px; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; color: #555; margin-bottom: 8px; }
    .total-row.final { font-size: 18px; font-weight: 900; color: #ff3f6c; margin-top: 10px; border-top: 1px solid #f0f0f0; padding-top: 10px; }
    .footer { background: #f7f7f7; padding: 18px 28px; font-size: 12px; color: #999; text-align: center; line-height: 18px; }
    .divider { border: none; border-top: 1px solid #f0f0f0; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Myntra</h1>
      <p>Your style, delivered.</p>
      <div class="status-badge">${order.paymentStatus === "success" ? "✓ Payment Successful" : order.paymentStatus.toUpperCase()}</div>
    </div>

    <div class="body">
      <div class="section">
        <div class="section-title">Order Details</div>
        <div class="meta-grid">
          <div class="meta-item"><label>Order ID</label><span>${order.orderId}</span></div>
          <div class="meta-item"><label>Date</label><span>${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
          <div class="meta-item"><label>Payment Mode</label><span>${order.paymentMode}</span></div>
          <div class="meta-item"><label>Status</label><span style="text-transform:capitalize;">${order.status}</span></div>
        </div>
      </div>

      ${
        order.shippingAddress
          ? `<div class="section">
        <div class="section-title">Delivery Address</div>
        <div style="font-size:14px;color:#333;line-height:20px;">${order.shippingAddress}</div>
      </div>`
          : ""
      }

      <div class="section">
        <div class="section-title">Items Ordered</div>
        <table>
          <thead><tr>
            <th style="text-align:left;">Product</th>
            <th>Qty</th>
            <th>Price</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>

      <div class="section totals">
        <div class="section-title">Price Summary</div>
        <div class="total-row"><span>Subtotal (${order.items.length} item${order.items.length !== 1 ? "s" : ""})</span><span>&#8377;${order.subtotal.toLocaleString("en-IN")}</span></div>
        ${order.deliveryCharge > 0 ? `<div class="total-row"><span>Delivery Charges</span><span>&#8377;${order.deliveryCharge.toLocaleString("en-IN")}</span></div>` : `<div class="total-row"><span>Delivery Charges</span><span style="color:#03a685;">FREE</span></div>`}
        <div class="total-row"><span>Tax &amp; Service Fee</span><span>&#8377;${order.tax.toLocaleString("en-IN")}</span></div>
        <div class="total-row final"><span>Total Paid</span><span>&#8377;${order.total.toLocaleString("en-IN")}</span></div>
      </div>
    </div>

    <hr class="divider" />
    <div class="footer">
      Thank you for shopping with Myntra!<br />
      This is a computer-generated receipt. For queries, contact support@myntra.com
    </div>
  </div>
</body>
</html>`;
}

// ─── createOrder ──────────────────────────────────────────────────────────────

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      items,
      subtotal,
      tax,
      deliveryCharge,
      total,
      shippingAddress,
      paymentMode = "COD",
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "items array is required." });
    }
    if (!total || total <= 0) {
      return res.status(400).json({ success: false, message: "total must be a positive number." });
    }

    // Resolve shipping address: use user's saved address if no explicit one provided
    let resolvedAddress = shippingAddress || "";
    if (!resolvedAddress || resolvedAddress === "default") {
      try {
        const User = require("../modals/User");
        const userData = await User.findById(userId).select("address fullname").lean();
        if (userData?.address && userData.address.fullName) {
          const a = userData.address;
          resolvedAddress = `${a.fullName}, ${a.addressLine}, ${a.city}, ${a.state} ${a.pincode}, Phone: ${a.mobile}`;
        }
      } catch (e) {
        console.error("[OrderController] Error fetching user address:", e.message);
      }
    }

    const paymentStatus = req.body.paymentStatus || "success";
    const status = req.body.status || (
      paymentStatus === "success" ? "confirmed" :
      paymentStatus === "failed" ? "cancelled" :
      paymentStatus === "refunded" ? "refunded" : "pending"
    );

    // 1. Create Order document
    const order = await Order.create({
      userId,
      items,
      subtotal: subtotal || total,
      tax: tax || 0,
      deliveryCharge: deliveryCharge || 0,
      total,
      shippingAddress: resolvedAddress,
      paymentMode,
      paymentStatus,
      status,
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    });

    // 2. Create Transaction linked to order
    const description = `Order ${order.orderId} — ${items.length} item${items.length !== 1 ? "s" : ""}`;
    const transaction = await Transaction.create({
      userId,
      orderId: order._id,
      amount: total,
      paymentMode,
      paymentStatus,
      description,
    });

    // 3. Link transaction back to order
    order.transactionId = transaction._id;
    await order.save();

    // 4. AuditLog
    try {
      await AuditLog.create({
        userId,
        action: "created",
        entity: "Transaction",
        entityId: transaction._id,
        changes: { orderId: order._id, amount: total, paymentMode },
        performedBy: userId,
        ip: req.ip || null,
      });
    } catch (e) {
      console.error("[OrderController] AuditLog error:", e.message);
    }

    return res.status(201).json({
      success: true,
      data: { order, transaction },
    });
  } catch (err) {
    console.error("[OrderController] createOrder error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to create order." });
  }
};

// ─── getOrders ────────────────────────────────────────────────────────────────

exports.getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("items.productId", "name brand image images price discount")
        .lean(),
      Order.countDocuments({ userId }),
    ]);

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (err) {
    console.error("[OrderController] getOrders error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch orders." });
  }
};

// ─── getOrderById ─────────────────────────────────────────────────────────────

exports.getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await Order.findById(req.params.id)
      .populate("items.productId", "name brand image images price discount")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    console.error("[OrderController] getOrderById error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch order." });
  }
};

// ─── getReceipt ───────────────────────────────────────────────────────────────

exports.getReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await Order.findById(req.params.id).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const html = generateReceiptHtml(order, null);

    // Return as JSON with html string so mobile can render in WebView
    return res.status(200).json({ success: true, html, orderId: order.orderId });
  } catch (err) {
    console.error("[OrderController] getReceipt error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate receipt." });
  }
};

const PDFDocument = require("pdfkit");

exports.getReceiptPdf = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await Order.findById(req.params.id).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt_${order.orderId}.pdf`
    );

    doc.pipe(res);

    // Draw header background block in brand pink
    doc.rect(0, 0, 595.28, 120).fill("#FF3F6C");

    // Title
    doc.fillColor("#FFFFFF").fontSize(26).font("Helvetica-Bold").text("MYNTRA RECEIPT", 40, 35);
    doc.fontSize(10).font("Helvetica").text("Your style, delivered.", 40, 70);

    // Payment state
    doc.fontSize(12).font("Helvetica-Bold").text(order.paymentStatus === "success" ? "Payment Successful" : "PENDING", 40, 90, { align: "right" });

    // Move down
    doc.y = 140;

    // Order Info block
    doc.fillColor("#333333").fontSize(10);
    
    // Left column metadata
    doc.font("Helvetica-Bold").text("Order ID: ", 40, 150);
    doc.font("Helvetica").text(order.orderId, 120, 150);

    doc.font("Helvetica-Bold").text("Date: ", 40, 170);
    doc.font("Helvetica").text(new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), 120, 170);

    // Right column metadata
    doc.font("Helvetica-Bold").text("Payment Mode: ", 300, 150);
    doc.font("Helvetica").text(order.paymentMode, 390, 150);

    doc.font("Helvetica-Bold").text("Status: ", 300, 170);
    doc.font("Helvetica").text(order.status.toUpperCase(), 390, 170);

    // Shipping Address
    if (order.shippingAddress) {
      doc.font("Helvetica-Bold").text("Delivery Address:", 40, 200);
      doc.font("Helvetica").text(order.shippingAddress, 40, 215, { width: 500 });
    }

    // Divider
    doc.moveTo(40, 260).lineTo(555, 260).strokeColor("#DDDDDD").stroke();

    // Table Header
    doc.y = 275;
    doc.font("Helvetica-Bold").fillColor("#ff3f6c");
    doc.text("ITEMS ORDERED", 40, 275);
    doc.text("QTY", 400, 275, { width: 40, align: "center" });
    doc.text("PRICE", 460, 275, { width: 95, align: "right" });

    doc.moveTo(40, 290).lineTo(555, 290).strokeColor("#DDDDDD").stroke();

    let currentY = 305;
    doc.fillColor("#333333");
    
    order.items.forEach(item => {
      // Brand
      doc.font("Helvetica-Bold").fontSize(11).text(item.brand || "", 40, currentY);
      // Name
      doc.font("Helvetica").fontSize(9).text(item.name || "", 40, currentY + 14, { width: 320 });
      // Size
      if (item.size) {
        doc.font("Helvetica").fontSize(8).fillColor("#777777").text(`Size: ${item.size}`, 40, currentY + 26);
        doc.fillColor("#333333");
      }

      // Quantity
      doc.font("Helvetica").fontSize(10).text(String(item.quantity), 400, currentY, { width: 40, align: "center" });
      
      // Price
      const itemPrice = item.discountedPrice || item.price;
      doc.font("Helvetica-Bold").fontSize(10).text(`Rs. ${itemPrice.toLocaleString("en-IN")}`, 460, currentY, { width: 95, align: "right" });

      currentY += 45;
    });

    // Divider
    doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor("#DDDDDD").stroke();
    currentY += 15;

    // Price summary
    doc.fontSize(10);
    doc.font("Helvetica").text("Subtotal:", 300, currentY);
    doc.font("Helvetica-Bold").text(`Rs. ${order.subtotal.toLocaleString("en-IN")}`, 460, currentY, { width: 95, align: "right" });
    
    currentY += 20;
    doc.font("Helvetica").text("Tax & Service Fee:", 300, currentY);
    doc.font("Helvetica-Bold").text(`Rs. ${order.tax.toLocaleString("en-IN")}`, 460, currentY, { width: 95, align: "right" });

    currentY += 20;
    doc.font("Helvetica").text("Delivery Charges:", 300, currentY);
    doc.font("Helvetica-Bold").text(order.deliveryCharge > 0 ? `Rs. ${order.deliveryCharge.toLocaleString("en-IN")}` : "FREE", 460, currentY, { width: 95, align: "right" });

    currentY += 25;
    doc.moveTo(300, currentY).lineTo(555, currentY).strokeColor("#CCCCCC").stroke();
    
    currentY += 10;
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#FF3F6C").text("Total Paid:", 300, currentY);
    doc.text(`Rs. ${order.total.toLocaleString("en-IN")}`, 460, currentY, { width: 95, align: "right" });

    // Footer
    doc.fontSize(9).font("Helvetica").fillColor("#999999").text(
      "Thank you for shopping with Myntra!\nThis is a computer-generated receipt. For queries, contact support@myntra.com",
      40,
      760,
      { align: "center", width: 515 }
    );

    doc.end();
  } catch (err) {
    console.error("[OrderController] getReceiptPdf error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate PDF receipt." });
  }
};

exports.getReceiptImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await Order.findById(req.params.id).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const itemHeight = 60;
    const baseHeight = 520;
    const svgHeight = baseHeight + (order.items.length * itemHeight);

    const itemRowsSvg = order.items.map((item, index) => {
      const y = 310 + (index * itemHeight);
      const itemPrice = item.discountedPrice || item.price;
      return `
        <text x="40" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="bold" fill="#111111">${item.brand || ''}</text>
        <text x="40" y="${y + 18}" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#555555">${item.name.substring(0, 45)}${item.name.length > 45 ? '...' : ''}</text>
        ${item.size ? `<text x="40" y="${y + 32}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#888888">Size: ${item.size}</text>` : ''}
        <text x="420" y="${y + 10}" font-family="Helvetica, Arial, sans-serif" font-size="13" text-anchor="middle" fill="#333333">${item.quantity}</text>
        <text x="560" y="${y + 10}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" text-anchor="end" fill="#111111">Rs. ${itemPrice.toLocaleString('en-IN')}</text>
        <line x1="40" y1="${y + 42}" x2="560" y2="${y + 42}" stroke="#EEEEEE" stroke-width="1" />
      `;
    }).join("");

    const totalsY = 320 + (order.items.length * itemHeight);

    const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="600" height="${svgHeight}" viewBox="0 0 600 ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bg { fill: #FFFFFF; }
      .header-bg { fill: #FF3F6C; }
      .text-white { fill: #FFFFFF; }
      .text-title { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 26px; font-weight: 900; }
      .text-subtitle { font-family: Helvetica, Arial, sans-serif; font-size: 13px; }
      .text-label { font-family: Helvetica, Arial, sans-serif; font-size: 11px; fill: #999999; font-weight: bold; text-transform: uppercase; }
      .text-value { font-family: Helvetica, Arial, sans-serif; font-size: 14px; fill: #111111; font-weight: bold; }
    </style>
  </defs>
  
  <rect x="0" y="0" width="600" height="${svgHeight}" rx="8" fill="#F7F7F7" />
  <rect x="10" y="10" width="580" height="${svgHeight - 20}" rx="12" fill="#FFFFFF" stroke="#EAEAEA" stroke-width="1" />
  
  <path d="M10 22 C 10 15, 15 10, 22 10 L 578 10 C 585 10, 590 15, 590 22 L 590 110 L 10 110 Z" fill="#FF3F6C" />
  <text x="40" y="55" class="text-white text-title">Myntra</text>
  <text x="40" y="78" class="text-white text-subtitle" opacity="0.85">Your style, delivered.</text>
  
  <rect x="420" y="42" width="140" height="32" rx="16" fill="rgba(255,255,255,0.2)" />
  <text x="490" y="62" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
    ${order.paymentStatus === 'success' ? '✓ PAID' : 'PENDING'}
  </text>
  
  <text x="40" y="145" class="text-label">Order Details</text>
  
  <text x="40" y="170" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#888888">Order ID:</text>
  <text x="110" y="170" class="text-value">${order.orderId}</text>
  
  <text x="40" y="195" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#888888">Date:</text>
  <text x="110" y="195" class="text-value">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</text>
  
  <text x="320" y="170" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#888888">Payment Mode:</text>
  <text x="430" y="170" class="text-value">${order.paymentMode}</text>
  
  <text x="320" y="195" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#888888">Status:</text>
  <text x="430" y="195" class="text-value" fill="#03a685">${order.status.toUpperCase()}</text>

  ${order.shippingAddress ? `
    <text x="40" y="235" class="text-label">Delivery Address</text>
    <text x="40" y="255" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#333333">${order.shippingAddress.substring(0, 75)}</text>
  ` : ''}
  
  <line x1="40" y1="280" x2="560" y2="280" stroke="#DDDDDD" stroke-width="1" />
  <text x="40" y="298" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#ff3f6c">ITEMS ORDERED</text>
  <text x="420" y="298" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#999999" text-anchor="middle">QTY</text>
  <text x="560" y="298" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#999999" text-anchor="end">PRICE</text>
  <line x1="40" y1="305" x2="560" y2="305" stroke="#DDDDDD" stroke-width="1.5" />
  
  ${itemRowsSvg}
  
  <text x="320" y="${totalsY + 20}" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#666666">Subtotal:</text>
  <text x="560" y="${totalsY + 20}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" fill="#111111" text-anchor="end">Rs. ${order.subtotal.toLocaleString('en-IN')}</text>
  
  <text x="320" y="${totalsY + 45}" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#666666">Tax &amp; Service Fee:</text>
  <text x="560" y="${totalsY + 45}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" fill="#111111" text-anchor="end">Rs. ${order.tax.toLocaleString('en-IN')}</text>
  
  <text x="320" y="${totalsY + 70}" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#666666">Delivery Charges:</text>
  <text x="560" y="${totalsY + 70}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" fill="#03a685" text-anchor="end">${order.deliveryCharge > 0 ? `Rs. ${order.deliveryCharge.toLocaleString('en-IN')}` : 'FREE'}</text>
  
  <line x1="320" y1="${totalsY + 85}" x2="560" y2="${totalsY + 85}" stroke="#CCCCCC" stroke-width="1" />
  
  <text x="320" y="${totalsY + 110}" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="bold" fill="#FF3F6C">Total Paid:</text>
  <text x="560" y="${totalsY + 110}" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="900" fill="#FF3F6C" text-anchor="end">Rs. ${order.total.toLocaleString('en-IN')}</text>
  
  <line x1="10" y1="${svgHeight - 70}" x2="590" y2="${svgHeight - 70}" stroke="#EAEAEA" stroke-width="1" />
  <text x="300" y="${svgHeight - 42}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#999999" text-anchor="middle">Thank you for shopping with Myntra!</text>
  <text x="300" y="${svgHeight - 25}" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#CCCCCC" text-anchor="middle">This is a computer-generated receipt.</text>
</svg>`;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt_${order.orderId}.svg`
    );
    return res.status(200).send(svg);
  } catch (err) {
    console.error("[OrderController] getReceiptImage error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate image receipt." });
  }
};
