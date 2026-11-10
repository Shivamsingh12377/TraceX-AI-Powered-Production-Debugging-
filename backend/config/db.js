const dns = require("node:dns");
const mongoose = require("mongoose");

async function connectDB() {
  try {
    const dnsServers = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1")
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean);
    dns.setServers(dnsServers);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;