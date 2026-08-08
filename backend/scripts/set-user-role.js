import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const email = String(process.argv[2] || "").trim().toLowerCase();
const role = String(process.argv[3] || "").trim().toLowerCase();
const allowedRoles = new Set(["user", "admin", "superadmin"]);

if (!email || !email.includes("@") || !allowedRoles.has(role)) {
  console.error(
    "Usage: node scripts/set-user-role.js <email> <user|admin|superadmin>",
  );
  process.exit(1);
}

try {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/whatsapp-ai",
  );
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role } },
    { new: true, runValidators: true },
  ).select("email role authProvider managedByPartner");

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exitCode = 2;
  } else {
    console.log(`Updated ${user.email} to role: ${user.role}`);
  }
} catch (error) {
  console.error(`Role update failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
