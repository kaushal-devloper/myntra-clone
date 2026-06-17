// Override MONGO_URI BEFORE requiring server.js so it picks up the correct value
const CORRECT_ATLAS_URI = "mongodb+srv://Myntra:Kaushal12345@cluster0.h8ak5ij.mongodb.net/myntra?retryWrites=true&w=majority";
const currentUri = process.env.MONGO_URI || "";
if (!currentUri || currentUri.includes("Kaushal2412") || currentUri.includes("Pass%40123") || currentUri.includes("x0ebtdb.mongodb.net")) {
  process.env.MONGO_URI = CORRECT_ATLAS_URI;
}

const mongoose = require('mongoose');
const app = require('../backend/routes/server');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  cachedDb = await mongoose.connect(process.env.MONGO_URI);
  return cachedDb;
}

module.exports = async (req, res) => {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('Database connection error in serverless handler:', error.message);
    return res.status(500).json({ message: 'Database connection failed', error: error.message });
  }

  // Fix the URL: Vercel rewrites /product, /category etc. to /api
  // We need to restore the original path so Express routes match
  const originalPath = req.headers['x-matched-path'] || req.headers['x-forwarded-url'];
  if (originalPath && originalPath !== '/api') {
    req.url = originalPath;
  }

  return app(req, res);
};
