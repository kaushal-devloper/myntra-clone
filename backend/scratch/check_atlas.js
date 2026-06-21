const mongoose = require("mongoose");

// Atlas URI from backend/routes/.env (used by Render)
const atlasURI = "mongodb+srv://myntra:Kaushal2412@myntra.x0ebtdb.mongodb.net/myntra?retryWrites=true&w=majority&appName=myntra";

async function checkAtlas() {
  try {
    await mongoose.connect(atlasURI);
    console.log("✅ Connected to Atlas!");
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log("\n=== ATLAS COLLECTIONS ===");
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  ${col.name}: ${count} documents`);
      
      // Show a sample doc's fields
      const sample = await db.collection(col.name).findOne();
      if (sample) {
        console.log(`    Fields: ${Object.keys(sample).join(', ')}`);
      }
    }
    
    await mongoose.disconnect();
    console.log("\nDone!");
  } catch (e) {
    console.error("❌ Atlas connection failed:", e.message);
  }
}

checkAtlas();
