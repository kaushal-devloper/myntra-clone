const PushToken = require("../modals/PushToken");
const NotificationLog = require("../modals/NotificationLog");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const webpush = require("web-push");

// Initialize web-push VAPID details
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BPQZdZVU5SZqXd7AWkzE2Pc4OAucZZT6hQrboG9uLQoTTkq5Vf3LhM4b0_yd8gvSzgXVuHWP4qqLm4X9HTX7Wxs";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "9R5LgLxUljOOq74Z9ZcOEcgQVyk3TmjqY9l9H2_Pe2M";

try {
  webpush.setVapidDetails(
    "mailto:support@myntraclone.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  logger.error("[NotificationService] Error setting VAPID details:", e.message);
}

async function sendWebPushNotification(subscriptionString, title, body, data = {}, logId) {
  try {
    const subscriptionJson = JSON.parse(subscriptionString.substring("WebPushSubscription:".length));
    const payload = JSON.stringify({
      title,
      body,
      data: {
        ...data,
        logId
      }
    });

    const res = await webpush.sendNotification(subscriptionJson, payload);
    logger.info(`[NotificationService] Web Push sent successfully. Status: ${res.statusCode}`);
    return { success: true, id: res.headers?.location || `webpush-${Date.now()}` };
  } catch (error) {
    logger.error("[NotificationService] Web Push failed:", error.message);
    const isUnregistered = error.statusCode === 410 || error.statusCode === 404;
    return { success: false, error: error.message, isUnregistered };
  }
}

/**
 * Validate Push Token format (supports Expo and Web Push)
 */
function isValidPushToken(token) {
  if (typeof token !== "string") return false;
  const expoRegex = /^(ExponentPushToken|ExpoPushToken)\[.+\]$/;
  const mockRegex = /^ExponentPushToken\[Mock-.+\]$/;
  return expoRegex.test(token) || mockRegex.test(token) || token.startsWith("WebPushSubscription:");
}

/**
 * Helper to determine if a notification is "important" and should be shown in the system notification tray.
 * Less important notifications (e.g. low discount promo campaigns) are stored in the database history
 * but are not pushed to the system tray.
 */
function isImportantNotification(type, title, body, data) {
  // 1. Order updates, delivery alerts, payment status, and security alerts are always important
  if (["order_update", "delivery_alert", "payment_status", "security_alert"].includes(type)) {
    return true;
  }

  // 2. Promotional and cart reminders must contain high discounts (>= 50% off) to be pushed to the tray
  if (["promotional", "cart_reminder"].includes(type)) {
    if (data && (data.isHighDiscount === true || data.isHighDiscount === "true")) {
      return true;
    }
    const discountRegex = /\b([5-9][0-9]|100)\s*%/i;
    if (discountRegex.test(title) || discountRegex.test(body)) {
      return true;
    }
    const offRegex = /\b([5-9][0-9]|100)\s*off\b/i;
    if (offRegex.test(title) || offRegex.test(body)) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Sends a push notification to a user.
 * Includes duplicate prevention, token validation, badge count sync, and tracking support.
 * @param {string} userId - User database ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Notification custom data payload
 * @param {string} type - Notification type
 * @returns {Promise<object>} Log of the notification execution
 */
async function sendPushNotification(userId, title, body, data = {}, type = "promotional") {
  logger.info(`[NotificationService] Initiating notification of type "${type}" to user "${userId}": "${title}"`);

  // 1. Duplicate Check: Prevent sending duplicate notifications with same title/body to same user within 5 seconds
  const fiveSecondsAgo = new Date(Date.now() - 5000);
  const duplicateLog = await NotificationLog.findOne({
    userId,
    title,
    body,
    status: { $in: ["sent", "delivered", "clicked"] },
    createdAt: { $gte: fiveSecondsAgo }
  });

  if (duplicateLog) {
    logger.warn(`[NotificationService] Blocked duplicate notification to user ${userId} within 5s window.`);
    return duplicateLog;
  }

  const log = new NotificationLog({
    userId,
    title,
    body,
    data,
    type,
    status: "pending",
  });

  // If the notification is not important, we save it as in-app only and skip Expo/Web Push send
  if (!isImportantNotification(type, title, body, data)) {
    logger.info(`[NotificationService] Less important notification to user ${userId}. Saving in-app log only.`);
    log.status = "delivered";
    await log.save();
    return log;
  }

  try {
    // 2. Fetch tokens for this user
    const tokenRecords = await PushToken.find({ userId });
    if (!tokenRecords || tokenRecords.length === 0) {
      logger.warn(`[NotificationService] No push tokens found for user ${userId}`);
      log.status = "failed";
      log.errorLogs.push("No registered push tokens found for user");
      await log.save();
      return log;
    }

    // 3. Token Validation System: Filter out invalid/malformed tokens
    const validTokens = [];
    const invalidTokensList = [];

    for (const record of tokenRecords) {
      if (isValidPushToken(record.token)) {
        validTokens.push(record.token);
      } else {
        invalidTokensList.push(record._id);
      }
    }

    // Clean up malformed tokens in background
    if (invalidTokensList.length > 0) {
      logger.warn(`[NotificationService] Cleaning up ${invalidTokensList.length} malformed tokens for user ${userId}`);
      await PushToken.deleteMany({ _id: { $in: invalidTokensList } });
    }

    if (validTokens.length === 0) {
      logger.warn(`[NotificationService] No valid push tokens remaining after validation for user ${userId}`);
      log.status = "failed";
      log.errorLogs.push("No valid push tokens found for user");
      await log.save();
      return log;
    }

    log.tokens = validTokens;
    log.tokensCount = validTokens.length;

    // Separate Expo and Web Push tokens
    const expoTokens = [];
    const webPushTokens = [];

    validTokens.forEach(token => {
      if (token.startsWith("WebPushSubscription:")) {
        webPushTokens.push(token);
      } else {
        expoTokens.push(token);
      }
    });

    const ticketIds = [];
    const errors = [];

    // 4. Calculate badge count based on unread notification logs
    const unreadCount = await NotificationLog.countDocuments({ userId, read: false });
    const badge = unreadCount + 1;

    // 5. Send Web Push Notifications concurrently
    if (webPushTokens.length > 0) {
      logger.info(`[NotificationService] Sending ${webPushTokens.length} Web Push notification(s)...`);
      const webPromises = webPushTokens.map(async (token) => {
        const res = await sendWebPushNotification(token, title, body, data, log._id.toString());
        if (res.success) {
          ticketIds.push(res.id);
        } else {
          errors.push(`WebPush: ${res.error}`);
          if (res.isUnregistered) {
            logger.info(`[NotificationService] Web subscription is unregistered. Removing from database...`);
            await PushToken.deleteOne({ token });
          }
        }
      });
      await Promise.all(webPromises);
    }

    // 6. Send using Expo Push API
    if (expoTokens.length > 0) {
      logger.info(`[NotificationService] Sending ${expoTokens.length} message(s) to Expo API...`);
      const messages = expoTokens.map(token => {
        let channelId = "default";
        if (type === "order_update" || type === "payment_status" || type === "delivery_alert") {
          channelId = "orders";
        } else if (type === "cart_reminder") {
          channelId = "reminders";
        }
        return {
          to: token,
          sound: "default",
          channelId,
          title,
          body,
          badge,
          data: {
            ...data,
            notificationType: type,
            logId: log._id.toString(),
          },
        };
      });

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Expo API returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      logger.info(`[NotificationService] Expo API response status: ${response.status}`);

      if (result.data && Array.isArray(result.data)) {
        for (let i = 0; i < result.data.length; i++) {
          const ticket = result.data[i];
          const associatedToken = expoTokens[i];

          if (ticket.status === "ok") {
            ticketIds.push(ticket.id);
          } else {
            const errorMsg = ticket.message || (ticket.details && ticket.details.error) || "Unknown error";
            errors.push(`Token: ${associatedToken} failed: ${errorMsg}`);
            logger.error(`[NotificationService] Error sending to token ${associatedToken}: ${errorMsg}`);

            if (ticket.details && (ticket.details.error === "DeviceNotRegistered" || ticket.message?.includes("not a registered push notification recipient"))) {
              logger.info(`[NotificationService] Token ${associatedToken} is unregistered. Removing from database...`);
              await PushToken.deleteOne({ token: associatedToken });
            }
          }
        }
      }
    }

    log.ticketIds = ticketIds;
    log.errorLogs = errors;
    log.status = ticketIds.length > 0 ? "sent" : "failed";

    await log.save();
    return log;
  } catch (error) {
    logger.error(`[NotificationService] Error in sendPushNotification:`, error);
    log.status = "failed";
    log.errorLogs.push(error.message);
    await log.save();
    return log;
  }
}

/**
 * Send push notification to multiple users (Batch with high-performance chunks)
 * Reduces HTTP requests, memory consumption, and delays.
 */
async function sendBatchPushNotifications(userIds, title, body, data = {}, type = "promotional") {
  logger.info(`[NotificationService] Initiating batch notifications of type "${type}" to ${userIds.length} users`);

  if (!userIds || userIds.length === 0) return [];

  const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];
  const results = [];
  
  // Create pending notification logs for all users
  const logsMap = {};
  for (const userId of uniqueUserIds) {
    const log = new NotificationLog({
      userId,
      title,
      body,
      data,
      type,
      status: "pending",
    });
    await log.save();
    logsMap[userId] = log;
  }

  try {
    // 1. Fetch all tokens for all target users in one database trip
    const tokenRecords = await PushToken.find({ userId: { $in: uniqueUserIds } });
    
    // Group valid tokens by user
    const userTokensMap = {};
    const invalidTokens = [];

    for (const record of tokenRecords) {
      const uId = record.userId.toString();
      if (isValidPushToken(record.token)) {
        if (!userTokensMap[uId]) {
          userTokensMap[uId] = [];
        }
        userTokensMap[uId].push(record.token);
      } else {
        invalidTokens.push(record._id);
      }
    }

    // Clean up malformed tokens in background
    if (invalidTokens.length > 0) {
      PushToken.deleteMany({ _id: { $in: invalidTokens } }).catch(err => {
        logger.error("[NotificationService] Error cleaning up batch invalid tokens:", err);
      });
    }

    // Fetch unread counts for all users in one aggregation
    const unreadCounts = await NotificationLog.aggregate([
      { $match: { userId: { $in: uniqueUserIds.map(id => new mongoose.Types.ObjectId(id)) }, read: false } },
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);
    const userUnreadCounts = {};
    for (const item of unreadCounts) {
      userUnreadCounts[item._id.toString()] = item.count;
    }

    // 2. Prepare Expo messages and Web Push promises
    const expoMessages = [];
    const expoMeta = [];
    const webPushPromises = [];

    for (const userId of uniqueUserIds) {
      const tokens = userTokensMap[userId] || [];
      const log = logsMap[userId];
      
      log.tokens = tokens;
      log.tokensCount = tokens.length;

      // If notification is not important, save as delivered in-app only and skip sending
      if (!isImportantNotification(type, title, body, data)) {
        log.status = "delivered";
        await log.save();
        results.push(log);
        continue;
      }
      
      if (tokens.length === 0) {
        log.status = "failed";
        log.errorLogs.push("No valid push tokens found for user");
        await log.save();
        results.push(log);
        continue;
      }

      const badge = (userUnreadCounts[userId] || 0) + 1;
      let channelId = "default";
      if (type === "order_update" || type === "payment_status" || type === "delivery_alert") {
        channelId = "orders";
      } else if (type === "cart_reminder") {
        channelId = "reminders";
      }

      for (const token of tokens) {
        if (token.startsWith("WebPushSubscription:")) {
          webPushPromises.push((async () => {
            const res = await sendWebPushNotification(token, title, body, data, log._id.toString());
            if (res.success) {
              if (!log.ticketIds.includes(res.id)) {
                log.ticketIds.push(res.id);
              }
              log.status = "sent";
            } else {
              log.errorLogs.push(`WebPush: ${res.error}`);
              if (res.isUnregistered) {
                await PushToken.deleteOne({ token });
              }
            }
          })());
        } else {
          expoMessages.push({
            to: token,
            sound: "default",
            channelId,
            title,
            body,
            badge,
            data: {
              ...data,
              notificationType: type,
              logId: log._id.toString(),
            },
          });
          expoMeta.push({ userId, token, log });
        }
      }
    }

    // Execute Web Push notifications concurrently
    if (webPushPromises.length > 0) {
      await Promise.all(webPushPromises);
    }

    if (expoMessages.length === 0) {
      // Save final status for all logs with web-only notifications
      for (const userId of uniqueUserIds) {
        const log = logsMap[userId];
        if (log.status === "pending") {
          log.status = log.ticketIds.length > 0 ? "sent" : "failed";
        }
        await log.save();
        results.push(log);
      }
      return results;
    }

    // 3. Send to Expo in chunks of 100 messages to maximize throughput
    const CHUNK_SIZE = 100;
    for (let i = 0; i < expoMessages.length; i += CHUNK_SIZE) {
      const chunk = expoMessages.slice(i, i + CHUNK_SIZE);
      const metaChunk = expoMeta.slice(i, i + CHUNK_SIZE);

      logger.info(`[NotificationService] Sending batch chunk of ${chunk.length} messages to Expo API...`);

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Expo API returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.data && Array.isArray(result.data)) {
        for (let j = 0; j < result.data.length; j++) {
          const ticket = result.data[j];
          const meta = metaChunk[j];
          const log = meta.log;

          if (ticket.status === "ok") {
            if (!log.ticketIds.includes(ticket.id)) {
              log.ticketIds.push(ticket.id);
            }
            log.status = "sent";
          } else {
            const errorMsg = ticket.message || (ticket.details && ticket.details.error) || "Unknown error";
            log.errorLogs.push(`Token: ${meta.token} failed: ${errorMsg}`);
            
            if (ticket.details && (ticket.details.error === "DeviceNotRegistered" || ticket.message?.includes("not a registered push notification recipient"))) {
              PushToken.deleteOne({ token: meta.token }).catch(err => {
                logger.error("[NotificationService] Token delete failed:", err);
              });
            }
          }
        }
      }
    }

    // Save final status for all logs
    for (const userId of uniqueUserIds) {
      const log = logsMap[userId];
      if (log.status === "pending") {
        log.status = log.ticketIds.length > 0 ? "sent" : "failed";
      }
      await log.save();
      results.push(log);
    }

    return results;
  } catch (error) {
    logger.error("[NotificationService] Error in sendBatchPushNotifications:", error);
    for (const userId of uniqueUserIds) {
      const log = logsMap[userId];
      if (log.status === "pending") {
        log.status = "failed";
        log.errorLogs.push(error.message);
        await log.save();
        results.push(log);
      }
    }
    return results;
  }
}

/**
 * Recovers and retries transient failed notifications.
 * Scans for NotificationLogs with status "failed" that are newer than 24 hours
 * and do not have non-transient errors like "DeviceNotRegistered".
 */
async function recoverFailedNotifications() {
  logger.info("[NotificationService] Running failed notification recovery task...");
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const logsToRetry = await NotificationLog.find({
    status: "failed",
    retryCount: { $lt: 3 },
    createdAt: { $gte: oneDayAgo },
    errorLogs: { $not: /DeviceNotRegistered|not a registered push/i }
  });

  if (logsToRetry.length === 0) {
    logger.info("[NotificationService] No failed notifications to recover.");
    return;
  }

  logger.info(`[NotificationService] Recovering and retrying ${logsToRetry.length} failed notification(s)...`);

  for (const log of logsToRetry) {
    log.status = "retry_pending";
    log.retryCount += 1;
    await log.save();

    try {
      // Re-trigger notification send
      const updatedLog = await sendPushNotification(
        log.userId.toString(),
        log.title,
        log.body,
        log.data,
        log.type
      );
      
      log.status = updatedLog.status;
      log.errorLogs = updatedLog.errorLogs;
      await log.save();
    } catch (err) {
      log.status = "failed";
      log.errorLogs.push(`Retry attempt ${log.retryCount} failed: ${err.message}`);
      await log.save();
      logger.error(`[NotificationService] Failed to retry notification log ${log._id}`, err);
    }
  }
}

module.exports = {
  sendPushNotification,
  sendBatchPushNotifications,
  recoverFailedNotifications,
  isValidPushToken,
};
