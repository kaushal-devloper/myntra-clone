/**
 * build.js – Cross-platform post-export build script.
 * Copies the Expo web export from myntra/dist → public/,
 * and ensures manifest.json + service-worker.js are at the root.
 */

const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "myntra", "dist");
const destDir = path.join(__dirname, "public");
const publicAssets = path.join(__dirname, "myntra", "public");

// ── Helper: recursively copy a directory ─────────────────────────────────────
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── Helper: delete a directory recursively ────────────────────────────────────
function deleteDirSync(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

// 1. Clean and recreate public/
console.log("Cleaning public/ directory...");
deleteDirSync(destDir);
fs.mkdirSync(destDir, { recursive: true });

// 2. Copy Expo dist → public/
console.log("Copying myntra/dist → public/...");
copyDirSync(srcDir, destDir);

// 3. Copy service-worker.js
const swSrc = path.join(publicAssets, "service-worker.js");
const swDest = path.join(destDir, "service-worker.js");
if (fs.existsSync(swSrc)) {
  fs.copyFileSync(swSrc, swDest);
  console.log("Copied service-worker.js ✓");
} else {
  console.warn("WARNING: service-worker.js not found in myntra/public/");
}

// 4. Copy manifest.json
const manifestSrc = path.join(publicAssets, "manifest.json");
const manifestDest = path.join(destDir, "manifest.json");
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log("Copied manifest.json ✓");
} else {
  console.warn("WARNING: manifest.json not found in myntra/public/");
}

console.log("\n✅ Build complete! public/ is ready for deployment.");
console.log("Files in public/:", fs.readdirSync(destDir).join(", "));
