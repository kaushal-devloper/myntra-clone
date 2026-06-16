const NotificationJob = require("../modals/NotificationJob");
const PushToken = require("../modals/PushToken");
const NotificationLog = require("../modals/NotificationLog");
const { sendPushNotification } = require("./notificationService");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

let Queue, Worker, QueueEvents, redisConnection;
let useRedis = false;
let bullQueue = null;

// Try to initialize Redis and BullMQ
try {
  const Redis = require("ioredis");
  const bullmq = require("bullmq");
  Queue = bullmq.Queue;
  Worker = bullmq.Worker;
  QueueEvents = bullmq.QueueEvents;

  const redisHost = process.env.REDIS_HOST || "127.0.0.1";
  const redisPort = process.env.REDIS_PORT || 6379;

  redisConnection = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
    connectTimeout: 2000,
  });

  let hasLoggedRedisWarning = false;

  redisConnection.on("connect", () => {
    logger.info(`[QueueService] Connected to Redis at ${redisHost}:${redisPort}`);
    useRedis = true;
    hasLoggedRedisWarning = false;
    initializeBullMQ();
  });

  redisConnection.on("error", (err) => {
    if (!hasLoggedRedisWarning) {
      logger.warn("[QueueService] Redis connection failed or went offline. Using MongoDB polling queue fallback.");
      hasLoggedRedisWarning = true;
    }
    useRedis = false;
  });
} catch (e) {
  logger.warn("[QueueService] BullMQ or Redis packages not loaded. Falling back to MongoDB queue.");
}

function initializeBullMQ() {
  if (!useRedis) return;
  
  try {
    bullQueue = new Queue("notification-queue", { connection: redisConnection });
    
    // Start background BullMQ worker
    new Worker(
      "notification-queue",
      async (job) => {
        const { jobId, userId, title, body, data, type } = job.data;
        logger.info(`[QueueService-BullMQ] Processing job ${job.id} for user ${userId}`);
        
        // Mark db job as processing
        await NotificationJob.findByIdAndUpdate(jobId, { status: "processing" });

        try {
          // Rate limiting helper - 100ms delay between sending to avoid spike spam
          await new Promise((resolve) => setTimeout(resolve, 100));

          const log = await sendPushNotification(userId, title, body, data, type);
          
          if (log.status === "sent" || log.status === "delivered" || log.status === "clicked") {
            await NotificationJob.findByIdAndUpdate(jobId, { status: "completed", errorMessage: null });
          } else {
            throw new Error(log.errorLogs.join("; ") || "Failed to send");
          }
        } catch (error) {
          logger.error(`[QueueService-BullMQ] Job ${job.id} failed:`, error);
          
          const dbJob = await NotificationJob.findById(jobId);
          if (dbJob) {
            dbJob.retryCount += 1;
            dbJob.errorMessage = error.message;
            if (dbJob.retryCount >= dbJob.maxRetries) {
              dbJob.status = "failed";
            } else {
              dbJob.status = "scheduled"; // Will be picked up for retry
            }
            await dbJob.save();
          }
          throw error;
        }
      },
      { connection: redisConnection, concurrency: 5 }
    );

    logger.info("[QueueService] BullMQ Queue and Worker initialized successfully.");
  } catch (error) {
    logger.error("[QueueService] Error initializing BullMQ:", error);
    useRedis = false;
  }
}

/**
 * Schedule a new notification job
 */
async function scheduleNotification({ userId, title, body, data = {}, type, delaySeconds = 0, uniqueKey = null }) {
  // Prevent duplicate notifications using unique notification validation
  if (uniqueKey) {
    const existingJob = await NotificationJob.findOne({
      uniqueKey,
      status: { $in: ["scheduled", "processing"] },
    });
    if (existingJob) {
      logger.warn(`[QueueService] Duplicate notification blocked. Job already exists for uniqueKey: ${uniqueKey}`);
      return { success: false, duplicate: true, data: existingJob };
    }
  }

  const scheduledTime = new Date(Date.now() + delaySeconds * 1000);

  // Save job to MongoDB
  const job = new NotificationJob({
    userId,
    title,
    body,
    data,
    type,
    scheduledTime,
    status: "scheduled",
    uniqueKey,
  });

  await job.save();

  // Queue using BullMQ if Redis is active
  if (useRedis && bullQueue) {
    try {
      await bullQueue.add(
        `notification-${job._id}`,
        {
          jobId: job._id,
          userId,
          title,
          body,
          data,
          type,
        },
        {
          delay: delaySeconds * 1000,
          attempts: job.maxRetries,
          backoff: {
            type: "exponential",
            delay: 5000, // Retry after 5s, 10s, 20s...
          },
          jobId: job._id.toString(),
        }
      );
      logger.info(`[QueueService] Notification scheduled via BullMQ: ${job._id} in ${delaySeconds}s`);
    } catch (err) {
      logger.error("[QueueService] Failed to add to BullMQ. Falling back to Mongo polling.", err);
    }
  } else {
    logger.info(`[QueueService] Notification scheduled via MongoDB Polling: ${job._id} in ${delaySeconds}s`);
  }

  return { success: true, data: job };
}

