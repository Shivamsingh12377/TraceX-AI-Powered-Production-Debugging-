
const ErrorLog = require("../models/ErrorLog");

// ===================================
// DETERMINE ERROR SEVERITY
// ===================================

function getSeverity(statusCode) {
  if (statusCode >= 500) return "critical";
  if (statusCode >= 400) return "medium";
  return "low";
}

// ===================================
// EXPRESS ERROR HANDLER
// ===================================

async function errorHandler(err, req, res, next) {
  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  console.error(
    `[TraceX Error] ${req.method} ${req.path}:`,
    err.message
  );

  try {
    // STEP 1: Save error to MongoDB
    const savedError = await ErrorLog.create({
      message: err.message || "Unknown server error",
      method: req.method,
      route: req.path,
      statusCode,
      severity: getSeverity(statusCode),
      source: "TraceX Backend",
    });

    // STEP 2: Get Socket.IO instance
    const io = req.app.get("io");

    // STEP 3: Notify connected clients
    if (io) {
      io.emit("error:new", {
        id: savedError._id,
        severity: savedError.severity,
        statusCode: savedError.statusCode,
        createdAt: savedError.createdAt,
      });

      console.log(
        "[TraceX Socket.IO] New error event emitted"
      );
    }
  } catch (loggingError) {
    // Logging failure should not break API response
    console.error(
      "TraceX error logging failed:",
      loggingError.message
    );
  }

  // STEP 4: Send API error response
  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Internal server error"
        : err.message || "Request failed",
  });
}

module.exports = errorHandler;
