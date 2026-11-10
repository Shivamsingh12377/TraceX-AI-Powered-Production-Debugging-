const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },

    dueDate: {
      type: Date,
      default: null,
    },
    
category: {
  type: String,
  enum: [
    "General",
    "Frontend",
    "Backend",
    "Bug Fix",
    "Design",
  ],
  default: "General",
},


labels: {
  type: [String],
  default: [],
},

  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Task || mongoose.model("Task", taskSchema);