
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    taskTitle: {
      type: String,
      required: true,
      trim: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "updated",
        "status_changed",
        "deleted",
      ],
    },

    details: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Activity ||
  mongoose.model("Activity", activitySchema);
