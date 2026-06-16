const Bag = require("../models/Bag");
const NotificationLog = require("../modals/NotificationLog");
const PushToken = require("../modals/PushToken");
const { sendPushNotification, sendBatchPushNotifications, recoverFailedNotifications } = require("./notificationService");
const { processMongoQueue, cleanupTokens } = require("./queueService");
const logger = require("../utils/logger");

let cron;
try {
  cron = require("node-cron");
} catch (e) {
  logger.warn("[SchedulingService] node-cron package not loaded. Falling back to native setInterval.");
}

/**
 * Initializes background scheduled jobs.
 * Integrates MongoDB fallback workers, cart abandonment reminders, promotions, and token cleanups.
 */
function initScheduler() {
  logger.info("[SchedulingService] Initializing scheduled jobs...");

  // 1. Run the MongoDB Polling Worker every 10 seconds (for delayed / scheduled notification jobs fallback)
  const POLLING_INTERVAL = 10 * 1000;
  setInterval(async () => {
    try {
      await processMongoQueue();
    } catch (error) {
      logger.error("[SchedulingService] Error running MongoDB polling worker:", error);
    }
  }, POLLING_INTERVAL);

  // 2. Schedule token and job cleanup (runs once every 6 hours)
  const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await cleanupTokens();
    } catch (error) {
      logger.error("[SchedulingService] Error running token/job cleanup task:", error);
    }
  }, CLEANUP_INTERVAL);
  // Run once immediately on start after 5s
  setTimeout(() => {
    cleanupTokens().catch(err => logger.error("Initial token/job cleanup failed:", err));
  }, 5000);

  // 3. Setup transient failed notification recovery worker (runs every 5 minutes)
  const RECOVERY_INTERVAL = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      await recoverFailedNotifications();
    } catch (error) {
      logger.error("[SchedulingService] Error running failed notification recovery:", error);
    }
  }, RECOVERY_INTERVAL);
  // Run once on startup after 10s
  setTimeout(() => {
    recoverFailedNotifications().catch(err => logger.error("Initial failed notification recovery failed:", err));
  }, 10000);

  // 4. Setup Cart Abandonment & Promotional jobs
  if (cron) {
    // Run Abandoned Cart check every minute (cron: * * * * *)
    cron.schedule("* * * * *", async () => {
      logger.info("[SchedulingService-Cron] Running scheduled abandoned cart check...");
      await checkAbandonedCarts();
    });

    // Run Promotional Offer check every 5 minutes (cron: */5 * * * *)
    cron.schedule("*/5 * * * *", async () => {
      logger.info("[SchedulingService-Cron] Running scheduled promotional offer job...");
      await checkPromotionalOffers();
    });

    logger.info("[SchedulingService] Jobs scheduled successfully using node-cron.");
  } else {
    // Fallback using native setInterval if node-cron is not installed
    const CART_CHECK_INTERVAL = 60 * 1000; // 1 min
    setInterval(async () => {
      logger.info("[SchedulingService-Interval] Running scheduled abandoned cart check...");
      await checkAbandonedCarts();
    }, CART_CHECK_INTERVAL);

    const PROMO_CHECK_INTERVAL = 5 * 60 * 1000; // 5 mins
    setInterval(async () => {
      logger.info("[SchedulingService-Interval] Running scheduled promotional offer job...");
      await checkPromotionalOffers();
    }, PROMO_CHECK_INTERVAL);

    logger.info("[SchedulingService] Jobs scheduled successfully using setInterval fallback.");
  }
}

/**
 * Cart Abandonment Reminder Logic
 */
async function checkAbandonedCarts() {
  try {
    // Find all unique users who have items in their bag
    const uniqueUsersInBag = await Bag.distinct("userId", { "activeItems.0": { $exists: true } });
    if (uniqueUsersInBag.length === 0) {
      logger.info("[SchedulingService] No items in any user's bag. Skipping reminders.");
      return;
    }

    logger.info(`[SchedulingService] Found ${uniqueUsersInBag.length} user(s) with items in their bag. Checking notification history...`);

    for (const userId of uniqueUsersInBag) {
      // Prevent spamming: Check if user received a cart reminder in the last 15 minutes
      const recentReminder = await NotificationLog.findOne({
        userId,
        type: "cart_reminder",
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // 15 mins window
      });

      if (recentReminder) {
        logger.info(`[SchedulingService] Skipping cart reminder for user ${userId} (notified recently).`);
        continue;
      }

      // Fetch user's bag items count
      const bag = await Bag.findOne({ userId });
      const bagItemsCount = bag ? bag.activeItems.reduce((acc, item) => acc + item.quantity, 0) : 0;
      if (bagItemsCount > 0) {
        logger.info(`[SchedulingService] Sending abandoned cart reminder to user ${userId} with ${bagItemsCount} item(s)`);
        await sendPushNotification(
          userId,
          "Items waiting in your Bag! 🛍️",
          `You have ${bagItemsCount} item(s) waiting in your bag. Complete your purchase now to get an extra 10% off!`,
          { notificationType: "cart_reminder", route: "/(tabs)/bag" },
          "cart_reminder"
        );
      }
    }
  } catch (error) {
    logger.error("[SchedulingService] Error in checkAbandonedCarts:", error);
  }
}

/**
 * Promotional Offer Notification Logic
 */
async function checkPromotionalOffers() {
  try {
    // Find users with active push tokens
    const activeUserIds = await PushToken.distinct("userId");
    if (activeUserIds.length === 0) {
      logger.info("[SchedulingService] No users with registered push tokens found for promotions.");
      return;
    }

    logger.info(`[SchedulingService] Sending promotional offer to ${activeUserIds.length} users with push tokens.`);

    const title = "Reason Sale starts NOW! 🔥";
    const body = "Flat 50-80% OFF on top clothing brands. Limited time only, shop now!";
    const data = { notificationType: "promotional", route: "/(tabs)/index" };

    await sendBatchPushNotifications(activeUserIds, title, body, data, "promotional");
  } catch (error) {
    logger.error("[SchedulingService] Error in checkPromotionalOffers:", error);
  }
}

module.exports = {
  initScheduler,
};
