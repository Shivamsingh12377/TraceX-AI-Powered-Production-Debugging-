
const express = require("express");
const ApiMetric = require("../models/ApiMetric");

const router = express.Router();

// ==========================================
// GET /api/api-health/analytics
// ==========================================
// Returns API performance statistics
// from MongoDB.
//
// Supported periods: 1, 7, 30 days.
// ==========================================

router.get("/analytics", async (req, res) => {
  try {
    const days = Number(req.query.days || 7);

    if (![1, 7, 30].includes(days)) {
      return res.status(400).json({
        success: false,
        message: "Days must be 1, 7, or 30",
      });
    }

    const startDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    );

    const filter = {
      createdAt: { $gte: startDate },
    };

    // ======================================
    // OVERALL STATISTICS
    // ======================================

    const [overallStats] = await ApiMetric.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,

          totalRequests: {
            $sum: 1,
          },

          successfulRequests: {
            $sum: {
              $cond: [{ $lt: ["$statusCode", 400] }, 1, 0],
            },
          },

          failedRequests: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },

          averageResponseTime: {
            $avg: "$responseTime",
          },

          fastestResponseTime: {
            $min: "$responseTime",
          },

          slowestResponseTime: {
            $max: "$responseTime",
          },
        },
      },
    ]);

    const totalRequests =
      overallStats?.totalRequests || 0;

    const successfulRequests =
      overallStats?.successfulRequests || 0;

    const failedRequests =
      overallStats?.failedRequests || 0;

    const successRate =
      totalRequests > 0
        ? Number(
            (
              (successfulRequests / totalRequests) *
              100
            ).toFixed(2)
          )
        : 0;

    const failureRate =
      totalRequests > 0
        ? Number(
            (
              (failedRequests / totalRequests) *
              100
            ).toFixed(2)
          )
        : 0;

    // ======================================
    // ENDPOINT PERFORMANCE
    // ======================================

    const endpointStats = await ApiMetric.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            method: "$method",
            route: "$route",
          },

          totalRequests: {
            $sum: 1,
          },

          failedRequests: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },

          averageResponseTime: {
            $avg: "$responseTime",
          },

          maxResponseTime: {
            $max: "$responseTime",
          },
        },
      },
      {
        $project: {
          _id: 0,

          method: "$_id.method",
          route: "$_id.route",
          totalRequests: 1,
          failedRequests: 1,

          averageResponseTime: {
            $round: ["$averageResponseTime", 2],
          },

          maxResponseTime: {
            $round: ["$maxResponseTime", 2],
          },
        },
      },
      {
        $sort: {
          averageResponseTime: -1,
        },
      },
    ]);

    // ======================================
    // DAILY PERFORMANCE TRENDS
    // ======================================

    const dailyTrends = await ApiMetric.aggregate([
      {
        $match: filter,
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

          requests: {
            $sum: 1,
          },

          failures: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },

          averageResponseTime: {
            $avg: "$responseTime",
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          requests: 1,
          failures: 1,

          averageResponseTime: {
            $round: ["$averageResponseTime", 2],
          },
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ]);

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "API Health analytics loaded successfully",

      data: {
        days,

        summary: {
          totalRequests,
          successfulRequests,
          failedRequests,
          successRate,
          failureRate,

          averageResponseTime: Number(
            (
              overallStats?.averageResponseTime || 0
            ).toFixed(2)
          ),

          fastestResponseTime:
            overallStats?.fastestResponseTime || 0,

          slowestResponseTime:
            overallStats?.slowestResponseTime || 0,
        },

        endpointStats,
        dailyTrends,
      },
    });
  } catch (error) {
    console.error(
      "API Health analytics error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load API Health analytics",
    });
  }
});

module.exports = router;
