# TraceX – AI-Powered Production Debugging

TraceX is a full-stack web application for monitoring application errors and API performance, reviewing troubleshooting guidance, and managing development tasks. The current codebase includes an Express/Node.js backend, a React + Vite frontend, MongoDB persistence, and Socket.IO events for real-time updates.

> **Project status:** This README describes the functionality and structure present in the repository. Some modules are still being developed; verify each feature in the running application before presenting it as production-ready.

## Key Features

### Error Monitoring and Troubleshooting
- Store and review application error logs.
- View error statistics, including total, critical, resolved, and unresolved errors.
- View error analytics with severity distribution, resolution status, and daily trends (7, 30, or 90 days).
- Generate rule-based troubleshooting guidance for supported error patterns, including possible causes, suggested steps, and verification checks.
- Keep a solution history model for tracking troubleshooting activity.

### API Health and Performance Monitoring
- Automatically record API request method, route, HTTP status code, and response time.
- Store API metrics in MongoDB.
- Calculate request totals, successful and failed requests, success/failure rates, and response-time statistics.
- View endpoint-level performance and daily trends for supported periods (1, 7, or 30 days).

### Real-Time Events
- Socket.IO is configured on the backend and Socket.IO Client is used by the frontend.
- Emit API metric updates when a metric is saved.
- Emit task-created and task-updated events to connected clients.
- Reconnect automatically from the frontend socket client.

### Authentication and Task Management
- Authentication routes and middleware are included.
- Task APIs support creating, listing, retrieving, and updating tasks.
- Task activity is recorded for task operations.
- Task records include fields such as title, description, priority, status, due date, category, and labels.

### Frontend Dashboard and Workspace
The frontend source includes pages and components for:
- Dashboard
- Error monitoring and error details
- API health
- Reports and analytics
- Tasks and Kanban board
- Projects and project details
- Calendar
- Settings
- Authentication, navigation, and protected routes

## Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Routing | React Router |
| API communication | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Real-time communication | Socket.IO, Socket.IO Client |
| Authentication | JSON Web Token (JWT), bcryptjs |
| Security and middleware | Helmet, CORS, express-rate-limit |
| Charts and reports | Recharts |
| PDF reports | jsPDF, jsPDF-AutoTable |

## Project Structure

```text
TraceX/
├── backend/
│   ├── config/          # Database and service configuration
│   ├── controllers/     # Request/controller logic
│   ├── middleware/      # Authentication, API monitoring and error handling
│   ├── models/          # Mongoose models
│   ├── routes/          # API route definitions
│   ├── services/        # Error analysis, problem solving and other services
│   ├── utils/           # Shared utilities
│   ├── app.js           # Express application and route registration
│   ├── server.js        # HTTP server, MongoDB startup and Socket.IO
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # React context
│   │   ├── pages/       # Application pages
│   │   ├── services/    # API service functions
│   │   ├── styles/      # Page/component styles
│   │   └── utils/       # Frontend utilities
│   ├── index.html
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js and npm
- MongoDB database (local MongoDB or MongoDB Atlas)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Shivamsingh12377/TraceX-AI-Powered-Production-Debugging-.git
cd TraceX-AI-Powered-Production-Debugging-
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend environment variables

Create a `.env` file inside the `backend` directory. You can use `.env.example` as a template.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Update the values in `backend/.env` with your own MongoDB connection details. The example file contains:
- `MONGO_URI` – MongoDB connection string
- `DNS_SERVERS` – DNS resolver addresses used by the project configuration

Never commit your real `.env` file or share database credentials publicly.

### 4. Start the backend

From the `backend` directory:

```bash
npm run dev
```

The backend uses port `5000` by default. The root API endpoint is `http://localhost:5000/` and the health endpoint is `http://localhost:5000/api/health`.

### 5. Install frontend dependencies

Open a second terminal:

```bash
cd frontend
npm install
```

### 6. Start the frontend

From the `frontend` directory:

```bash
npm run dev
```

Vite will print the local frontend URL in the terminal (commonly `http://localhost:5173`).

## Main API Endpoints

The following routes are registered in the current Express application:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend welcome/status response |
| GET | `/api/health` | Server and database health check |
| `/api/auth` | Authentication routes | Authentication operations |
| `/api/tasks` | Task routes | Task management |
| `/api/activities` | Activity routes | Task activity history |
| GET | `/api/errors` | Error log routes |
| GET | `/api/errors/stats` | Error statistics |
| GET | `/api/errors/analytics?days=30` | Error analytics |
| GET | `/api/api-health/analytics?days=7` | API performance analytics |

The API health analytics endpoint supports `days=1`, `days=7`, and `days=30`. Error analytics supports `days=7`, `days=30`, and `days=90`.

## Security Notes

- Keep secrets and credentials in environment variables.
- Do not commit `.env` files, database passwords, JWT secrets, or API keys.
- The repository's `.gitignore` excludes `node_modules`, environment files, and build output.
- Use trusted origins and secure database network-access rules when deploying.

## Current Development Notes

- The backend currently connects to MongoDB before starting the HTTP server.
- Socket.IO is attached to the HTTP server for real-time application events.
- Rule-based error troubleshooting is implemented separately from external AI services and can provide guidance without requiring an AI API key.
- Configure and test all environment values and integrations locally before deployment.

## Future Improvements

- Add automated backend and frontend tests.
- Add deployment configuration and production environment documentation.
- Expand error patterns and troubleshooting knowledge.
- Add role-based access control and audit coverage where required.
- Improve monitoring dashboards and operational alerts.

## Author

**Shivam Singh**

GitHub: [@Shivamsingh12377](https://github.com/Shivamsingh12377)

---

If you find an issue or want to suggest an improvement, feel free to open a GitHub issue.
