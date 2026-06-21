const mongoose = require("mongoose");

const uri1 = "mongodb+srv://myntra:Pass%40123@myntra.x0ebtdb.mongodb.net/myntra?retryWrites=true&w=majority";
const uri2 = "mongodb+srv://myntra:Kaushal2412@myntra.x0ebtdb.mongodb.net/myntra?retryWrites=true&w=majority";

async function test() {
  console.log("Testing URI 1 (Pass@123)...");
  try {
    await mongoose.connect(uri1);
    console.log("✅ URI 1 connected successfully!");
    await mongoose.disconnect();
    return;
  } catch (e) {
    console.error("❌ URI 1 failed:", e.message);
  }

  console.log("Testing URI 2 (Kaushal2412)...");
  try {
    await mongoose.connect(uri2);
    console.log("✅ URI 2 connected successfully!");
    await mongoose.disconnect();
    return;
  } catch (e) {
    console.error("❌ URI 2 failed:", e.message);
  }
}

test();
