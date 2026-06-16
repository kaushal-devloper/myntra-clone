const bcrypt = require("bcryptjs");
const User = require("../modals/User");
const Order = require("../modals/Order");
const Transaction = require("../models/Transaction");
const AuditLog = require("../models/AuditLog");
const Bag = require("../models/Bag");

// ─── Change Password ──────────────────────────────────────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: currentPassword, newPassword, confirmPassword.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password.",
      });
    }

    // Find user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("[SettingsController] changePassword error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to change password." });
  }
};

// ─── Get Address ──────────────────────────────────────────────────────────────

exports.getAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("address").lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      data: user.address || null,
    });
  } catch (err) {
    console.error("[SettingsController] getAddress error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch address." });
  }
};

// ─── Update Address ───────────────────────────────────────────────────────────

exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, mobile, addressLine, city, state, pincode } = req.body;

    // Validation
    if (!fullName || !mobile || !addressLine || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required: fullName, mobile, addressLine, city, state, pincode.",
      });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be a 6-digit number.",
      });
    }

    if (!/^\d{10}$/.test(mobile.replace(/\D/g, ""))) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        address: {
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          addressLine: addressLine.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
      },
      { returnDocument: "after" }
    ).select("address");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      data: updatedUser.address,
    });
  } catch (err) {
    console.error("[SettingsController] updateAddress error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to update address." });
  }
};

// ─── Reset Database (user data only) ──────────────────────────────────────────

exports.resetUserData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Models to clear
    const Wishlist = require("../modals/Whishlist");
    const RecentlyViewed = require("../modals/RecentlyViewed");
    const NotificationLog = require("../modals/NotificationLog");
    const NotificationJob = require("../modals/NotificationJob");
    const BrowsingHistory = require("../modals/BrowsingHistory");

    // Run all deletions in parallel for performance
    const results = await Promise.allSettled([
      Order.deleteMany({ userId }),
      Transaction.deleteMany({ userId }),
      AuditLog.deleteMany({ userId }),
      Wishlist.deleteMany({ userId }),
      RecentlyViewed.deleteMany({ userId }),
      NotificationLog.deleteMany({ userId }),
      NotificationJob.deleteMany({ userId }),
      BrowsingHistory.deleteMany({ userId }),
      // Clear bag contents but keep the bag document
      Bag.findOneAndUpdate(
        { userId },
        { activeItems: [], savedItems: [], version: 1 },
        { returnDocument: "after" }
      ),
    ]);

    // Collect summary of what was cleared
    const labels = [
      "Orders", "Transactions", "AuditLogs", "Wishlist",
      "RecentlyViewed", "Notifications", "NotificationJobs",
      "BrowsingHistory", "Bag",
    ];

    const summary = {};
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        summary[labels[index]] = result.value?.deletedCount ?? "cleared";
      } else {
        summary[labels[index]] = "error";
        console.error(`[ResetUserData] Error clearing ${labels[index]}:`, result.reason?.message);
      }
    });

    return res.status(200).json({
      success: true,
      message: "All user data has been reset successfully. Your account and login credentials are preserved.",
      data: summary,
    });
  } catch (err) {
    console.error("[SettingsController] resetUserData error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to reset user data." });
  }
};
