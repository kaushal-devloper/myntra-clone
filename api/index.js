const app = require('../backend/routes/server');
const mongoose = require('mongoose');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  const dbURI = process.env.MONGO_URI || "mongodb+srv://myntra:Kaushal2412@myntra.x0ebtdb.mongodb.net/myntra?retryWrites=true&w=majority";
  cachedDb = await mongoose.connect(dbURI);
  return cachedDb;
}

module.exports = async (req, res) => {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('Database connection error in serverless handler:', error);
  }

  // Restore the original URL if Vercel rewrote it, so Express routes match correctly
  const originalUrl = req.headers['x-forwarded-url'] || req.headers['x-matched-path'];
  if (originalUrl) {
    req.url = originalUrl;
  }

  return app(req, res);
};
