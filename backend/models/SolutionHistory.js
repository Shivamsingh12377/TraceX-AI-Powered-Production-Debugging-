
const mongoose = require("mongoose");

const solutionHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    problem: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },

    ruleId: {
      type: String,
      default: "",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      default: "General",
    },

    notes: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    verified: {
      type: Boolean,
      required: true,
      default: false,
    },

    stepsCompleted: {
      type: Number,
      required: true,
      min: 0,
    },

    totalSteps: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

solutionHistorySchema.index({
  user: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "SolutionHistory",
  solutionHistorySchema
);
