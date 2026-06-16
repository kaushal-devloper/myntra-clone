const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const userRoutes = require("./Userrouts");
const categoryRoutes = require("./Cetegoryroutes");
const productRoutes = require("./productroutes");
const bagRoutes = require("./bagRoutes");
const recommendationRoutes = require("./recommendationRoutes");
const notificationRoutes = require("./notificationRoutes");
const transactionRoutes = require("./transactionRoutes");
const orderRoutes = require("./orderRoutes");
const settingsRoutes = require("./settingsRoutes");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, bypass-tunnel-reminder, Origin, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.get("/", async (req, res) => {
  try {
    const Category = require("../modals/Category");
    const Product = require("../modals/Product");
    const categories = await Category.find().populate("productId");
    const debugData = categories.map(cat => ({
      name: cat.name,
      productCount: cat.productId ? cat.productId.length : 0,
      products: cat.productId ? cat.productId.map(p => p ? { name: p.name, discount: p.discount, price: p.price } : null) : []
    }));
    const totalProducts = await Product.countDocuments();
    res.json({ debugData, totalProducts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/users", userRoutes);
app.use("/category", categoryRoutes);
app.use("/product", productRoutes);
app.use("/api/bag", bagRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/settings", settingsRoutes);

const PORT = process.env.PORT || 5000;
const primaryDbURI = process.env.MONGO_URI;
const fallbackDbURI = "mongodb://127.0.0.1:27017/myntra";

const { initScheduler } = require("../services/schedulingService");

async function startServer() {
  const urisToTry = [primaryDbURI, fallbackDbURI].filter(Boolean);

  for (const dbURI of urisToTry) {
    try {
      await mongoose.connect(dbURI);
      console.log(`MongoDB connected (${dbURI === fallbackDbURI ? "local" : "atlas"})`);

      // Start scheduled background tasks (Cart reminders, daily offers)
      initScheduler();

      // Ensure discounted products are seeded
      const seedDiscountedProducts = require("../utils/seedDiscountedProducts");
      seedDiscountedProducts();

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server is running on port ${PORT}`);
      });
      return;
    } catch (error) {
      console.error(`Error connecting to MongoDB (${dbURI === fallbackDbURI ? "local" : "atlas"}):`, error.message);
    }
  }

  console.error("Server not started because MongoDB could not be connected.");
  process.exit(1);
}

startServer();
