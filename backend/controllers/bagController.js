const Bag = require("../models/Bag");
const Product = require("../modals/Product");

// Wrapper for optimistic concurrency with retries
const withRetry = async (userId, operation) => {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    let bag = await Bag.findOne({ userId });
    let isNewBag = false;
    
    if (!bag || bag.activeItems === undefined) {
      if (bag && bag.activeItems === undefined) {
        // Delete old flat schema document to migrate to nested schema
        await Bag.deleteOne({ _id: bag._id });
      }
      bag = new Bag({ userId, activeItems: [], savedItems: [], version: 1 });
      isNewBag = true;
    }

    const { shouldSave, result, error, status } = await operation(bag);

    if (error) {
       return { success: false, message: error, status: status || 400 };
    }

    if (!shouldSave) {
       return { success: true, data: bag };
    }

    if (isNewBag) {
       await bag.save();
       return { success: true, data: bag };
    } else {
       const updatedBag = await Bag.findOneAndUpdate(
         { _id: bag._id, version: bag.version },
         { 
           $set: { activeItems: bag.activeItems, savedItems: bag.savedItems }, 
           $inc: { version: 1 },
         },
         { returnDocument: 'after', timestamps: true } // timestamps: true updates updatedAt
       );

       if (updatedBag) {
          return { success: true, data: updatedBag };
       }
       // Version mismatch, retry
       attempt++;
    }
  }
  return { success: false, message: "Concurrency error. Please try again.", status: 409 };
};

