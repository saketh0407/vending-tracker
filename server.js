/**
 * Vending Tracker Server (for Motel POS)
 * ---------------------------------
 * Works on:
 * - Localhost (dev)
 * - Render (production)
 * Features:
 * - MongoDB Atlas
 * - CORS for all systems
 * - Excel & PDF report generation
 * ---------------------------------
 */

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.static("public"));

// ✅ Allow frontend access from localhost & Render
const allowedOrigins = [
  "http://localhost:3000",
  "https://vending-tracker.onrender.com", // Replace with your actual Render URL
  "https://vending-tracker-frontend.onrender.com", // If you host frontend separately later
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

// --- CONFIG ---
const PORT = process.env.PORT || 3000;
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/vending-tracker";

// --- CONNECT TO MONGODB ATLAS ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// --- SCHEMAS & MODELS ---
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
});

const saleSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  quantity: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentType: { type: String, required: true },
  buyerType: { type: String, enum: ["Owner", "Staff", "Customer"], default: "Customer" },
  date: { type: Date, default: Date.now },
});

const Item = mongoose.model("Item", itemSchema);
const Sale = mongoose.model("Sale", saleSchema);

// --- ROUTES ---

// 🧾 Get all items
app.get("/api/items", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// ➕ Add a new item
app.post("/api/items", async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    if (!name || price == null)
      return res.status(400).json({ error: "Name and price are required" });

    const newItem = new Item({ name, price, stock: stock || 0 });
    await newItem.save();
    res.json(newItem);
  } catch (err) {
    res.status(500).json({ error: "Failed to add item" });
  }
});

// ❌ Delete an item
app.delete("/api/items/:id", async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// 💰 Record a sale
app.post("/api/sales", async (req, res) => {
  try {
    const { itemId, quantity, paymentType, buyerType } = req.body;
    if (!itemId || !quantity || !paymentType)
      return res.status(400).json({ error: "Missing sale details" });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.stock < quantity)
      return res.status(400).json({ error: "Not enough stock available" });

    item.stock -= quantity;
    await item.save();

    const total = item.price * quantity;
    const sale = new Sale({ item: item._id, quantity, total, paymentType, buyerType });
    await sale.save();

    res.json({ message: "Sale recorded successfully", sale });
  } catch (err) {
    res.status(500).json({ error: "Failed to record sale" });
  }
});

// 📊 Generate Excel Report (with optional date range)
app.get("/api/reports/excel", async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = {};

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const sales = await Sale.find(query).populate("item");

    if (!sales.length)
      return res.status(404).json({ message: "No sales found for selected range" });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.columns = [
      { header: "Item", key: "item", width: 25 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Total ($)", key: "total", width: 10 },
      { header: "Payment Type", key: "paymentType", width: 15 },
      { header: "Buyer Type", key: "buyerType", width: 15 },
      { header: "Date", key: "date", width: 25 },
    ];

    sales.forEach((sale) => {
      sheet.addRow({
        item: sale.item ? sale.item.name : "Deleted Item",
        quantity: sale.quantity,
        total: sale.total.toFixed(2),
        paymentType: sale.paymentType,
        buyerType: sale.buyerType,
        date: new Date(sale.date).toLocaleString(),
      });
    });

    const filePath = "./sales_report.xlsx";
    await workbook.xlsx.writeFile(filePath);
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧾 Generate PDF Report
app.get("/api/reports/pdf", async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = {};

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const sales = await Sale.find(query).populate("item");
    const filePath = "./sales_report.pdf";
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text("Sales Report", { align: "center" });
    doc.moveDown();

    sales.forEach((sale) => {
      const itemName = sale.item ? sale.item.name : "Deleted Item";
      doc.fontSize(12).text(
        `${itemName} | Qty: ${sale.quantity} | $${sale.total.toFixed(
          2
        )} | ${sale.paymentType} | ${sale.buyerType} | ${new Date(
          sale.date
        ).toLocaleString()}`
      );
      doc.moveDown(0.3);
    });

    doc.end();
    stream.on("finish", () => res.download(filePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- START SERVER ---
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
