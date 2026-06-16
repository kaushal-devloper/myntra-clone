const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.resolve(__dirname, "../logs");

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const errorLogPath = path.join(LOGS_DIR, "error.log");
const combinedLogPath = path.join(LOGS_DIR, "combined.log");

function formatMessage(level, message, meta = "") {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
}

function writeToFile(filePath, content) {
  fs.appendFile(filePath, content, (err) => {
    if (err) {
      console.error("Failed to write to log file:", err.message);
    }
  });
}

const logger = {
  info: (message, meta) => {
    const formatted = formatMessage("info", message, meta);
    console.log(`\x1b[32m${formatted.trim()}\x1b[0m`); // Green text in console
    writeToFile(combinedLogPath, formatted);
  },
  warn: (message, meta) => {
    const formatted = formatMessage("warn", message, meta);
    console.warn(`\x1b[33m${formatted.trim()}\x1b[0m`); // Yellow text in console
    writeToFile(combinedLogPath, formatted);
    writeToFile(errorLogPath, formatted);
  },
  error: (message, error) => {
    const errorMessage = error instanceof Error ? error.stack : error;
    const formatted = formatMessage("error", message, errorMessage);
    console.error(`\x1b[31m${formatted.trim()}\x1b[0m`); // Red text in console
    writeToFile(combinedLogPath, formatted);
    writeToFile(errorLogPath, formatted);
  }
};

module.exports = logger;
