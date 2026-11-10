
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

// ===================================
// ROUTES IMPORT
// ===================================

const authRoutes = require("./routes/authroutes");
const taskRoutes = require("./routes/taskRoutes");
const activityRoutes = require("./routes/activityRoutes");

// ERROR MONITORING ROUTES
const errorRoutes = require("./routes/errorRoutes");

// STEP 8.2: API HEALTH ANALYTICS ROUTES
const apiHealthRoutes = require("./routes/apiHealthRoutes");

// ERROR DETECTION MIDDLEWARE
const errorHandler = require("./middleware/errorHandler");

// ===================================
// STEP 8.1: API HEALTH MONITORING
// ===================================

// Automatically tracks API request performance
const apiMonitor = require("./middleware/apiMonitor");

const app = express();

// ===================================
// GLOBAL MIDDLEWARE
// ===================================

app.use(helmet());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ===================================
// STEP 8.1: API MONITORING MIDDLEWARE
// ===================================

// Register before all API routes.
//
// Tracks:
// - HTTP method
// - API endpoint
// - Status code
// - Response time
// - Success / failure
//
// Stores metrics in MongoDB.
// Emits "api:metric" through Socket.IO.

app.use(apiMonitor);

// ===================================
// HOME API
// ===================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TraceX API is running",
  });
});

// ===================================
// HEALTH CHECK API
// ===================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    server: "running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// ===================================
// AUTHENTICATION ROUTES
// ===================================

app.use("/api/auth", authRoutes);

// ===================================
// TASK MANAGEMENT ROUTES
// ===================================

app.use("/api/tasks", taskRoutes);

// ===================================
// ACTIVITY HISTORY ROUTES
// ===================================

app.use("/api/activities", activityRoutes);

// ===================================
// ERROR MONITORING ROUTES
// ===================================

// Existing endpoints preserved:
// GET /api/errors
// GET /api/errors/stats
// GET /api/errors/analytics
// And other error monitoring endpoints.

app.use("/api/errors", errorRoutes);

// ===================================
// STEP 8.2: API HEALTH ANALYTICS ROUTES
// ===================================

// New endpoint:
// GET /api/api-health/analytics?days=7
//
// Other supported periods:
// ?days=1
// ?days=30

app.use("/api/api-health", apiHealthRoutes);

// ===================================
// DEVELOPMENT ERROR TEST ROUTE
// ===================================

// Available only when NODE_ENV=development.

if (process.env.NODE_ENV === "development") {
  app.get("/api/test-error", (req, res, next) => {
    const error = new Error(
      "TraceX test error: simulated API failure"
    );

    error.statusCode = 500;

    next(error);
  });
}

// ===================================
// 404 - ROUTE NOT FOUND
// ===================================

app.use((req, res, next) => {
  const error = new Error("API route not found");

  error.statusCode = 404;

  next(error);
});

// ===================================
// GLOBAL ERROR HANDLER
// ===================================

// Keep this middleware at the end.
// It records errors in MongoDB.

app.use(errorHandler);

// ===================================
// EXPORT EXPRESS APP
// ===================================

module.exports = app;