// @desc    Get user bag (fetch or create empty)
// @route   GET /api/bag/:userId
const getBag = async (req, res) => {
  try {
    const { userId } = req.params;

    let bag = await Bag.findOne({ userId })
      .populate('activeItems.productId')
      .populate('savedItems.productId')
      .lean();

    // If bag does not exist or has flat legacy format, create/migrate
    if (!bag || bag.activeItems === undefined) {
      if (bag && bag.activeItems === undefined) {
        await Bag.deleteOne({ _id: bag._id });
      }
      const newBag = await Bag.create({
        userId,
        activeItems: [],
        savedItems: [],
        version: 1
      });
      bag = newBag.toObject ? newBag.toObject() : newBag;
    }

    let totalItems = 0;
    let cartTotal = 0;

    // Filter out items where productId is null (e.g., product was deleted)
    if (bag && bag.activeItems) {
      bag.activeItems = bag.activeItems.filter(item => item.productId != null);
    }

    bag.activeItems.forEach(item => {
      totalItems += item.quantity;
      let itemPrice = item.price || (item.productId && item.productId.price) || 0;
      
      // Calculate discount if available
      if (item.productId && item.productId.discount) {
        const disc = item.productId.discount;
        if (typeof disc === 'string' && disc.includes('%')) {
          const pct = parseFloat(disc.replace(/[^0-9.]/g, ''));
          if (!isNaN(pct)) {
            itemPrice = itemPrice - (itemPrice * (pct / 100));
          }
        } else if (typeof disc === 'string') {
          const flat = parseFloat(disc.replace(/[^0-9.]/g, ''));
          if (!isNaN(flat)) {
            itemPrice = itemPrice - flat;
          }
        } else if (typeof disc === 'number') {
           itemPrice = itemPrice - disc;
        }
      }
      cartTotal += itemPrice * item.quantity;
    });

    res.status(200).json({ 
      success: true, 
      data: bag,
      activeItems: bag.activeItems,
      savedItems: bag.savedItems,
      totalItems,
      cartTotal: Math.round(cartTotal)
    });
  } catch (error) {
    console.error("Error in getBag:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Add item to bag
// @route   POST /api/bag/add
const addToBag = async (req, res) => {
  try {
    const { userId, productId, quantity, size } = req.body;

    if (!userId || !productId || !quantity) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (product.discontinued) {
      return res.status(400).json({ success: false, message: "Product is discontinued" });
    }

    const result = await withRetry(userId, async (bag) => {
      const itemIndex = bag.activeItems.findIndex(
        (item) => item.productId.toString() === productId && item.size === size
      );

      if (itemIndex > -1) {
        bag.activeItems[itemIndex].quantity += quantity;
        
        if (product.stock !== undefined && product.stock < bag.activeItems[itemIndex].quantity) {
            return { shouldSave: false, error: "Not enough stock for the updated quantity", status: 400 };
        }
      } else {
        if (product.stock !== undefined && product.stock < quantity) {
          return { shouldSave: false, error: "Not enough stock available", status: 400 };
        }
        bag.activeItems.push({
          productId,
          quantity,
          size,
          price: product.price 
        });
      }
      return { shouldSave: true };
    });

    if (!result.success) {
       return res.status(result.status).json(result);
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in addToBag:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update quantity of item in bag
// @route   POST /api/bag/update-quantity
const updateQuantity = async (req, res) => {
  try {
    const { userId, productId, size, quantity } = req.body;
    
    if (!userId || !productId || quantity === undefined) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const product = await Product.findById(productId);
    
    const result = await withRetry(userId, async (bag) => {
      const itemIndex = bag.activeItems.findIndex(
        (item) => item.productId.toString() === productId && (item.size === size || (!item.size && !size))
      );

      if (itemIndex > -1) {
        if (quantity <= 0) {
           bag.activeItems.splice(itemIndex, 1);
        } else {
           if (product && product.stock !== undefined && product.stock < quantity) {
             return { shouldSave: false, error: "Not enough stock", status: 400 };
           }
           bag.activeItems[itemIndex].quantity = quantity;
        }
        return { shouldSave: true };
      }
      return { shouldSave: false, error: "Item not found in bag", status: 404 };
    });

    if (!result.success) {
      return res.status(result.status).json(result);
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in updateQuantity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Move item to savedItems
// @route   POST /api/bag/save-for-later
const saveForLater = async (req, res) => {
  try {
    const { userId, productId, size } = req.body;
    if (!userId || !productId) return res.status(400).json({ success: false, message: "Missing fields" });

    const result = await withRetry(userId, async (bag) => {
      const activeIndex = bag.activeItems.findIndex(
        (item) => item.productId.toString() === productId && (item.size === size || (!item.size && !size))
      );

      if (activeIndex > -1) {
        const itemToSave = bag.activeItems[activeIndex];
        bag.activeItems.splice(activeIndex, 1);

        const savedIndex = bag.savedItems.findIndex(
          (item) => item.productId.toString() === productId && (item.size === size || (!item.size && !size))
        );

        if (savedIndex === -1) {
          bag.savedItems.push(itemToSave);
        } else {
          bag.savedItems[savedIndex].quantity += itemToSave.quantity;
        }
        return { shouldSave: true };
      }
      return { shouldSave: false, error: "Item not found in bag", status: 404 };
    });

    if (!result.success) {
       return res.status(result.status).json(result);
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in saveForLater:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Move item back to activeItems
// @route   POST /api/bag/move-to-bag
const moveToBag = async (req, res) => {
  try {
    const { userId, productId, size } = req.body;
    if (!userId || !productId) return res.status(400).json({ success: false, message: "Missing fields" });

    const result = await withRetry(userId, async (bag) => {
      const savedIndex = bag.savedItems.findIndex(
        (item) => item.productId.toString() === productId && (item.size === size || (!item.size && !size))
      );

      if (savedIndex > -1) {
        const itemToMove = bag.savedItems[savedIndex];
        bag.savedItems.splice(savedIndex, 1);

        const activeIndex = bag.activeItems.findIndex(
          (item) => item.productId.toString() === productId && (item.size === size || (!item.size && !size))
        );

        if (activeIndex > -1) {
          bag.activeItems[activeIndex].quantity += itemToMove.quantity;
        } else {
          bag.activeItems.push(itemToMove);
        }
        return { shouldSave: true };
      }
      return { shouldSave: false, error: "Item not found in saved items", status: 404 };
    });

    if (!result.success) {
      return res.status(result.status).json(result);
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in moveToBag:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Remove item from savedItems
// @route   POST /api/bag/remove-saved
const removeSavedItem = async (req, res) => {
  try {
    const { userId, productId, size } = req.body;
    if (!userId || !productId) return res.status(400).json({ success: false, message: "Missing fields" });

    const result = await withRetry(userId, async (bag) => {
      const initialLength = bag.savedItems.length;
      bag.savedItems = bag.savedItems.filter(
        (item) => !(item.productId.toString() === productId && (item.size === size || (!item.size && !size)))
      );
      
      if (initialLength !== bag.savedItems.length) {
         return { shouldSave: true };
      }
      return { shouldSave: false };
    });

    if (!result.success) {
      return res.status(result.status).json(result);
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in removeSavedItem:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Remove item from activeItems
// @route   POST /api/bag/remove
const removeFromBag = async (req, res) => {
  try {
    const { userId, productId, size } = req.body;
    if (!userId || !productId) return res.status(400).json({ success: false, message: "Missing fields" });

    const result = await withRetry(userId, async (bag) => {
      const initialLength = bag.activeItems.length;
      bag.activeItems = bag.activeItems.filter(
        (item) => !(item.productId.toString() === productId && (item.size === size || (!item.size && !size)))
      );
      
      if (initialLength !== bag.activeItems.length) {
         return { shouldSave: true };
      }
      return { shouldSave: false };
    });

    if (!result.success) {
       return res.status(result.status).json(result);
    }
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in removeFromBag:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Clear all items from activeItems (e.g. on checkout)
// @route   POST /api/bag/clear
const clearBag = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

    const result = await withRetry(userId, async (bag) => {
      if (bag.activeItems.length > 0) {
        bag.activeItems = [];
        return { shouldSave: true };
      }
      return { shouldSave: false };
    });

    if (!result.success) {
       return res.status(result.status).json(result);
    }

    // Trigger real-time order status and payment success updates
    try {
      const { sendPushNotification } = require("../services/notificationService");
      const orderId = "ORD" + Math.floor(100000 + Math.random() * 900000);

      // Payment Success notification
      sendPushNotification(
        userId,
        "Payment Success of ₹4,087! 💳",
        `Thank you! We received your payment for order ${orderId}.`,
        { notificationType: "payment_status", route: "/orders", orderId },
        "payment_status"
      ).catch(err => console.error("Error sending payment success notification:", err));

      // Order Update notification (shortly after)
      setTimeout(() => {
        sendPushNotification(
          userId,
          "Order Placed Successfully! 📦",
          `Your order ${orderId} has been placed. You can check details in the orders screen.`,
          { notificationType: "order_update", route: "/orders", orderId },
          "order_update"
        ).catch(err => console.error("Error sending order update notification:", err));
      }, 1500);
    } catch (e) {
      console.error("Failed to trigger order/payment notifications:", e);
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in clearBag:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getBag,
  addToBag,
  updateQuantity,
  saveForLater,
  moveToBag,
  removeSavedItem,
  removeFromBag,
  clearBag
};
