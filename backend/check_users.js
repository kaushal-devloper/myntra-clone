const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const UserSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  role: String,
  createdAt: Date
});

const User = mongoose.model("User", UserSchema);

async function checkUsers() {
  const dbURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/myntra";
  try {
    await mongoose.connect(dbURI);
    console.log("Connected to MongoDB database.");
    const users = await User.find({});
    console.log("Total users found:", users.length);
    users.forEach(u => {
      console.log(`- ${u.fullname} (${u.email}) [role: ${u.role}]`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
