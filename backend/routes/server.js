const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const userRoutes = require("./Userrouts");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, bypass-tunnel-reminder");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.get("/", (req, res) => {
  res.send("✅ Myntra backend is working");
});

app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5000;
const primaryDbURI = process.env.MONGO_URI;
const fallbackDbURI = "mongodb://127.0.0.1:27017/myntra";

async function startServer() {
  const urisToTry = [primaryDbURI, fallbackDbURI].filter(Boolean);

  for (const dbURI of urisToTry) {
    try {
      await mongoose.connect(dbURI);
      console.log(`MongoDB connected (${dbURI === fallbackDbURI ? "local" : "atlas"})`);

      app.listen(PORT, () => {
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