/**
 * Update a scheduled notification
 */
async function updateNotification(jobId, updates) {
  const job = await NotificationJob.findById(jobId);
  if (!job) {
    return { success: false, message: "Job not found" };
  }

  if (job.status !== "scheduled") {
    return { success: false, message: `Cannot update job. Current status is ${job.status}` };
  }

  // Update Mongo job fields
  if (updates.title) job.title = updates.title;
  if (updates.body) job.body = updates.body;
  if (updates.data) job.data = { ...job.data, ...updates.data };
  if (updates.delaySeconds !== undefined) {
    job.scheduledTime = new Date(Date.now() + updates.delaySeconds * 1000);
  }
  
  await job.save();

  // Update BullMQ job if active
  if (useRedis && bullQueue) {
    try {
      const bullJob = await bullQueue.getJob(jobId.toString());
      if (bullJob) {
        await bullJob.remove(); // Remove old delayed job
        
        // Add updated job
        const delayMs = Math.max(0, job.scheduledTime.getTime() - Date.now());
        await bullQueue.add(
          `notification-${job._id}`,
          {
            jobId: job._id,
            userId: job.userId,
            title: job.title,
            body: job.body,
            data: job.data,
            type: job.type,
          },
          {
            delay: delayMs,
            attempts: job.maxRetries,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
            jobId: job._id.toString(),
          }
        );
      }
    } catch (err) {
      logger.error("[QueueService] Failed to update BullMQ job:", err);
    }
  }

  return { success: true, data: job };
}

/**
 * Cancel a scheduled notification
 */
async function cancelNotification(jobId) {
  const job = await NotificationJob.findById(jobId);
  if (!job) {
    return { success: false, message: "Job not found" };
  }

  job.status = "cancelled";
  await job.save();

  // Cancel BullMQ job if active
  if (useRedis && bullQueue) {
    try {
      const bullJob = await bullQueue.getJob(jobId.toString());
      if (bullJob) {
        await bullJob.remove();
        logger.info(`[QueueService] BullMQ job ${jobId} removed.`);
      }
    } catch (err) {
      logger.error("[QueueService] Failed to cancel BullMQ job:", err);
    }
  }

  return { success: true, data: job };
}

/**
 * Fetch status of a scheduled job
 */
async function getJobStatus(jobId) {
  const job = await NotificationJob.findById(jobId).populate("userId", "name email");
  return job;
}

/**
 * MongoDB Polling Worker (Runs as fallback when Redis/BullMQ is disabled)
 * Processes all jobs that are scheduled and ready to send.
 * Claiming scheduled jobs atomically prevents race conditions in multi-instance servers.
 */
async function processMongoQueue() {
  if (useRedis) return;

  const now = new Date();
  
  // Find all scheduled jobs that are past their scheduled time
  const jobsToProcess = await NotificationJob.find({
    status: "scheduled",
    scheduledTime: { $lte: now },
  }).limit(20);

  if (jobsToProcess.length === 0) return;

  logger.info(`[QueueService-MongoWorker] Found ${jobsToProcess.length} scheduled job(s) to process.`);

  for (const rawJob of jobsToProcess) {
    // Claim job atomically to prevent duplicate runs across multi-instance nodes
    const job = await NotificationJob.findOneAndUpdate(
      { _id: rawJob._id, status: "scheduled" },
      { $set: { status: "processing" } },
      { returnDocument: 'after' }
    );

    if (!job) {
      // Job was already claimed or updated by another thread/worker
      continue;
    }

    try {
      // Concurrency delay helper
      await new Promise((resolve) => setTimeout(resolve, 100));

      const log = await sendPushNotification(job.userId, job.title, job.body, job.data, job.type);

      if (log.status === "sent" || log.status === "delivered" || log.status === "clicked") {
        job.status = "completed";
        job.errorMessage = null;
      } else {
        throw new Error(log.errorLogs.join("; ") || "Failed to send");
      }
    } catch (error) {
      logger.error(`[QueueService-MongoWorker] Job ${job._id} failed:`, error);
      job.retryCount += 1;
      job.errorMessage = error.message;

      if (job.retryCount >= job.maxRetries) {
        job.status = "failed";
      } else {
        job.status = "scheduled"; // Retry on next tick
        // Add exponential backoff delay to scheduledTime (e.g. 10s * 2^retryCount)
        const backoffSeconds = 10 * Math.pow(2, job.retryCount);
        job.scheduledTime = new Date(Date.now() + backoffSeconds * 1000);
      }
    }
    await job.save();
  }
}

