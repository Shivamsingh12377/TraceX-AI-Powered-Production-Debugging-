
"use strict";

// ======================================
// TraceX SMART PROBLEM SOLVER
// Rule-Based Knowledge Base (No AI)
// ======================================

const solutions = [
  // ====================================
  // 1. MONGODB CONNECTION TIMEOUT
  // ====================================
  {
    id: "mongodb-timeout",
    title: "MongoDB Connection Timeout",
    patterns: [
      /server selection timed out/i,
      /serverselectiontimeouterror/i,
      /mongodb.*timed out/i,
      /mongoose.*timed out/i,
      /connect etimedout/i,
      /buffering timed out/i,
    ],
    category: "Database Connection Error",
    possibleCauses: [
      "MongoDB server or Atlas cluster may be unreachable.",
      "MongoDB Atlas network access may block the connection.",
      "MONGO_URI may be missing or incorrectly configured.",
      "DNS or network connectivity may be failing.",
    ],
    steps: [
      "Check whether your MongoDB Atlas cluster is running.",
      "Check Atlas Network Access and allow your current trusted IP address.",
      "Verify the MONGO_URI variable without sharing credentials.",
      "Check whether dotenv loads environment variables before database connection.",
      "Inspect the backend terminal for the complete connection error.",
      "Restart the backend and test a database-dependent API.",
    ],
    codeExample: `const mongoose = require("mongoose");

async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
    throw error;
  }
}

module.exports = connectDB;`,
    verification:
      "Restart the backend and confirm a database-dependent API returns the expected result.",
  },

  // ====================================
  // 2. MONGODB AUTHENTICATION ERROR
  // ====================================
  {
    id: "mongodb-auth",
    title: "MongoDB Authentication Failed",
    patterns: [
      /authentication failed/i,
      /bad auth/i,
      /auth failed.*mongodb/i,
      /mongoservererror.*authentication/i,
    ],
    category: "Database Authentication Error",
    possibleCauses: [
      "MongoDB database username or password may be incorrect.",
      "The connection string may contain improperly encoded special characters.",
      "The database user may lack required permissions.",
    ],
    steps: [
      "Check the database user in MongoDB Atlas.",
      "Verify the username and password in your environment configuration.",
      "Ensure special characters in the password are correctly URL-encoded.",
      "Check database user permissions.",
      "Restart the backend and retry the connection.",
      "Never expose your database password or full connection URI in logs.",
    ],
    codeExample: "",
    verification:
      "Confirm the backend connects to MongoDB without authentication errors.",
  },

  // ====================================
  // 3. CORS ERROR
  // ====================================
  {
    id: "cors-error",
    title: "CORS Configuration Error",
    patterns: [
      /blocked by cors policy/i,
      /access-control-allow-origin/i,
      /cors error/i,
      /cross.origin request blocked/i,
      /preflight request/i,
    ],
    category: "API Configuration Error",
    possibleCauses: [
      "The backend may not allow requests from the frontend origin.",
      "CORS middleware may be missing or incorrectly configured.",
      "The browser preflight request may be failing.",
    ],
    steps: [
      "Check the frontend URL and backend API URL.",
      "Verify that the Express cors package is installed.",
      "Configure CORS middleware before registering API routes.",
      "Allow the correct trusted frontend origin.",
      "Check whether the failing request requires additional headers or credentials.",
      "Restart the backend and retry the request.",
    ],
    codeExample: `const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: ["http://localhost:5174"],
}));

app.use(express.json());

// Register your routes below this line.`,
    verification:
      "Retry the frontend request and confirm the browser no longer reports a CORS policy error.",
  },

  // ====================================
  // 4. PORT ALREADY IN USE
  // ====================================
  {
    id: "port-in-use",
    title: "Port Already in Use",
    patterns: [
      /eaddrinuse/i,
      /port \\d+ is already in use/i,
      /address already in use/i,
    ],
    category: "Server Startup Error",
    possibleCauses: [
      "Another application or development server may already be using the port.",
      "An older instance of your application may still be running.",
    ],
    steps: [
      "Check whether another frontend or backend server is already running.",
      "Identify which application is using the requested port.",
      "Stop only the duplicate process you recognize and no longer need.",
      "Alternatively, configure your application to use another available port.",
      "Restart the application.",
    ],
    codeExample: `// Express example
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});`,
    verification:
      "Confirm the development server starts on the expected port without EADDRINUSE.",
  },

  // ====================================
  // 5. UNDEFINED PROPERTY
  // ====================================
  {
    id: "undefined-property",
    title: "Cannot Read Properties of Undefined",
    patterns: [
      /cannot read properties of undefined/i,
      /cannot read property .* of undefined/i,
      /cannot read properties of null/i,
      /cannot read property .* of null/i,
    ],
    category: "JavaScript Runtime Error",
    possibleCauses: [
      "A variable may be undefined or null when a property is accessed.",
      "API data may not have loaded yet.",
      "A component may receive an unexpected value.",
    ],
    steps: [
      "Find the exact file and line number in the stack trace.",
      "Identify the object being accessed.",
      "Check whether the value is undefined or null.",
      "Verify the API response structure.",
      "Use optional chaining or appropriate fallback values when missing data is expected.",
      "Retest the affected feature.",
    ],
    codeExample: `const userName = user?.name ?? "Unknown";

const tasks = Array.isArray(data?.tasks)
  ? data.tasks
  : [];

console.log("Tasks:", tasks);`,
    verification:
      "Repeat the failing action and confirm the page handles missing data without crashing.",
  },

  // ====================================
  // 6. MODULE NOT FOUND
  // ====================================
  {
    id: "module-not-found",
    title: "Module Not Found",
    patterns: [
      /cannot find module/i,
      /module not found/i,
      /failed to resolve import/i,
      /err_module_not_found/i,
      /could not resolve/i,
    ],
    category: "Dependency / Import Error",
    possibleCauses: [
      "An imported file path may be incorrect.",
      "A required package may not be installed.",
      "The filename capitalization may not match.",
      "The import may point to the wrong directory.",
    ],
    steps: [
      "Read the exact missing module name from the error.",
      "Check whether the imported file exists.",
      "Verify relative paths such as ./ and ../.",
      "Check filename capitalization.",
      "If it is an external package, verify that it is listed in package.json and installed.",
      "Restart the development server after fixing the import.",
    ],
    codeExample: `// Example: importing a local React page
import ErrorMonitoring from "./pages/ErrorMonitoring";

// The file must exist at:
// src/pages/ErrorMonitoring.jsx`,
    verification:
      "Confirm the application builds and the module resolution error disappears.",
  },

  // ====================================
  // 7. ROUTE NOT FOUND
  // ====================================
  {
    id: "route-not-found",
    title: "API Route Not Found",
    patterns: [
      /\\b404\\b/i,
      /cannot (get|post|put|patch|delete)\s+\//i,
      /route not found/i,
      /endpoint not found/i,
    ],
    category: "Routing Error",
    possibleCauses: [
      "The requested API endpoint may not exist.",
      "The HTTP method may be incorrect.",
      "The frontend may be calling the wrong backend URL.",
      "The Express router may not be registered.",
    ],
    steps: [
      "Verify the exact API URL in the frontend request.",
      "Check whether the HTTP method matches the Express route.",
      "Confirm that the router is registered in the main backend app.",
      "Check route prefixes such as /api/errors.",
      "Test the endpoint using Postman.",
    ],
    codeExample: `// routes/errorRoutes.js
router.get("/stats", (req, res) => {
  res.json({ success: true });
});

// Main server file
// app.use("/api/errors", errorRoutes);

// Full endpoint:
// GET /api/errors/stats`,
    verification:
      "Call the correct endpoint and confirm it returns the expected response.",
  },

  // ====================================
  // 8. AUTHENTICATION / JWT ERROR
  // ====================================
  {
    id: "authentication-error",
    title: "Authentication / Authorization Error",
    patterns: [
      /\\b401\\b/i,
      /\\b403\\b/i,
      /unauthorized/i,
      /jwt expired/i,
      /invalid token/i,
      /jwt malformed/i,
      /forbidden/i,
    ],
    category: "Authentication Error",
    possibleCauses: [
      "The JWT token may be missing, invalid or expired.",
      "The user may not have permission to access the resource.",
      "The frontend may not be sending the Authorization header.",
    ],
    steps: [
      "Verify that the user is logged in.",
      "Check whether the JWT is available in the expected storage location.",
      "Confirm that the request sends the Authorization header.",
      "Inspect backend authentication middleware.",
      "If the token expired, log in again.",
      "Verify the user's permissions for the requested resource.",
    ],
    codeExample: [
      'const token = localStorage.getItem("tracexToken");',
      "",
      "const headers = token",
      '  ? { Authorization: "Bearer " + token }',
      "  : {};",
      "",
      'fetch("http://localhost:5000/api/errors", {',
      "  headers,",
      "});",
    ].join("\\n"),
    verification:
      "Log in with a valid account and confirm the authorized request succeeds.",
  },

  // ====================================
  // 9. REACT INVALID HOOK CALL
  // ====================================
  {
    id: "react-hook-error",
    title: "React Invalid Hook Call",
    patterns: [
      /invalid hook call/i,
      /hooks can only be called inside/i,
      /rendered more hooks than during/i,
      /rendered fewer hooks than expected/i,
    ],
    category: "React Error",
    possibleCauses: [
      "A React Hook may be called outside a component or custom Hook.",
      "A Hook may be called conditionally.",
      "React dependencies may be incompatible or duplicated.",
    ],
    steps: [
      "Check where useState, useEffect or other Hooks are called.",
      "Move Hooks to the top level of React components or custom Hooks.",
      "Avoid calling Hooks inside conditions, loops or ordinary functions.",
      "Check React package versions if the error continues.",
      "Restart Vite and test the component.",
    ],
    codeExample: `import { useState } from "react";

function Dashboard() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}

export default Dashboard;`,
    verification:
      "Reload the component and confirm the Hook error no longer occurs.",
  },

  // ====================================
  // 10. NETWORK / FETCH ERROR
  // ====================================
  {
    id: "network-error",
    title: "API Network Connection Error",
    patterns: [
      /failed to fetch/i,
      /network error/i,
      /econnrefused/i,
      /net::err_connection_refused/i,
      /axioserror.*network/i,
    ],
    category: "Network / API Error",
    possibleCauses: [
      "The backend server may not be running.",
      "The frontend may be using the wrong API port.",
      "The network connection may be unavailable.",
    ],
    steps: [
      "Check whether the backend server is running.",
      "Verify the API URL and port.",
      "Test the endpoint directly in Postman.",
      "Inspect browser Network tab and backend logs.",
      "Check CORS configuration if the browser reports a CORS issue.",
      "Retry the request after correcting the connection problem.",
    ],
    codeExample: `const API_URL = "http://localhost:5000/api/errors";

async function loadErrors() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(
      "API returned status " + response.status
    );
  }

  return response.json();
}`,
    verification:
      "Confirm the frontend can successfully receive a response from the backend.",
  },

  // ====================================
  // 11. EXPRESS JSON BODY ERROR
  // ====================================
  {
    id: "express-body-error",
    title: "Express Request Body Is Undefined",
    patterns: [
      /req\\.body.*undefined/i,
      /cannot destructure property .* of .*req\\.body/i,
      /body-parser/i,
    ],
    category: "Express Middleware Error",
    possibleCauses: [
      "Express JSON middleware may not be enabled.",
      "The request may have an incorrect Content-Type header.",
      "The client may not be sending valid JSON.",
    ],
    steps: [
      "Confirm app.use(express.json()) is registered before API routes.",
      "Check that the client sends Content-Type: application/json.",
      "Verify the request body contains valid JSON.",
      "Retest the endpoint.",
    ],
    codeExample: `const express = require("express");

const app = express();

app.use(express.json());

// Register API routes after JSON middleware.`,
    verification:
      "Send a valid JSON request and confirm req.body contains the expected fields.",
  },

  // ====================================
  // 12. INTERNAL SERVER ERROR
  // ====================================
  {
    id: "internal-server-error",
    title: "Internal Server Error",
    patterns: [
      /\\b500\\b/i,
      /internal server error/i,
    ],
    category: "Backend Error",
    possibleCauses: [
      "An unexpected backend exception may have occurred.",
      "A database operation or controller may have failed.",
      "A required environment variable or service may be unavailable.",
    ],
    steps: [
      "Inspect backend logs around the error timestamp.",
      "Identify the failing API route and controller.",
      "Check database connectivity and dependent services.",
      "Review recent code changes.",
      "Reproduce the issue in the development environment.",
      "Fix the confirmed cause and retry the API request.",
    ],
    codeExample: `router.get("/example", async (req, res, next) => {
  try {
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});`,
    verification:
      "Repeat the failing request and confirm the API returns the expected successful response.",
  },
];

