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

  // Restore original path from Vercel headers so Express routes match correctly
  // Vercel rewrites /api/foo → /api/index.js but provides original path in x-matched-path or the URL
  const originalUrl = req.headers['x-matched-path'] || req.headers['x-forwarded-url'] || req.url;

  // x-matched-path gives the Vercel matched route pattern (e.g. /api/:path*)
  // We need to use the actual original request URL instead
  // The real original path is in req.url when Vercel passes it through
  if (req.url && req.url !== '/api' && req.url !== '/') {
    // req.url already has the correct full path from Vercel
    // Do nothing - Express will handle it
  }

  return app(req, res);
};
