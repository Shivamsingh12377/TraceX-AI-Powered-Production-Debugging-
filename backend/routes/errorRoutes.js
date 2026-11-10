
const express = require("express");
const mongoose = require("mongoose");

const ErrorLog = require("../models/ErrorLog");
const SolutionHistory = require("../models/SolutionHistory");

const authMiddleware = require(
  "../middleware/authmiddleware"
);

const analyzeError = require("../services/errorAnalyzer");
const solveProblem = require("../services/problemSolver");

const router = express.Router();

// ======================================
// GET ERROR STATISTICS
// GET /api/errors/stats
// ======================================

router.get("/stats", async (req, res, next) => {
  try {
    const [
      totalErrors,
      criticalErrors,
      unresolvedErrors,
      resolvedErrors,
    ] = await Promise.all([
      ErrorLog.countDocuments(),
      ErrorLog.countDocuments({
        severity: "critical",
      }),
      ErrorLog.countDocuments({
        resolved: false,
      }),
      ErrorLog.countDocuments({
        resolved: true,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalErrors,
        criticalErrors,
        unresolvedErrors,
        resolvedErrors,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================================
// NEW: REPORTS & ANALYTICS
// GET /api/errors/analytics?days=30
// ======================================

router.get("/analytics", async (req, res, next) => {
  try {
    const allowedDays = [7, 30, 90];

    const days = Number(req.query.days || 30);

    if (!allowedDays.includes(days)) {
      return res.status(400).json({
        success: false,
        message: "Days must be 7, 30 or 90.",
      });
    }

    // Use UTC calendar days for consistent
    // grouping between backend and frontend.
    const now = new Date();

    const endDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1
      )
    );

    const startDate = new Date(
      endDate.getTime() -
        days * 24 * 60 * 60 * 1000
    );

    const dateFilter = {
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
    };

    // Aggregate severity, resolution and daily
    // counts directly from MongoDB.
    const [
      severityResults,
      resolutionResults,
      dailyResults,
    ] = await Promise.all([
      ErrorLog.aggregate([
        {
          $match: dateFilter,
        },
        {
          $group: {
            _id: "$severity",
            count: { $sum: 1 },
          },
        },
      ]),

      ErrorLog.aggregate([
        {
          $match: dateFilter,
        },
        {
          $group: {
            _id: "$resolved",
            count: { $sum: 1 },
          },
        },
      ]),

      ErrorLog.aggregate([
        {
          $match: dateFilter,
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),
    ]);

    // ======================================
    // SEVERITY DISTRIBUTION
    // ======================================

    const severityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const item of severityResults) {
      if (
        Object.prototype.hasOwnProperty.call(
          severityDistribution,
          item._id
        )
      ) {
        severityDistribution[item._id] = item.count;
      }
    }

    // ======================================
    // RESOLUTION STATUS
    // ======================================

    const resolutionStatus = {
      resolved: 0,
      unresolved: 0,
    };

    for (const item of resolutionResults) {
      if (item._id === true) {
        resolutionStatus.resolved = item.count;
      } else if (item._id === false) {
        resolutionStatus.unresolved = item.count;
      }
    }

    // ======================================
    // DAILY ERROR TRENDS
    // ======================================

    const dailyCountMap = new Map(
      dailyResults.map((item) => [
        item._id,
        item.count,
      ])
    );

    const dailyTrends = [];

    for (let index = 0; index < days; index++) {
      const currentDate = new Date(
        startDate.getTime() +
          index * 24 * 60 * 60 * 1000
      );

      const dateKey = currentDate
        .toISOString()
        .slice(0, 10);

      dailyTrends.push({
        date: dateKey,
        count: dailyCountMap.get(dateKey) || 0,
      });
    }

    // ======================================
    // SUMMARY
    // ======================================

    const totalErrors =
      resolutionStatus.resolved +
      resolutionStatus.unresolved;

    const resolutionRate =
      totalErrors > 0
        ? Number(
            (
              (resolutionStatus.resolved /
                totalErrors) *
              100
            ).toFixed(1)
          )
        : 0;

    return res.status(200).json({
      success: true,
      message: "Analytics loaded successfully",
      data: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        summary: {
          totalErrors,
          criticalErrors:
            severityDistribution.critical,
          resolvedErrors:
            resolutionStatus.resolved,
          unresolvedErrors:
            resolutionStatus.unresolved,
          resolutionRate,
        },
        severityDistribution,
        resolutionStatus,
        dailyTrends,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ======================================
// SMART PROBLEM SOLVER
// POST /api/errors/solve
// ======================================

router.post("/solve", (req, res, next) => {
  try {
    const problem = req.body?.problem;

    if (
      typeof problem !== "string" ||
      !problem.trim() ||
      problem.length > 10000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Problem must be a non-empty string of at most 10000 characters.",
      });
    }

    const solution = solveProblem(problem);

    return res.status(200).json({
      success: true,
      message: "Problem analyzed successfully",
      data: solution,
    });
  } catch (error) {
    next(error);
  }
});

// ======================================
// GET SOLUTION HISTORY
// GET /api/errors/solutions
// ======================================

router.get(
  "/solutions",
  authMiddleware,
  async (req, res, next) => {
    try {
      const solutions = await SolutionHistory.find({
        user: req.user.id,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.status(200).json({
        success: true,
        count: solutions.length,
        data: solutions,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ======================================
// SAVE SOLUTION HISTORY
// POST /api/errors/solutions
// ======================================

router.post(
  "/solutions",
  authMiddleware,
  async (req, res, next) => {
    try {
      const {
        problem,
        ruleId,
        title,
        category,
        notes,
        verified,
        stepsCompleted,
        totalSteps,
      } = req.body || {};

      if (
        typeof problem !== "string" ||
        !problem.trim() ||
        problem.length > 10000 ||
        typeof title !== "string" ||
        !title.trim() ||
        title.length > 200 ||
        typeof notes !== "string" ||
        !notes.trim() ||
        notes.length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid problem, title and resolution notes are required.",
        });
      }

      if (
        (ruleId !== undefined &&
          (typeof ruleId !== "string" ||
            ruleId.length > 100)) ||
        (category !== undefined &&
          (typeof category !== "string" ||
            category.length > 100))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid rule ID or category.",
        });
      }

      if (verified !== true) {
        return res.status(400).json({
          success: false,
          message:
            "Please manually verify the fix before saving.",
        });
      }

      if (
        !Number.isInteger(stepsCompleted) ||
        !Number.isInteger(totalSteps) ||
        totalSteps < 1 ||
        totalSteps > 100 ||
        stepsCompleted !== totalSteps
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All solution steps must be completed.",
        });
      }

      const savedSolution =
        await SolutionHistory.create({
          user: req.user.id,
          problem: problem.trim(),
          ruleId: ruleId || "",
          title: title.trim(),
          category: category || "General",
          notes: notes.trim(),
          verified: true,
          stepsCompleted,
          totalSteps,
        });

      return res.status(201).json({
        success: true,
        message: "Solution saved successfully",
        data: savedSolution,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ======================================
// DELETE SOLUTION HISTORY
// DELETE /api/errors/solutions/:id
// ======================================

router.delete(
  "/solutions/:id",
  authMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid solution ID",
        });
      }

      const deletedSolution =
        await SolutionHistory.findOneAndDelete({
          _id: id,
          user: req.user.id,
        });

      if (!deletedSolution) {
        return res.status(404).json({
          success: false,
          message:
            "Solution not found or access denied.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Solution deleted successfully",
        data: {
          id: deletedSolution._id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ======================================
// GET ALL ERROR LOGS
// GET /api/errors
// ======================================

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 10
      )
    );

    const filter = {};

    const allowedSeverities = [
      "low",
      "medium",
      "high",
      "critical",
    ];

    if (
      allowedSeverities.includes(req.query.severity)
    ) {
      filter.severity = req.query.severity;
    }

    if (req.query.resolved === "true") {
      filter.resolved = true;
    }

    if (req.query.resolved === "false") {
      filter.resolved = false;
    }

    const [errors, total] = await Promise.all([
      ErrorLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      ErrorLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: errors.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: errors,
    });
  } catch (error) {
    next(error);
  }
});

// ======================================
// GET SINGLE ERROR DETAILS
// GET /api/errors/:id
// ======================================

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid error ID",
      });
    }

    const errorLog = await ErrorLog.findById(id).lean();

    if (!errorLog) {
      return res.status(404).json({
        success: false,
        message: "Error log not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: errorLog,
    });
  } catch (error) {
    next(error);
  }
});

// ======================================
// RESOLVE / REOPEN ERROR
// PATCH /api/errors/:id/resolve
// ======================================

router.patch("/:id/resolve", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolved } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid error ID",
      });
    }

    if (typeof resolved !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "resolved must be true or false",
      });
    }

    const updatedError = await ErrorLog.findByIdAndUpdate(
      id,
      {
        $set: {
          resolved,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedError) {
      return res.status(404).json({
        success: false,
        message: "Error log not found",
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.emit("error:updated", {
        id: updatedError._id,
        resolved: updatedError.resolved,
        updatedAt: updatedError.updatedAt,
      });

      console.log(
        "[TraceX] Real-time error update emitted:",
        updatedError._id,
        "Resolved:",
        updatedError.resolved
      );
    }

    return res.status(200).json({
      success: true,
      message: resolved
        ? "Error marked as resolved"
        : "Error reopened successfully",
      data: updatedError,
    });
  } catch (error) {
    next(error);
  }
});

// ======================================
// ERROR ROOT CAUSE ANALYSIS
// POST /api/errors/:id/analyze
// ======================================

router.post("/:id/analyze", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid error ID",
      });
    }

    const errorLog = await ErrorLog.findById(id).lean();

    if (!errorLog) {
      return res.status(404).json({
        success: false,
        message: "Error log not found",
      });
    }

    const analysis = analyzeError(errorLog);

    return res.status(200).json({
      success: true,
      message: "Error analysis completed",
      data: {
        errorId: errorLog._id,
        ...analysis,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
