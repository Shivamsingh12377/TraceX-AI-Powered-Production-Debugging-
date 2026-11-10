
/**
 * TraceX Advanced Rule-Based Error Solution Engine
 *
 * Step 19.1
 *
 * Features:
 * - Error classification
 * - Possible root cause
 * - Specific troubleshooting steps
 * - Solution checklist
 * - Safe fallback for unknown errors
 * - Compatible with existing frontend
 *
 * No AI API required.
 */

// ==========================================
// HELPER: CREATE SOLUTION
// ==========================================

function createSolution({
  category,
  possibleCause,
  suggestions,
  priority = "medium",
  estimatedDifficulty = "moderate",
  verificationSteps = [],
  resources = [],
}) {
  return {
    category,
    possibleCause,
    suggestions,
    priority,
    estimatedDifficulty,

    // Structured steps for upcoming UI
    solutionSteps: suggestions.map((text, index) => ({
      id: `step-${index + 1}`,
      title: text,
      description: text,
      completed: false,
    })),

    verificationSteps,
    resources,

    analysisType: "rule-based",
    confidence: "possible",
    analyzedAt: new Date().toISOString(),
  };
}

// ==========================================
// MAIN ANALYZER
// ==========================================

function analyzeError(errorLog = {}) {
  const statusCode = Number(errorLog.statusCode) || 500;

  const message = String(
    errorLog.message || ""
  ).toLowerCase();

  const route = String(
    errorLog.route || ""
  );

  const method = String(
    errorLog.method || "UNKNOWN"
  ).toUpperCase();

  // ==========================================
  // 1. MONGODB CONNECTION ERRORS
  // ==========================================

  if (
    message.includes("mongoserverselectionerror") ||
    message.includes("econnrefused") &&
      message.includes("mongodb") ||
    message.includes("mongodb connection") ||
    message.includes("database connection") ||
    message.includes("failed to connect to server")
  ) {
    return createSolution({
      category: "MongoDB Connection Error",

      possibleCause:
        "The application may be unable to connect to MongoDB because of network restrictions, unavailable database servers, or incorrect configuration.",

      priority: "critical",

      estimatedDifficulty: "moderate",

      suggestions: [
        "Check whether MongoDB Atlas or your local MongoDB server is running.",
        "Verify the MONGODB_URI environment variable is configured correctly without exposing credentials.",
        "Check MongoDB Atlas Network Access settings and allow only trusted application IP addresses.",
        "Confirm the database user has the required permissions.",
        "Inspect backend terminal logs for the original connection failure.",
        "Restart the backend after correcting the configuration and test database connectivity.",
      ],

      verificationSteps: [
        "Confirm MongoDB connects successfully.",
        "Call GET /api/health and verify the database status.",
        "Retry the affected API request.",
      ],

      resources: [
        {
          title: "MongoDB Atlas Documentation",
          url: "https://www.mongodb.com/docs/atlas/",
        },
      ],
    });
  }

  // ==========================================
  // 2. MONGODB DUPLICATE KEY ERROR
  // ==========================================

  if (
    message.includes("e11000") ||
    message.includes("duplicate key")
  ) {
    return createSolution({
      category: "MongoDB Duplicate Key Error",

      possibleCause:
        "A database operation attempted to insert or update a value that must be unique.",

      priority: "medium",

      estimatedDifficulty: "easy",

      suggestions: [
        "Identify which unique field caused the duplicate key error.",
        "Check whether a record with the same value already exists.",
        "Validate unique fields before creating a new record.",
        "Return an appropriate conflict response such as HTTP 409.",
        "Retry the operation with a unique value.",
      ],

      verificationSteps: [
        "Confirm duplicate records are rejected safely.",
        "Confirm a unique value can be saved successfully.",
      ],
    });
  }

  // ==========================================
  // 3. MONGOOSE VALIDATION ERROR
  // ==========================================

  if (
    message.includes("validationerror") ||
    message.includes("validation failed") ||
    message.includes("cast to objectid failed") ||
    message.includes("casterror")
  ) {
    return createSolution({
      category: "Database Validation Error",

      possibleCause:
        "The request contains data that does not match the MongoDB schema or expected field types.",

      priority: "medium",

      estimatedDifficulty: "easy",

      suggestions: [
        "Inspect the fields mentioned in the validation error.",
        "Check required fields and their data types.",
        "Validate MongoDB ObjectIds before database queries.",
        "Review Mongoose schema validators.",
        "Correct the request payload and retry.",
      ],

      verificationSteps: [
        "Submit a valid payload and confirm success.",
        "Submit invalid data and confirm a controlled validation response.",
      ],
    });
  }

  // ==========================================
  // 4. JWT EXPIRED ERROR
  // ==========================================

  if (
    message.includes("jwt expired") ||
    message.includes("token expired") ||
    message.includes("tokenexpirederror")
  ) {
    return createSolution({
      category: "JWT Token Expired",

      possibleCause:
        "The authentication token has expired and can no longer authorize API requests.",

      priority: "medium",

      estimatedDifficulty: "easy",

      suggestions: [
        "Check whether the JWT expiration time has passed.",
        "Ask the user to log in again or use a valid refresh-token flow if implemented.",
        "Verify the backend JWT expiration configuration.",
        "Confirm the frontend handles HTTP 401 responses correctly.",
        "Retry the protected API with a valid token.",
      ],

      verificationSteps: [
        "Confirm an expired token is rejected.",
        "Log in again and verify the protected endpoint works.",
      ],
    });
  }

  // ==========================================
  // 5. INVALID JWT / AUTHENTICATION
  // ==========================================

  if (
    message.includes("invalid token") ||
    message.includes("jwt malformed") ||
    message.includes("jwt invalid") ||
    message.includes("unauthorized") ||
    statusCode === 401
  ) {
    return createSolution({
      category: "Authentication Error",

      possibleCause:
        "The request may be missing a valid authentication token or the provided token cannot be verified.",

      priority: "high",

      estimatedDifficulty: "moderate",

      suggestions: [
        "Verify that the user is logged in.",
        "Check whether the Authorization header is present.",
        "Confirm the header follows the Bearer token format.",
        "Review JWT verification middleware and configuration.",
        "Do not expose JWT secrets or token values in logs.",
        "Retry the request after obtaining a valid session.",
      ],

      verificationSteps: [
        "Confirm requests without a token are rejected.",
        "Confirm a valid authenticated request succeeds.",
      ],
    });
  }

  // ==========================================
  // 6. PERMISSION / FORBIDDEN ERROR
  // ==========================================

  if (
    statusCode === 403 ||
    message.includes("forbidden") ||
    message.includes("permission denied") ||
    message.includes("access denied")
  ) {
    return createSolution({
      category: "Authorization / Permission Error",

      possibleCause:
        "The authenticated user may not have permission to access the requested resource.",

      priority: "high",

      estimatedDifficulty: "moderate",

      suggestions: [
        "Check the user's assigned role and permissions.",
        "Review backend authorization middleware.",
        "Verify resource ownership and access rules.",
        "Confirm the API does not expose resources belonging to other users.",
        "Retry using an account with the appropriate permissions.",
      ],

      verificationSteps: [
        "Confirm unauthorized users are denied access.",
        "Confirm authorized users can access the resource.",
      ],
    });
  }

  // ==========================================
  // 7. NETWORK CONNECTION REFUSED
  // ==========================================

  if (
    message.includes("econnrefused") ||
    message.includes("connection refused")
  ) {
    return createSolution({
      category: "Network Connection Refused",

      possibleCause:
        "The application attempted to connect to a service that is not accepting connections.",

      priority: "high",

      estimatedDifficulty: "moderate",

      suggestions: [
        "Check whether the target service is running.",
        "Verify the configured hostname and port.",
        "Check firewall and network access restrictions.",
        "Inspect the service logs for startup failures.",
        "Retry the connection after the service becomes available.",
      ],

      verificationSteps: [
        "Confirm the target service is reachable.",
        "Retry the failed request.",
      ],
    });
  }

  // ==========================================
  // 8. NETWORK / API TIMEOUT
  // ==========================================

  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("etimedout") ||
    message.includes("econnreset") ||
    statusCode === 504
  ) {
    return createSolution({
      category: "API / Network Timeout",

      possibleCause:
        "The request or a dependent service may be responding too slowly or the connection may have been interrupted.",

      priority: "high",

      estimatedDifficulty: "moderate",

      suggestions: [
        "Check the affected API response time.",
        "Inspect database queries for slow operations.",
        "Verify external service availability.",
        "Review server resource usage.",
        "Check timeout settings and retry policies.",
        "Retry the request after addressing the underlying delay.",
      ],

      verificationSteps: [
        "Confirm the API responds within the expected time.",
        "Check whether repeated requests complete successfully.",
      ],
    });
  }

  // ==========================================
  // 9. JAVASCRIPT REFERENCE ERROR
  // ==========================================

  if (
    message.includes("referenceerror") ||
    message.includes("is not defined")
  ) {
    return createSolution({
      category: "JavaScript Reference Error",

      possibleCause:
        "The code may be referencing a variable, function, or module that is not defined in the current scope.",

      priority: "high",

      estimatedDifficulty: "moderate",

      suggestions: [
        "Find the variable or function mentioned in the error message.",
        "Inspect the source file and line number from the stack trace.",
        "Check for spelling mistakes and incorrect variable names.",
        "Verify the required module is imported correctly.",
        "Confirm the variable is declared before use.",
        "Restart the application and test the affected feature.",
      ],

      verificationSteps: [
        "Confirm the application starts without the ReferenceError.",
        "Retry the affected feature.",
      ],
    });
  }

  // ==========================================
  // 10. JAVASCRIPT TYPE ERROR
  // ==========================================

  if (
    message.includes("typeerror") ||
    message.includes("cannot read properties of") ||
    message.includes("is not a function")
  ) {
    return createSolution({
      category: "JavaScript Type Error",

      possibleCause:
        "The application may be accessing an invalid value or calling something that is not a function.",

      priority: "high",

      estimatedDifficulty: "moderate",

      suggestions: [
        "Inspect the failing expression and its input values.",
        "Check whether an object is null or undefined.",
        "Verify that the expected function exists.",
        "Validate API response structures before accessing nested properties.",
        "Add appropriate guards or optional chaining where suitable.",
        "Retest the affected functionality.",
      ],

      verificationSteps: [
        "Confirm the failing operation works with valid data.",
        "Test missing and unexpected input values.",
      ],
    });
  }

  // ==========================================
  // 11. JAVASCRIPT SYNTAX ERROR
  // ==========================================

  if (
    message.includes("syntaxerror") ||
    message.includes("unexpected token")
  ) {
    return createSolution({
      category: "JavaScript Syntax Error",

      possibleCause:
        "The JavaScript source may contain invalid syntax or malformed input is being parsed.",

      priority: "high",

      estimatedDifficulty: "easy",

      suggestions: [
        "Read the file name and line number in the error output.",
        "Check brackets, parentheses, commas and quotation marks.",
        "Verify the syntax of the affected function or module.",
        "If parsing JSON, inspect the input format.",
        "Run the application's syntax checks and restart the server.",
      ],

      verificationSteps: [
        "Confirm the application starts successfully.",
        "Retest the affected feature.",
      ],
    });
  }

  // ==========================================
  // 12. RATE LIMIT ERROR
  // ==========================================

  if (
    statusCode === 429 ||
    message.includes("too many requests") ||
    message.includes("rate limit")
  ) {
    return createSolution({
      category: "API Rate Limit Error",

      possibleCause:
        "The client may have exceeded the allowed number of requests.",

      priority: "medium",

      estimatedDifficulty: "easy",

      suggestions: [
        "Check the API's documented rate limits.",
        "Review whether the frontend is sending duplicate requests.",
        "Use request debouncing where appropriate.",
        "Respect the Retry-After header when provided.",
        "Reduce unnecessary polling and repeated requests.",
      ],

      verificationSteps: [
        "Confirm normal requests succeed within the allowed limits.",
        "Confirm excessive requests are handled correctly.",
      ],
    });
  }

  // ==========================================
  // 13. ROUTE NOT FOUND
  // ==========================================

  if (statusCode === 404) {
    return createSolution({
      category: "API Route Not Found",

      possibleCause:
        `The requested ${method} ${route} endpoint may be incorrect, missing or unavailable.`,

      priority: "medium",

      estimatedDifficulty: "easy",

      suggestions: [
        "Verify the requested API URL.",
        "Check whether the HTTP method matches the Express route.",
        "Confirm the route is registered in app.js.",
        "Inspect frontend API calls for incorrect paths.",
        "Check whether the route requires a dynamic parameter.",
        "Retry the correct endpoint.",
      ],

      verificationSteps: [
        "Confirm the expected endpoint returns a successful response.",
        "Confirm unknown routes return a controlled 404 response.",
      ],
    });
  }

  // ==========================================
  // 14. INVALID REQUEST / VALIDATION
  // ==========================================

  if (
    statusCode === 400 ||
    statusCode === 422
  ) {
    return createSolution({
      category: "Invalid API Request",

      possibleCause:
        "The request may contain invalid, incomplete or incorrectly formatted data.",

      priority: "medium",

      estimatedDifficulty: "easy",

      suggestions: [
        "Inspect the request payload.",
        "Check required fields and expected data types.",
        "Verify Content-Type and request headers.",
        "Review backend validation rules.",
        "Correct the request and retry.",
      ],

      verificationSteps: [
        "Confirm valid input is accepted.",
        "Confirm invalid input returns a clear validation error.",
      ],
    });
  }

  // ==========================================
  // 15. SERVICE UNAVAILABLE
  // ==========================================

  if (statusCode === 503) {
    return createSolution({
      category: "Service Unavailable",

      possibleCause:
        "The backend or a required service may be temporarily unavailable.",

      priority: "critical",

      estimatedDifficulty: "moderate",

      suggestions: [
        "Check whether the backend service is running.",
        "Inspect server logs for startup or runtime failures.",
        "Verify database and dependent service connectivity.",
        "Check resource usage and service health.",
        "Restore the affected service and retry the request.",
      ],

      verificationSteps: [
        "Confirm the service health endpoint responds successfully.",
        "Retry the previously failing API.",
      ],
    });
  }

  // ==========================================
  // 16. INTERNAL SERVER ERROR
  // ==========================================

  if (statusCode >= 500) {
    return createSolution({
      category: "Internal Server Error",

      possibleCause:
        "An unexpected error occurred in the backend application. The exact cause requires additional diagnostic information.",

      priority: "critical",

      estimatedDifficulty: "moderate",

      suggestions: [
        "Inspect backend logs around the error timestamp.",
        "Identify the failing route and controller.",
        "Review recent code changes.",
        "Check database and dependent service availability.",
        "Reproduce the error in the development environment.",
        "Apply the identified fix and retry the API request.",
      ],

      verificationSteps: [
        "Confirm the original error no longer occurs.",
        "Retry the affected API request.",
        "Check backend logs for repeated failures.",
      ],
    });
  }

  // ==========================================
  // 17. GENERAL CLIENT ERROR
  // ==========================================

  if (statusCode >= 400) {
    return createSolution({
      category: "Client Request Error",

      possibleCause:
        "The request was rejected by the application.",

      priority: "medium",

      estimatedDifficulty: "easy",

      suggestions: [
        "Check the HTTP status code and error message.",
        "Verify the API endpoint and request method.",
        "Inspect the request payload and headers.",
        "Review backend validation and access rules.",
        "Correct the request and retry.",
      ],

      verificationSteps: [
        "Confirm the corrected request succeeds.",
      ],
    });
  }

  // ==========================================
  // 18. UNKNOWN ERROR FALLBACK
  // ==========================================

  return createSolution({
    category: "General Application Error",

    possibleCause:
      "The available error information is insufficient to identify a specific root cause.",

    priority: "medium",

    estimatedDifficulty: "moderate",

    suggestions: [
      "Inspect application logs.",
      "Identify the affected component.",
      "Review recent changes.",
      "Reproduce the issue in development.",
      "Apply the appropriate fix and test again.",
    ],

    verificationSteps: [
      "Confirm the affected feature works.",
      "Check that the error does not recur during testing.",
    ],
  });
}

module.exports = analyzeError;
