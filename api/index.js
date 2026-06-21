// Override MONGO_URI BEFORE requiring server.js so it picks up the correct value
const CORRECT_ATLAS_URI = "mongodb+srv://Myntra:Kaushal12345@cluster0.h8ak5ij.mongodb.net/myntra?retryWrites=true&w=majority";
const currentUri = process.env.MONGO_URI || "";
if (!currentUri || currentUri.includes("127.0.0.1") || currentUri.includes("localhost")) {
  process.env.MONGO_URI = CORRECT_ATLAS_URI;
}

const mongoose = require('mongoose');
const app = require('../backend/routes/server');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  cachedDb = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  return cachedDb;
}

module.exports = async (req, res) => {
  // Handle OPTIONS preflight requests for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,bypass-tunnel-reminder');
    res.status(200).end();
    return;
  }

  try {
    await connectToDatabase();
  } catch (error) {
    console.error('Database connection error in serverless handler:', error.message);
    return res.status(500).json({ message: 'Database connection failed', error: error.message });
  }

  // CRITICAL: Vercel rewrites ALL routes to /api/index.js but passes the original
  // requested URL in req.url. We must ensure Express receives the full original path.
  // req.url already contains the full original path (e.g. /api/transactions, /category/men)
  // so we don't need to do any rewriting - just pass through to Express.
  console.log(`[API] ${req.method} ${req.url}`);

  return app(req, res);
};