/**
 * Clean up invalid push tokens, remove expired tokens (older than 30 days),
 * and remove completed/failed scheduled jobs from the database.
 */
async function cleanupTokens() {
  try {
    logger.info("[QueueService] Running device token cleanup task...");
    
    // 1. Remove tokens that haven't been updated/synced in 30 days (expired)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredResult = await PushToken.deleteMany({
      updatedAt: { $lt: thirtyDaysAgo },
    });

    if (expiredResult.deletedCount > 0) {
      logger.info(`[QueueService] Cleaned up ${expiredResult.deletedCount} expired device token(s).`);
    }

    // 2. Perform a check on notification logs to remove invalid tokens
    const failedLogs = await NotificationLog.find({
      status: "failed",
      errorLogs: { $regex: /DeviceNotRegistered|not a registered push/i },
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Checked in last 24h logs
    });

    let invalidTokensCount = 0;
    for (const log of failedLogs) {
      if (log.tokens && log.tokens.length > 0) {
        for (const token of log.tokens) {
          const result = await PushToken.deleteOne({ token });
          if (result.deletedCount > 0) {
            invalidTokensCount++;
          }
        }
      }
    }

    if (invalidTokensCount > 0) {
      logger.info(`[QueueService] Cleaned up ${invalidTokensCount} invalid/unregistered token(s).`);
    }

    // 3. Queue Cleanup & Failed Job Cleanup
    logger.info("[QueueService] Running completed & failed notification jobs cleanup...");
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const completedResult = await NotificationJob.deleteMany({
      status: { $in: ["completed", "cancelled"] },
      updatedAt: { $lt: sevenDaysAgo }
    });

    const failedJobsResult = await NotificationJob.deleteMany({
      status: "failed",
      updatedAt: { $lt: fourteenDaysAgo }
    });

    logger.info(`[QueueService] Cleaned up ${completedResult.deletedCount} completed/cancelled jobs and ${failedJobsResult.deletedCount} failed jobs.`);
  } catch (error) {
    logger.error("[QueueService] Error in cleanupTasks:", error);
  }
}

/**
 * Return monitoring metrics for admin dashboards
 */
async function getQueueMetrics() {
  try {
    const totalJobs = await NotificationJob.countDocuments();
    const scheduled = await NotificationJob.countDocuments({ status: "scheduled" });
    const processing = await NotificationJob.countDocuments({ status: "processing" });
    const completed = await NotificationJob.countDocuments({ status: "completed" });
    const failed = await NotificationJob.countDocuments({ status: "failed" });
    const cancelled = await NotificationJob.countDocuments({ status: "cancelled" });

    const deliveredCount = await NotificationLog.countDocuments({ status: { $in: ["sent", "delivered", "clicked"] } });
    const failedCount = await NotificationLog.countDocuments({ status: "failed" });
    const clickedCount = await NotificationLog.countDocuments({ status: "clicked" });
    
    const typesBreakdown = await NotificationLog.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    const totalTokens = await PushToken.countDocuments();

    return {
      success: true,
      queueType: useRedis ? "BullMQ (Redis)" : "MongoDB Polling (Fallback)",
      redisConnected: useRedis,
      metrics: {
        totalJobs,
        scheduled,
        processing,
        completed,
        failed,
        cancelled,
      },
      analytics: {
        deliveredNotifications: deliveredCount,
        failedNotifications: failedCount,
        clickedNotifications: clickedCount,
        deliveryRate: deliveredCount + failedCount > 0 ? (deliveredCount / (deliveredCount + failedCount)) * 100 : 100,
        clickThroughRate: deliveredCount > 0 ? (clickedCount / deliveredCount) * 100 : 0,
        totalRegisteredTokens: totalTokens,
        typesBreakdown,
      }
    };
  } catch (error) {
    logger.error("[QueueService] Error getting queue metrics:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  scheduleNotification,
  updateNotification,
  cancelNotification,
  getJobStatus,
  processMongoQueue,
  cleanupTokens,
  getQueueMetrics,
  isRedisActive: () => useRedis,
};
