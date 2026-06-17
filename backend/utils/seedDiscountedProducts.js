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
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log("No categories found in database. Seeding default categories and products...");
      
      const generateId = () => new mongoose.Types.ObjectId();

      const menImages = [
        "https://images.unsplash.com/photo-1596755094514-f87e32f85e23?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1588099768523-f4e6a5679d88?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1520975954732-57dd22299614?w=500&auto=format&fit=crop"
      ];

      const womenImages = [
        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1502716115624-b56ef3a45c10?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1434389678369-e889417833a6?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1618244972963-dbad0c4abf18?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1589465880150-b0c619fbdf18?w=500&auto=format&fit=crop"
      ];

      const footwearImages = [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1534653299134-96a171b61581?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=500&auto=format&fit=crop"
      ];

      const accessoriesImages = [
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1577803645773-f96470509666?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1599643478524-fb524458f447?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&auto=format&fit=crop"
      ];

      const kidsImages = [
        "https://images.unsplash.com/photo-1519241047957-be31d7379a5d?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?w=500&auto=format&fit=crop"
      ];

      const beautyImages = [
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500&auto=format&fit=crop"
      ];

      const categoryImagePools = [menImages, womenImages, footwearImages, accessoriesImages, kidsImages, beautyImages];

      const categories = [
        { _id: generateId(), name: "Men", subcategory: ["Shirts", "Jeans", "Jackets"], image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&auto=format&fit=crop", productId: [] },
        { _id: generateId(), name: "Women", subcategory: ["Dresses", "Tops", "Skirts"], image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop", productId: [] },
        { _id: generateId(), name: "Footwear", subcategory: ["Sneakers", "Boots", "Sandals"], image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop", productId: [] },
        { _id: generateId(), name: "Accessories", subcategory: ["Watches", "Bags", "Sunglasses"], image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop", productId: [] },
        { _id: generateId(), name: "Kids", subcategory: ["T-Shirts", "Toys", "Dresses"], image: "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500&auto=format&fit=crop", productId: [] },
        { _id: generateId(), name: "Beauty", subcategory: ["Makeup", "Skincare", "Fragrance"], image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&auto=format&fit=crop", productId: [] },
      ];

      const products = [];
      const brands = ["Roadster", "Levis", "Nike", "Adidas", "Puma", "ONLY", "H&M", "Zara", "Gucci", "Fossil", "MAC", "Mothercare"];
      const under599Prices = [299, 399, 499, 549, 199];
      const regularPrices = [799, 999, 1299, 2499, 3999, 1499, 1999];

      for (let i = 0; i < 50; i++) {
        let catIndex = i % 6;
        let pid = generateId();
        let pool = categoryImagePools[catIndex];
        let productImage = pool[Math.floor(Math.random() * pool.length)];
        let price = Math.random() < 0.2 ? under599Prices[Math.floor(Math.random() * under599Prices.length)] : regularPrices[Math.floor(Math.random() * regularPrices.length)];
        let hasDiscount = Math.random() > 0.3;
        let discountStr = hasDiscount ? `${10 + Math.floor(Math.random() * 6) * 10}% OFF` : "";

        let p = {
          _id: pid,
          name: `Premium ${categories[catIndex].subcategory[i % 3]} ${i + 1}`,
          brand: brands[Math.floor(Math.random() * brands.length)],
          price: price,
          image: productImage,
          stock: Math.floor(Math.random() * 50) + 10,
          discontinued: false,
          sizes: catIndex === 2 ? ["7", "8", "9", "10"] : (catIndex === 3 || catIndex === 5 ? [] : ["S", "M", "L", "XL"]),
          description: `High quality ${categories[catIndex].subcategory[i % 3]} perfect for all occasions. Made with premium materials for maximum comfort and style.`,
          discount: discountStr
        };
        products.push(p);
        categories[catIndex].productId.push(pid);
      }

      await Product.insertMany(products);
      await Category.insertMany(categories);
      console.log("Seeded default categories and 50 products successfully!");
    }

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
