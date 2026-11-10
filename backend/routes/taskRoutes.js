
const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const Activity = require("../models/Activity");

const router = express.Router();

// ===================================
// SOCKET.IO HELPER
// ===================================

function emitTaskEvent(req, eventName, data) {
  const io = req.app.get("io");

  if (io) {
    io.emit(eventName, data);

    console.log(
      `[TraceX] Socket.IO event: ${eventName}`
    );
  }
}

// ===================================
// HELPER: SAVE TASK ACTIVITY
// ===================================

async function saveActivity({
  taskId,
  taskTitle,
  action,
  details = "",
}) {
  try {
    await Activity.create({
      taskId,
      taskTitle,
      action,
      details,
    });
  } catch (error) {
    // Activity failure should not break task CRUD.
    console.error(
      "Failed to save task activity:",
      error.message
    );
  }
}

// ===================================
// GET ALL TASKS
// ===================================

router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ===================================
// GET SINGLE TASK
// ===================================

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ===================================
// CREATE TASK + ACTIVITY + SOCKET.IO
// ===================================

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      category,
      labels,
    } = req.body || {};

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      priority,
      status,
      dueDate: dueDate || null,
      category: category || "General",
      labels: Array.isArray(labels)
        ? labels
        : [],
    });

    // Record task creation
    await saveActivity({
      taskId: task._id,
      taskTitle: task.title,
      action: "created",
      details: "Task created successfully",
    });

    // NEW: Notify connected clients
    emitTaskEvent(req, "task:created", task);

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ===================================
// UPDATE TASK + ACTIVITY + SOCKET.IO
// ===================================

router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "priority",
      "status",
      "dueDate",
      "category",
      "labels",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body || {},
          field
        )
      ) {
        updates[field] = req.body[field];
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "title"
      ) &&
      (
        typeof updates.title !== "string" ||
        !updates.title.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    if (typeof updates.title === "string") {
      updates.title = updates.title.trim();
    }

    if (updates.dueDate === "") {
      updates.dueDate = null;
    }

    // Get previous task to compare changes
    const oldTask = await Task.findById(
      req.params.id
    );

    if (!oldTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Record status changes
    if (oldTask.status !== task.status) {
      await saveActivity({
        taskId: task._id,
        taskTitle: task.title,
        action: "status_changed",
        details: `${oldTask.status} → ${task.status}`,
      });
    }

    // Record other task updates
    const otherFields = allowedFields.filter(
      (field) => field !== "status"
    );

    const changedFields = otherFields.filter(
      (field) => {
        if (
          !Object.prototype.hasOwnProperty.call(
            updates,
            field
          )
        ) {
          return false;
        }

        const oldValue = oldTask[field];
        const newValue = task[field];

        if (field === "dueDate") {
          const oldDate = oldValue
            ? new Date(oldValue)
                .toISOString()
                .slice(0, 10)
            : "";

          const newDate = newValue
            ? new Date(newValue)
                .toISOString()
                .slice(0, 10)
            : "";

          return oldDate !== newDate;
        }

        if (field === "labels") {
          return (
            JSON.stringify(oldValue || []) !==
            JSON.stringify(newValue || [])
          );
        }

        return oldValue !== newValue;
      }
    );

    if (changedFields.length > 0) {
      await saveActivity({
        taskId: task._id,
        taskTitle: task.title,
        action: "updated",
        details: `Updated: ${changedFields.join(
          ", "
        )}`,
      });
    }

    // NEW: Notify connected clients
    emitTaskEvent(req, "task:updated", task);

    res.json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ===================================
// DELETE TASK + ACTIVITY + SOCKET.IO
// ===================================

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findByIdAndDelete(
      req.params.id
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Keep deletion history
    await saveActivity({
      taskId: task._id,
      taskTitle: task.title,
      action: "deleted",
      details: "Task deleted successfully",
    });

    // NEW: Notify connected clients
    emitTaskEvent(req, "task:deleted", {
      id: task._id,
    });

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
