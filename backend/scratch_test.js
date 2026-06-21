const mongoose = require('mongoose');
const uri = "mongodb+srv://myntra:Kaushal2412@myntra.x0ebtdb.mongodb.net/myntra?retryWrites=true&w=majority";
console.log("Connecting to:", uri);
mongoose.connect(uri)
  .then(() => {
    console.log("Connected successfully to MongoDB Atlas!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection failed:", err.message);
    process.exit(1);
  });
