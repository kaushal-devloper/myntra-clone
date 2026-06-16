const Product = require("../modals/Product");
const BrowsingHistory = require("../modals/BrowsingHistory");
const Wishlist = require("../modals/Whishlist");
const ProductPopularity = require("../modals/ProductPopularity");
const Category = require("../modals/Category");
const mongoose = require("mongoose");

exports.trackView = async (req, res) => {
    try {
        const { userId, productId } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, message: "productId is required" });
        }

        if (userId && mongoose.isValidObjectId(userId)) {
            // Update Browsing History
            let historyDoc = await BrowsingHistory.findOne({ userId });
            if (!historyDoc) {
                historyDoc = new BrowsingHistory({ userId, history: [] });
            }

            // Remove duplicate if it exists
            historyDoc.history = historyDoc.history.filter(item => item.productId && item.productId.toString() !== productId);

            // Add to front (latest-first)
            historyDoc.history.unshift({ productId, viewedAt: new Date() });

            // Enforce max 20 items
            if (historyDoc.history.length > 20) {
                historyDoc.history = historyDoc.history.slice(0, 20);
            }

            await historyDoc.save();
        }

        // Update Product Popularity
        let popularityDoc = await ProductPopularity.findOne({ productId });
        if (!popularityDoc) {
            popularityDoc = new ProductPopularity({ productId });
        }
        popularityDoc.views += 1;
        popularityDoc.score += 1; // Basic scoring logic
        await popularityDoc.save();

        res.status(200).json({ success: true, message: "View tracked successfully" });
    } catch (error) {
        console.error("Error in trackView:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.getRecommendations = async (req, res) => {
    try {
        const { userId } = req.params;
        let recommendedProducts = [];
        let seedProductIds = [];

        if (userId && mongoose.isValidObjectId(userId)) {
            // Get user history and wishlist WITHOUT populating to prevent N+1 and reduce memory
            const [historyDoc, wishlistDocs] = await Promise.all([
                BrowsingHistory.findOne({ userId }).select('history.productId').lean(),
                Wishlist.find({ userId }).select('productId').lean()
            ]);

            if (historyDoc && historyDoc.history) {
                seedProductIds.push(...historyDoc.history.map(h => h.productId));
            }
            if (wishlistDocs) {
                seedProductIds.push(...wishlistDocs.map(w => w.productId));
            }

            // Convert to string to avoid duplicates and remove nulls
            seedProductIds = [...new Set(seedProductIds.filter(Boolean).map(id => id.toString()))];

            // 1. Basic Recommendation Logic using Aggregation Pipeline
            if (seedProductIds.length > 0) {
                const seedObjectIds = seedProductIds.map(id => new mongoose.Types.ObjectId(id));

                const pipeline = [
                    // Find categories containing the seed products
                    { $match: { productId: { $in: seedObjectIds } } },
                    // Unwind products to flatten them
                    { $unwind: "$productId" },
                    // Exclude the seed products themselves
                    { $match: { productId: { $nin: seedObjectIds } } },
                    // Group by unique productId to avoid duplicates
                    { $group: { _id: "$productId" } },
                    // Randomly sample up to 10 products
                    { $sample: { size: 10 } },
                    // Lookup full product details from products collection
                    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
                    // Flatten the array from lookup
                    { $unwind: "$productDetails" },
                    // Replace root to make the product detail the main document
                    { $replaceRoot: { newRoot: "$productDetails" } }
                ];
                
                recommendedProducts = await Category.aggregate(pipeline);
            }
        }

        // 2. Fallback to Popularity using Aggregation
        if (recommendedProducts.length < 10) {
            const needed = 10 - recommendedProducts.length;
            const excludeIds = recommendedProducts.map(p => p._id.toString());
            const allExcludedStr = [...new Set([...excludeIds, ...seedProductIds])];
            const allExcludedObjIds = allExcludedStr.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id));
            
            const popularPipeline = [
                { $match: { productId: { $nin: allExcludedObjIds } } },
                { $sort: { score: -1, views: -1 } },
                { $limit: needed },
                { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "productDetails" } },
                { $unwind: "$productDetails" },
                { $replaceRoot: { newRoot: "$productDetails" } }
            ];

            const popularItems = await ProductPopularity.aggregate(popularPipeline);
            recommendedProducts = [...recommendedProducts, ...popularItems];
        }

        // 3. Final Fallback to Generic Products using Aggregation
        if (recommendedProducts.length < 10) {
            const needed = 10 - recommendedProducts.length;
            const excludeIds = recommendedProducts.map(p => p._id.toString());
            const excludeObjIds = excludeIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id));
            
            const genericItems = await Product.aggregate([
                { $match: { _id: { $nin: excludeObjIds } } },
                { $sample: { size: needed } }
            ]);
            recommendedProducts = [...recommendedProducts, ...genericItems];
        }

        res.status(200).json({ success: true, recommendations: recommendedProducts });

    } catch (error) {
        console.error("Error in getRecommendations:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
