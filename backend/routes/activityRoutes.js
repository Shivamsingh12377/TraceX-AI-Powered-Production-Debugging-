
const express = require("express");
const mongoose = require("mongoose");
const Activity = require("../models/Activity");

const router = express.Router();

const VALID_ACTIONS = [
  "created",
  "updated",
  "status_changed",
  "deleted",
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/activities
// Pagination + Search + Filters
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger((page - 1) * limit)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
      });
    }

    const filter = {};

    // Activity type filter
    const action = String(req.query.action || "all");

    if (action !== "all") {
      if (!VALID_ACTIONS.includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Invalid activity action.",
        });
      }

      filter.action = action;
    }

    // Search by task title
    const search = String(req.query.search || "").trim();

    if (search.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Search must be 100 characters or fewer.",
      });
    }

    if (search) {
      filter.taskTitle = {
        $regex: escapeRegex(search),
        $options: "i",
      };
    }

    // Date range filter
    const { startDate, endDate } = req.query;

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid startDate.",
          });
        }

        filter.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid endDate.",
          });
        }

        filter.createdAt.$lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [totalActivities, activities] = await Promise.all([
      Activity.countDocuments(filter),
      Activity.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalActivities / limit);

    return res.status(200).json({
      success: true,
      count: activities.length,
      totalActivities,
      currentPage: page,
      totalPages,
      hasMore: page < totalPages,
      data: activities,
    });
  } catch (error) {
    console.error("Activity fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch activities.",
    });
  }
});

// DELETE /api/activities/:id
// Deletes only an activity history record
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID.",
      });
    }

    const deletedActivity =
      await Activity.findByIdAndDelete(id);

    if (!deletedActivity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Activity deleted successfully.",
      data: {
        _id: deletedActivity._id,
        taskTitle: deletedActivity.taskTitle,
        action: deletedActivity.action,
      },
    });
  } catch (error) {
    console.error("Activity delete error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete activity.",
    });
  }
});


/*
 * Step 12.12.1
 * DELETE /api/activities
 * Clear all activity history
 */
router.delete("/", async (req, res) => {
  try {
    const result = await Activity.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "All activity history cleared successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Clear activity history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to clear activity history.",
    });
  }
});

module.exports = router;
