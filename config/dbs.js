const mongoose = require("mongoose");
require("../models/userSchema"); // Adjust the path to your User model

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database connected");

    // Add this line to sync indexes
    await mongoose.model("User").syncIndexes();
    console.log("User indexes synced successfully");
  } catch (error) {
    console.log("Database connection error: ", error);
    process.exit(1);
  }
};

module.exports = connectDB;
