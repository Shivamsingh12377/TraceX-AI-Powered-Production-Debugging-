
const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    method: {
      type: String,
      default: "UNKNOWN",
    },

    route: {
      type: String,
      default: "UNKNOWN",
    },

    statusCode: {
      type: Number,
      default: 500,
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "high",
    },

    source: {
      type: String,
      default: "TraceX Backend",
    },

    resolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

errorLogSchema.index({ createdAt: -1 });
errorLogSchema.index({ severity: 1 });

module.exports = mongoose.model(
  "ErrorLog",
  errorLogSchema
);
