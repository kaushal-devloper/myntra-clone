const express = require("express");
const mongoose = require("mongoose");
const PushToken = require("../modals/PushToken");
const User = require("../modals/User");
const NotificationLog = require("../modals/NotificationLog");
const NotificationJob = require("../modals/NotificationJob");
const { sendPushNotification, sendBatchPushNotifications, isValidPushToken } = require("../services/notificationService");
const queueService = require("../services/queueService");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/notifications/register
 * Register or update a device's push token.
 */
router.post("/register", auth, async (req, res) => {
  const { userId, token, expoPushToken, platform, deviceId, appVersion } = req.body;
  const finalToken = expoPushToken || token;

  logger.info(`[NotificationRouter] Register request: userId=${userId}, platform=${platform}, deviceId=${deviceId}, appVersion=${appVersion}`);

  // 1. Validate inputs
  if (!userId || !finalToken || !platform || !deviceId) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: userId, token/expoPushToken, platform, deviceId",
    });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: "Invalid userId format" });
  }

  // Safety check: ensure authenticated user matches the userId being registered (unless admin key bypass)
  if (!req.isAdmin && req.user.id !== userId) {
    return res.status(403).json({ success: false, message: "Forbidden: You cannot register tokens for another user" });
  }

  if (!isValidPushToken(finalToken)) {
    return res.status(400).json({ success: false, message: "Invalid Expo push token format" });
  }

  const validPlatforms = ["android", "ios", "web", "unknown"];
  if (!validPlatforms.includes(platform.toLowerCase())) {
    return res.status(400).json({ success: false, message: "Invalid platform value" });
  }

  try {
    // 2. Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 3. Duplicate Prevention & Cleaning
    // Delete any other records with this token to ensure uniqueness
    await PushToken.deleteMany({
      $or: [
        { token: finalToken },
        { expoPushToken: finalToken }
      ],
      $or: [
        { userId: { $ne: userId } },
        { deviceId: { $ne: deviceId } }
      ]
    });

    // Delete any other tokens registered for this user + device combo to avoid piling up dead tokens
    await PushToken.deleteMany({
      userId,
      deviceId,
      token: { $ne: finalToken },
      expoPushToken: { $ne: finalToken }
    });

    // 4. Register or update token
    const pushTokenRecord = await PushToken.findOneAndUpdate(
      { userId, deviceId },
      {
        token: finalToken,
        expoPushToken: finalToken,
        platform: platform.toLowerCase(),
        appVersion: appVersion || "1.0.0"
      },
      { upsert: true, returnDocument: 'after' }
    );

    logger.info(`[NotificationRouter] Token registered successfully: ${finalToken} for user ${userId}`);

    // Update the legacy pushTokens array on the User model for backward compatibility
    await User.findByIdAndUpdate(userId, { $addToSet: { pushTokens: finalToken } });

    return res.status(200).json({
      success: true,
      message: "Push token registered successfully",
      data: pushTokenRecord,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error registering token:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /api/notifications/remove
 * Remove a device token (e.g. on logout)
 */
router.post("/remove", auth, async (req, res) => {
  const { userId, token, expoPushToken, deviceId } = req.body;
  const finalToken = expoPushToken || token;

  logger.info(`[NotificationRouter] Remove request: userId=${userId}, token=${finalToken}, deviceId=${deviceId}`);

  if (!userId && !finalToken) {
    return res.status(400).json({
      success: false,
      message: "Either userId or token must be provided to remove push tokens",
    });
  }

  // Safety check: ensure authenticated user matches the userId being removed (unless admin key bypass)
  if (userId && !req.isAdmin && req.user.id !== userId) {
    return res.status(403).json({ success: false, message: "Forbidden: You cannot remove tokens for another user" });
  }

  try {
    let deletedCount = 0;

    if (finalToken) {
      // Remove specific token
      const result = await PushToken.deleteMany({
        $or: [
          { token: finalToken },
          { expoPushToken: finalToken }
        ]
      });
      deletedCount = result.deletedCount;

      // Clean up legacy pushTokens array on User
      await User.updateMany(
        { pushTokens: finalToken },
        { $pull: { pushTokens: finalToken } }
      );
    } else if (userId && deviceId) {
      // Fetch token before deletion for legacy array cleanup
      const records = await PushToken.find({ userId, deviceId });
      const tokensToRemove = records.map(r => r.token || r.expoPushToken).filter(Boolean);

      // Remove tokens by user and device
      const result = await PushToken.deleteMany({ userId, deviceId });
      deletedCount = result.deletedCount;

      if (tokensToRemove.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { pushTokens: { $in: tokensToRemove } },
        });
      }
    } else if (userId) {
      // Remove all tokens for user
      const records = await PushToken.find({ userId });
      const tokensToRemove = records.map(r => r.token || r.expoPushToken).filter(Boolean);

      const result = await PushToken.deleteMany({ userId });
      deletedCount = result.deletedCount;

      await User.findByIdAndUpdate(userId, { pushTokens: [] });
    }

    logger.info(`[NotificationRouter] Removed ${deletedCount} push token record(s)`);

    return res.status(200).json({
      success: true,
      message: `Successfully removed ${deletedCount} token record(s)`,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error removing token:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /api/notifications/send
 * Trigger a push notification (order status, promotional, delivery status, etc.)
 */
router.post("/send", auth, async (req, res) => {
  const { userId, title, body, data, type } = req.body;

  if (!userId || !title || !body || !type) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: userId, title, body, type",
    });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: "Invalid userId format" });
  }

  // Safety check: ensure authenticated user matches the target userId (unless admin key bypass)
  if (!req.isAdmin && req.user.id !== userId) {
    return res.status(403).json({ success: false, message: "Forbidden: You cannot trigger notifications for another user" });
  }

  const validTypes = ["order_update", "payment_status", "delivery_alert", "cart_reminder", "promotional", "security_alert"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid notification type. Must be one of: ${validTypes.join(", ")}`,
    });
  }

  try {
    const log = await sendPushNotification(userId, title, body, data || {}, type);
    
    if (log.status === "sent" || log.status === "delivered" || log.status === "clicked") {
      return res.status(200).json({
        success: true,
        message: "Notification sent successfully",
        data: log,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send notification (no active tokens or API error)",
        data: log,
      });
    }
  } catch (error) {
    logger.error("[NotificationRouter] Error sending notification:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /api/notifications/send-bulk
 * Trigger bulk push notifications. Secured so only Admin can call it.
 */
router.post("/send-bulk", auth, async (req, res) => {
  // Enforce admin permission for bulk sending
  if (!req.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Only administrators can trigger bulk push notifications.",
    });
  }

  const { userIds, title, body, data, type } = req.body;

  if (!title || !body || !type) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: title, body, type",
    });
  }

  const validTypes = ["order_update", "payment_status", "delivery_alert", "cart_reminder", "promotional", "security_alert"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid notification type. Must be one of: ${validTypes.join(", ")}`,
    });
  }

  try {
    let targetUserIds = userIds;

    // If no userIds provided, fetch all users with registered tokens
    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      targetUserIds = await PushToken.find().distinct("userId");
      logger.info(`[NotificationRouter] Sending bulk notifications to all ${targetUserIds.length} users with active tokens`);
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No registered users or active device tokens found to send notifications to.",
      });
    }

    const logs = await sendBatchPushNotifications(targetUserIds, title, body, data || {}, type);
    
    return res.status(200).json({
      success: true,
      message: `Bulk notifications processed for ${targetUserIds.length} user(s)`,
      sentCount: logs.filter(l => ["sent", "delivered", "clicked"].includes(l.status)).length,
      failedCount: logs.filter(l => l.status === "failed").length,
      data: logs,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error sending bulk notifications:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /api/notifications/track
 * Track notification delivery (delivered) and taps (clicked) for analytics.
 */
router.post("/track", auth, async (req, res) => {
  const { logId, event } = req.body;

  if (!logId || !event) {
    return res.status(400).json({ success: false, message: "Missing required fields: logId, event" });
  }

  const validEvents = ["delivered", "clicked"];
  if (!validEvents.includes(event)) {
    return res.status(400).json({ success: false, message: "Invalid event type" });
  }

  try {
    const log = await NotificationLog.findById(logId);
    if (!log) {
      return res.status(404).json({ success: false, message: "Notification log not found" });
    }

    // Safety check: ensure the user owns this notification log (unless admin)
    if (!req.isAdmin && req.user.id !== log.userId.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: You cannot modify this log" });
    }

    // Only update status if the progression is forward (e.g. sent -> delivered -> clicked)
    if (event === "delivered" && log.status !== "clicked") {
      log.status = "delivered";
    } else if (event === "clicked") {
      log.status = "clicked";
    }

    await log.save();
    logger.info(`[NotificationRouter] Tracked "${event}" for logId ${logId}`);

    return res.status(200).json({
      success: true,
      message: `Successfully tracked ${event} event`,
      data: log,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error tracking event:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * GET /api/notifications/logs/:userId
 * Fetch notification history log for a specific user
 */
router.get("/logs/:userId", auth, async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: "Invalid userId format" });
  }

  // Safety check: ensure authenticated user matches the logs being requested (unless admin)
  if (!req.isAdmin && req.user.id !== userId) {
    return res.status(403).json({ success: false, message: "Forbidden: You cannot access notifications for another user" });
  }

  try {
    const logs = await NotificationLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error fetching notification logs:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * PUT /api/notifications/logs/:logId/read
 * Mark a specific notification log as read
 */
router.put("/logs/:logId/read", auth, async (req, res) => {
  const { logId } = req.params;

  if (!mongoose.isValidObjectId(logId)) {
    return res.status(400).json({ success: false, message: "Invalid logId format" });
  }

  try {
    const log = await NotificationLog.findById(logId);
    if (!log) {
      return res.status(404).json({ success: false, message: "Notification log not found" });
    }

    // Safety check: ensure authenticated user owns this log
    if (!req.isAdmin && req.user.id !== log.userId.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: You cannot modify this notification" });
    }

    log.read = true;
    await log.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: log,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error marking notification as read:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * PUT /api/notifications/logs/user/:userId/read-all
 * Mark all notification logs for a user as read
 */
router.put("/logs/user/:userId/read-all", auth, async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: "Invalid userId format" });
  }

  // Safety check: ensure authenticated user matches the logs being requested (unless admin)
  if (!req.isAdmin && req.user.id !== userId) {
    return res.status(403).json({ success: false, message: "Forbidden: You cannot modify notifications for another user" });
  }

  try {
    const result = await NotificationLog.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully marked ${result.modifiedCount} notifications as read`,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error marking all notifications as read:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * DELETE /api/notifications/logs/user/:userId
 * Clear all notification logs for a user
 */
router.delete("/logs/user/:userId", auth, async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: "Invalid userId format" });
  }

  // Safety check: ensure authenticated user matches the logs being requested (unless admin)
  if (!req.isAdmin && req.user.id !== userId) {
    return res.status(403).json({ success: false, message: "Forbidden: You cannot delete notifications for another user" });
  }

  try {
    const result = await NotificationLog.deleteMany({ userId });

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} notifications from history`,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error deleting notification logs:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * DELETE /api/notifications/logs/:logId
 * Delete a specific notification log from history
 */
router.delete("/logs/:logId", auth, async (req, res) => {
  const { logId } = req.params;

  if (!mongoose.isValidObjectId(logId)) {
    return res.status(400).json({ success: false, message: "Invalid logId format" });
  }

  try {
    const log = await NotificationLog.findById(logId);
    if (!log) {
      return res.status(404).json({ success: false, message: "Notification log not found" });
    }

    // Safety check: ensure authenticated user owns this log (unless admin)
    if (!req.isAdmin && req.user.id !== log.userId.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: You cannot delete this notification" });
    }

    await NotificationLog.findByIdAndDelete(logId);

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error deleting notification:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});


/**
 * POST /api/notifications/schedule
 * Schedule a push notification using the queue service (supports BullMQ/Redis and MongoDB polling)
 */
router.post("/schedule", auth, async (req, res) => {
  const { userId, title, body, data, type, delaySeconds, uniqueKey } = req.body;

  if (!userId || !title || !body || !type) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: userId, title, body, type",
    });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: "Invalid userId format" });
  }

  // Safety check: ensure authenticated user matches the userId (unless admin)
  if (!req.isAdmin && req.user.id !== userId) {
    return res.status(403).json({ success: false, message: "Forbidden: You cannot schedule notifications for another user" });
  }

  const delay = delaySeconds ? parseInt(delaySeconds, 10) : 0;
  if (isNaN(delay) || delay < 0) {
    return res.status(400).json({ success: false, message: "delaySeconds must be a non-negative number" });
  }

  const validTypes = ["order_update", "payment_status", "delivery_alert", "cart_reminder", "promotional", "security_alert"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid notification type. Must be one of: ${validTypes.join(", ")}`,
    });
  }

  try {
    const result = await queueService.scheduleNotification({
      userId,
      title,
      body,
      data: data || {},
      type,
      delaySeconds: delay,
      uniqueKey,
    });

    if (!result.success) {
      if (result.duplicate) {
        return res.status(409).json({
          success: false,
          message: "Duplicate notification blocked by validation logic",
          data: result.data,
        });
      }
      return res.status(500).json({ success: false, message: "Failed to schedule notification" });
    }

    return res.status(201).json({
      success: true,
      message: `Notification scheduled successfully for ${new Date(Date.now() + delay * 1000).toISOString()}`,
      data: result.data,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error scheduling notification:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * PUT /api/notifications/schedule/:jobId
 * Update a scheduled notification before it runs
 */
router.put("/schedule/:jobId", auth, async (req, res) => {
  const { jobId } = req.params;
  const { title, body, data, delaySeconds } = req.body;

  if (!mongoose.isValidObjectId(jobId)) {
    return res.status(400).json({ success: false, message: "Invalid jobId format" });
  }

  try {
    const job = await queueService.getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Scheduled job not found" });
    }

    // Auth check: Owner of job or admin
    if (!req.isAdmin && req.user.id !== job.userId._id.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: You cannot modify this scheduled notification" });
    }

    const result = await queueService.updateNotification(jobId, { title, body, data, delaySeconds });
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: "Scheduled notification updated successfully",
      data: result.data,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error updating scheduled notification:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /api/notifications/schedule/:jobId/cancel
 * Cancel a scheduled notification
 */
router.post("/schedule/:jobId/cancel", auth, async (req, res) => {
  const { jobId } = req.params;

  if (!mongoose.isValidObjectId(jobId)) {
    return res.status(400).json({ success: false, message: "Invalid jobId format" });
  }

  try {
    const job = await queueService.getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Scheduled job not found" });
    }

    // Auth check: Owner of job or admin
    if (!req.isAdmin && req.user.id !== job.userId._id.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: You cannot cancel this scheduled notification" });
    }

    const result = await queueService.cancelNotification(jobId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: "Scheduled notification cancelled successfully",
      data: result.data,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error cancelling scheduled notification:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * GET /api/notifications/schedule/:jobId/status
 * Get status of a specific scheduled job
 */
router.get("/schedule/:jobId/status", auth, async (req, res) => {
  const { jobId } = req.params;

  if (!mongoose.isValidObjectId(jobId)) {
    return res.status(400).json({ success: false, message: "Invalid jobId format" });
  }

  try {
    const job = await queueService.getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Scheduled job not found" });
    }

    // Auth check: Owner of job or admin
    if (!req.isAdmin && req.user.id !== job.userId._id.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: You cannot view this scheduled notification" });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error fetching job status:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * GET /api/notifications/admin/monitor
 * Queue and analytics monitoring API for admins
 */
router.get("/admin/monitor", auth, async (req, res) => {
  if (!req.isAdmin) {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access only" });
  }

  try {
    const metrics = await queueService.getQueueMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    logger.error("[NotificationRouter] Error fetching monitor metrics:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * GET /api/notifications/admin/failed
 * Fetch all failed notification jobs for monitoring
 */
router.get("/admin/failed", auth, async (req, res) => {
  if (!req.isAdmin) {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access only" });
  }

  try {
    const failedJobs = await NotificationJob.find({ status: "failed" })
      .populate("userId", "name email")
      .sort({ updatedAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: failedJobs.length,
      data: failedJobs,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error fetching failed jobs:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * GET /api/notifications/admin/delivered
 * Fetch all successfully delivered notifications
 */
router.get("/admin/delivered", auth, async (req, res) => {
  if (!req.isAdmin) {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access only" });
  }

  try {
    const deliveredLogs = await NotificationLog.find({ status: { $in: ["sent", "delivered", "clicked"] } })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: deliveredLogs.length,
      data: deliveredLogs,
    });
  } catch (error) {
    logger.error("[NotificationRouter] Error fetching delivered logs:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
