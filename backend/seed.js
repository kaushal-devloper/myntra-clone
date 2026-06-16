const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

const Product = require("./modals/Product");
const Category = require("./modals/Category");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const primaryDbURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/myntra";

async function seedDatabase() {
  try {
    await mongoose.connect(primaryDbURI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log("Cleared existing products and categories");

    // Read JSON files
    const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, "sample_data", "products.json"), "utf-8"));
    const categoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, "sample_data", "categories.json"), "utf-8"));

    // Insert Products
    // Need to handle OIDs
    const cleanProducts = productsData.map(p => ({
      _id: p._id.$oid,
      name: p.name,
      brand: p.brand,
      price: p.price,
      image: p.image,
      sizes: ["S", "M", "L", "XL"],
      description: "Sample product description for " + p.name,
      discount: "10% OFF"
    }));
    await Product.insertMany(cleanProducts);
    console.log("Products inserted!");

    // Insert Categories
    const cleanCategories = categoriesData.map(c => ({
      _id: c._id.$oid,
      name: c.name,
      subcategory: c.subcategory,
      image: c.image,
      productId: c.productId.map(pid => pid.$oid)
    }));
    await Category.insertMany(cleanCategories);
    console.log("Categories inserted!");

    mongoose.connection.close();
    console.log("Done seeding!");
  } catch (err) {
    console.error("Error seeding:", err);
    mongoose.connection.close();
  }
}

seedDatabase();
