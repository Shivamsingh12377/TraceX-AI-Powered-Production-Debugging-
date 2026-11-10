
const ApiMetric = require("../models/ApiMetric");

function apiMonitor(req, res, next) {
  // Monitor only TraceX API requests.
  if (
  req.path === "/api/health" ||
  req.path.startsWith("/api/api-health/")
) {
  return next();
}

  // Avoid tracking monitoring dashboard requests,
  // otherwise refreshing the dashboard generates
  // additional monitoring records.
  if (req.path.startsWith("/api/health")) {
    return next();
  }

  const startTime = process.hrtime.bigint();

  res.once("finish", () => {
    const endTime = process.hrtime.bigint();

    const responseTime = Number(
      (Number(endTime - startTime) / 1_000_000).toFixed(2)
    );

    const statusCode = res.statusCode;

    // Use the registered route pattern when available,
    // so dynamic IDs do not create separate endpoints.
    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path;

    const metric = {
      method: req.method,
      route,
      statusCode,
      responseTime,
      success: statusCode < 400,
    };

    // Save asynchronously without delaying
    // the API response.
    ApiMetric.create(metric)
      .then(() => {
        const io = req.app.get("io");

        if (io) {
          io.emit("api:metric", metric);
        }
      })
      .catch((error) => {
        console.error(
          "API metric save failed:",
          error.message
        );
      });
  });

  next();
}

module.exports = apiMonitor;
