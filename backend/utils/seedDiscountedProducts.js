const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const Product = require("../modals/Product");
const Category = require("../modals/Category");

const sampleProducts = [
  {
    name: "Premium Denim Jacket",
    brand: "Levis",
    price: 4999,
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop",
    stock: 25,
    discontinued: false,
    sizes: ["S", "M", "L", "XL"],
    description: "A classic denim jacket made with high-quality cotton, featuring dual chest pockets and button closures.",
    discount: "40% OFF",
    categoryName: "Men"
  },
  {
    name: "Casual Summer Dress",
    brand: "Zara",
    price: 3999,
    image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop",
    stock: 30,
    discontinued: false,
    sizes: ["S", "M", "L"],
    description: "Lightweight and flowy floral summer dress, perfect for outdoor casual days and beach wear.",
    discount: "60% OFF",
    categoryName: "Women"
  },
  {
    name: "Ultraboost Running Shoes",
    brand: "Adidas",
    price: 15999,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
    stock: 20,
    discontinued: false,
    sizes: ["8", "9", "10", "11"],
    description: "Responsive cushioning and flexible design make these shoes ideal for high-performance runners.",
    discount: "50% OFF",
    categoryName: "Footwear"
  },
  {
    name: "Classic Chronograph Leather Watch",
    brand: "Fossil",
    price: 8999,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop",
    stock: 15,
    discontinued: false,
    sizes: [],
    description: "A timeless analog watch equipped with premium brown leather strap and dual stopwatch dials.",
    discount: "70% OFF",
    categoryName: "Accessories"
  }
];

async function seedDiscountedProducts() {
  try {
    for (const item of sampleProducts) {
      const { categoryName, ...productData } = item;
      
      let existing = await Product.findOne({ name: productData.name, brand: productData.brand });
      if (!existing) {
        const newProduct = new Product(productData);
        await newProduct.save();
        console.log(`Inserted product: ${newProduct.name}`);
        
        const category = await Category.findOne({ name: categoryName });
        if (category) {
          category.productId.push(newProduct._id);
          await category.save();
          console.log(`Linked product ${newProduct.name} to Category ${categoryName}`);
        } else {
          console.log(`Category ${categoryName} not found, skipping association.`);
        }
      } else {
        // Update discount to match requested 40-70% if it exists but might have changed
        if (existing.discount !== productData.discount) {
          existing.discount = productData.discount;
          await existing.save();
          console.log(`Updated product discount for: ${existing.name} to ${existing.discount}`);
        }
      }
    }
    console.log("Discounted products check and seed complete!");
  } catch (err) {
    console.error("Error seeding discounted products:", err);
  }
}

// Support running directly
if (require.main === module) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  const primaryDbURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/myntra";
  mongoose.connect(primaryDbURI).then(async () => {
    console.log("Connected to MongoDB for direct seeding...");
    await seedDiscountedProducts();
    mongoose.connection.close();
  });
}

module.exports = seedDiscountedProducts;
