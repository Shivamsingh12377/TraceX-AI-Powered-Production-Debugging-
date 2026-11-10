
const mongoose = require("mongoose");

const apiMetricSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    route: {
      type: String,
      required: true,
      trim: true,
    },

    statusCode: {
      type: Number,
      required: true,
    },

    responseTime: {
      type: Number,
      required: true,
      min: 0,
    },

    success: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

apiMetricSchema.index({ createdAt: -1 });
apiMetricSchema.index({ route: 1, createdAt: -1 });
apiMetricSchema.index({ statusCode: 1 });

module.exports = mongoose.model(
  "ApiMetric",
  apiMetricSchema
);
