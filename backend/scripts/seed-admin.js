const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const User   = require("../models/UserSchema");
const Budget = require("../models/BudgetSchema");

const ADMIN = {
  name:     "Admin",
  email:    "admin@moneymindedminions.com",
  password: "Admin@123",
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI.trim());
  console.log("Connected to MongoDB");

  // Wipe all collections
  const userCount   = await User.countDocuments();
  const budgetCount = await Budget.countDocuments();
  await User.deleteMany({});
  await Budget.deleteMany({});
  console.log(`Deleted ${userCount} user(s) and ${budgetCount} budget(s)`);

  // Create admin
  const hashed = await bcrypt.hash(ADMIN.password, 10);
  const admin  = await User.create({
    name:    ADMIN.name,
    email:   ADMIN.email,
    password: hashed,
    isAdmin: true,
    status:  "approved",
  });

  console.log("\n✅  Admin user created");
  console.log("    Email   :", ADMIN.email);
  console.log("    Password:", ADMIN.password);
  console.log("    ID      :", admin._id.toString());

  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
