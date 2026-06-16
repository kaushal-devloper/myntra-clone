const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
const primaryDbURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/myntra";

const Product = require("../modals/Product");

const updates = {
  // First Group (images not showing on home page)
  "Zara A-Line Evening Cocktail Dress": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop",
  "ONLY Floral Summer Maxi Dress": "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=800&auto=format&fit=crop",
  "ONLY Off-Shoulder Ribbed Knit Top": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop",

  // Second Group (change images)
  "Levis Linen Formal White Shirt": "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&auto=format&fit=crop",
  "Zara Platform Wedges Party Sandals": "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&auto=format&fit=crop",
  "Fossil Metal Frame Unisex Sunglasses": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop",
  "Kids Tiered Birthday Party Dress": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop",
  "Kids Soft Cotton Overall Dungaree Set": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&auto=format&fit=crop",
  "Nourishing Avocado Eye Cream": "https://images.unsplash.com/photo-1617897903246-719242758050?w=800&auto=format&fit=crop",
  "Chanel Classic Oud Intense Perfume": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop",
  "MAC Premium Face Foundation Primer": "https://images.unsplash.com/photo-1631730359575-38e4755d772b?w=800&auto=format&fit=crop"
};

async function run() {
  try {
    await mongoose.connect(primaryDbURI);
    console.log("Connected to MongoDB");

    for (const [name, imageUrl] of Object.entries(updates)) {
      const result = await Product.updateOne(
        { name },
        { 
          $set: { 
            image: imageUrl,
            images: [imageUrl]
          } 
        }
      );
      if (result.matchedCount > 0) {
        console.log(`Successfully updated: "${name}"`);
      } else {
        console.log(`Product NOT found in DB: "${name}"`);
      }
    }

    mongoose.connection.close();
    console.log("Done updating product images in DB.");
  } catch (err) {
    console.error("Migration error:", err);
    mongoose.connection.close();
  }
}

run();
