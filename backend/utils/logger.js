const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.resolve(__dirname, "../logs");
const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;

if (!isVercel && !fs.existsSync(LOGS_DIR)) {
    try {
          fs.mkdirSync(LOGS_DIR, { recursive: true });
    } catch (err) {
          console.error("Failed to create logs directory:", err.message);
    }
}

const errorLogPath = path.join(LOGS_DIR, "error.log");
const combinedLogPath = path.join(LOGS_DIR, "combined.log");

function formatMessage(level, message, meta = "") {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
}

function writeToFile(filePath, content) {
    if (isVercel) return;
    fs.appendFile(filePath, content, (err) => {
          if (err) {
                  console.error("Failed to write to log file:", err.message);
          }
    });
}

const logger = {
    info: (message, meta) => {
          const formatted = formatMessage("info", message, meta);
          console.log(formatted.trim());
          writeToFile(combinedLogPath, formatted);
    },
    warn: (message, meta) => {
          const formatted = formatMessage("warn", message, meta);
          console.warn(formatted.trim());
          writeToFile(combinedLogPath, formatted);
    },
    error: (message, error) => {
          const errorMsg = error instanceof Error ? error.stack : error;
          const formatted = formatMessage("error", message, errorMsg);
          console.error(formatted.trim());
          writeToFile(errorLogPath, formatted);
          writeToFile(combinedLogPath, formatted);
    }
};

module.exports = logger;