// ======================================
// SMART PATTERN MATCHING
// ======================================

function solveProblem(input) {
  const problem = String(input ?? "").trim();

  if (!problem) {
    return null;
  }

  // Find matching knowledge-base rule
  const match = solutions.find((item) =>
    item.patterns.some((pattern) => pattern.test(problem))
  );

  // No matching error found
  if (!match) {
    return {
      matched: false,
      ruleId: null,
      title: "More Information Required",
      category: "Unknown Error",
      possibleCauses: [],
      steps: [
        "Copy the exact error message.",
        "Identify the affected file, feature or API route.",
        "Check the browser console and backend terminal logs.",
        "Include the relevant technology, such as React, Express or MongoDB.",
        "Review the stack trace to locate the failing line.",
      ],
      codeExample: "",
      verification:
        "Retest the affected functionality after identifying and correcting the cause.",
      message:
        "No matching solution was found in the current knowledge base. Please provide the exact error message and relevant context.",
      analysisType: "rule-based",
      confidence: "unknown",
    };
  }

  // Return matched solution
  return {
    matched: true,
    ruleId: match.id,
    title: match.title,
    category: match.category,
    possibleCauses: match.possibleCauses,
    steps: match.steps,
    codeExample: match.codeExample,
    verification: match.verification,
    message:
      "This is a rule-based suggestion, not a confirmed diagnosis.",
    analysisType: "rule-based",
    confidence: "possible",
  };
}

module.exports = solveProblem;
