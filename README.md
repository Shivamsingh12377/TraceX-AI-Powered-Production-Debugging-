<<<<<<< HEAD
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
=======

# TraceX – AI-Powered Production Debugging

TraceX is a full-stack web application designed to monitor application errors, track API performance, provide troubleshooting guidance, and manage development tasks.

The project uses a React + Vite frontend, Node.js + Express backend, MongoDB database, and Socket.IO for real-time communication.

> **Project Status:** This README describes the functionality and structure currently present in the repository. Some modules are still under development. Verify each feature in the running application before presenting it as production-ready.

---

## 🚀 Key Features

### 1. Error Monitoring & Troubleshooting
- Store and review application error logs.
- View error statistics:
  - Total errors
  - Critical errors
  - Resolved errors
  - Unresolved errors
- Analyze error trends over 7, 30, or 90 days.
- View severity distribution and resolution status.
- Generate rule-based troubleshooting guidance.
- Display possible causes, suggested solutions, and verification steps.
- Maintain troubleshooting solution history.

### 2. API Health & Performance Monitoring
- Automatically monitor API requests.
- Record HTTP methods, routes, status codes, and response times.
- Store API performance metrics in MongoDB.
- Calculate:
  - Total API requests
  - Successful requests
  - Failed requests
  - Success and failure rates
  - Response-time statistics
- View endpoint-level performance.
- Analyze daily API trends for 1, 7, or 30 days.

### 3. Real-Time Monitoring
- Socket.IO integration for real-time communication.
- Emit API metric updates when metrics are saved.
- Receive task-created and task-updated events.
- Automatic reconnection through the frontend socket client.

### 4. Authentication & Task Management
- Authentication routes and middleware.
- Create, view, retrieve, and update tasks.
- Maintain task activity history.
- Task information includes:
  - Title and description
  - Priority and status
  - Due date
  - Category and labels

### 5. Frontend Dashboard & Workspace

The frontend includes the following pages and modules:

- Dashboard
- Error Monitoring
- Error Details
- API Health
- Reports & Analytics
- Task Management
- Kanban Board
- Projects & Project Details
- Calendar
- Settings
- Authentication
- Navigation and Protected Routes

---

## 🛠️ Tech Stack
>>>>>>> c9e182e (Update professional README)

| Area | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Routing | React Router |
<<<<<<< HEAD
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
=======
| API Communication | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Real-Time Communication | Socket.IO, Socket.IO Client |
| Authentication | JWT, bcryptjs |
| Security | Helmet, CORS, express-rate-limit |
| Charts & Analytics | Recharts |
| PDF Reports | jsPDF, jsPDF-AutoTable |

---

## 📁 Project Structure

```text
TraceX/
│
├── backend/
│   ├── config/           # Database and service configuration
│   ├── controllers/      # Request and controller logic
│   ├── middleware/      # Authentication and monitoring middleware
│   ├── models/          # Mongoose database models
│   ├── routes/          # API route definitions
│   ├── services/        # Error analysis and troubleshooting services
│   ├── utils/           # Shared utilities
│   ├── app.js           # Express application configuration
│   ├── server.js        # HTTP server, MongoDB and Socket.IO
>>>>>>> c9e182e (Update professional README)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # React context
│   │   ├── pages/       # Application pages
│   │   ├── services/    # API service functions
<<<<<<< HEAD
│   │   ├── styles/      # Page/component styles
=======
│   │   ├── styles/      # CSS and styling
>>>>>>> c9e182e (Update professional README)
│   │   └── utils/       # Frontend utilities
│   ├── index.html
│   └── package.json
│
<<<<<<< HEAD
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
=======
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

Follow these steps to run TraceX locally.

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/)
- npm (comes with Node.js)
- [MongoDB](https://www.mongodb.com/) or MongoDB Atlas
- [Git](https://git-scm.com/)
- Visual Studio Code (recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/Shivamsingh12377/TraceX-AI-Powered-Production-Debugging-.git
```

Move into the project directory:

```bash
cd TraceX-AI-Powered-Production-Debugging-
```

### 2. Install Backend Dependencies
>>>>>>> c9e182e (Update professional README)

```bash
cd backend
npm install
```

<<<<<<< HEAD
### 3. Configure backend environment variables

Create a `.env` file inside the `backend` directory. You can use `.env.example` as a template.

PowerShell:
=======
### 3. Configure Environment Variables

Create a `.env` file inside the `backend` folder.

Using PowerShell:
>>>>>>> c9e182e (Update professional README)

```powershell
Copy-Item .env.example .env
```

<<<<<<< HEAD
Update the values in `backend/.env` with your own MongoDB connection details. The example file contains:
- `MONGO_URI` – MongoDB connection string
- `DNS_SERVERS` – DNS resolver addresses used by the project configuration

Never commit your real `.env` file or share database credentials publicly.

### 4. Start the backend

From the `backend` directory:
=======
Update the values in `backend/.env` according to your environment.

The example environment file includes:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `DNS_SERVERS` | DNS resolver addresses used by project configuration |

> **Security:** Never commit your actual `.env` file, database credentials, JWT secrets, or API keys to GitHub.

### 4. Start the Backend

From the `backend` directory, run:
>>>>>>> c9e182e (Update professional README)

```bash
npm run dev
```

<<<<<<< HEAD
The backend uses port `5000` by default. The root API endpoint is `http://localhost:5000/` and the health endpoint is `http://localhost:5000/api/health`.

### 5. Install frontend dependencies

Open a second terminal:
=======
The backend uses port `5000` by default.

- Base URL: `http://localhost:5000/`
- Health Check: `http://localhost:5000/api/health`

### 5. Install Frontend Dependencies

Open a second terminal in VS Code:
>>>>>>> c9e182e (Update professional README)

```bash
cd frontend
npm install
```

<<<<<<< HEAD
### 6. Start the frontend

From the `frontend` directory:
=======
### 6. Start the Frontend
>>>>>>> c9e182e (Update professional README)

```bash
npm run dev
```

<<<<<<< HEAD
Vite will print the local frontend URL in the terminal (commonly `http://localhost:5173`).

## Main API Endpoints

The following routes are registered in the current Express application:
=======
Vite will display the frontend URL in the terminal. It is commonly:

```text
http://localhost:5173
```

---

## 🔗 Main API Endpoints

The following endpoints are registered in the current Express application.
>>>>>>> c9e182e (Update professional README)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend welcome/status response |
| GET | `/api/health` | Server and database health check |
<<<<<<< HEAD
| `/api/auth` | Authentication routes | Authentication operations |
| `/api/tasks` | Task routes | Task management |
| `/api/activities` | Activity routes | Task activity history |
| GET | `/api/errors` | Error log routes |
=======
| API | `/api/auth` | Authentication operations |
| API | `/api/tasks` | Task management |
| API | `/api/activities` | Task activity history |
| GET | `/api/errors` | Error log operations |
>>>>>>> c9e182e (Update professional README)
| GET | `/api/errors/stats` | Error statistics |
| GET | `/api/errors/analytics?days=30` | Error analytics |
| GET | `/api/api-health/analytics?days=7` | API performance analytics |

<<<<<<< HEAD
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
=======
**Supported analytics periods:**

- Error analytics: 7, 30, and 90 days.
- API health analytics: 1, 7, and 30 days.

---

## 🔐 Security Notes

- Store secrets and credentials in environment variables.
- Never upload `.env` files or database passwords.
- Keep JWT secrets and API keys private.
- The `.gitignore` file excludes `node_modules`, environment files, and build output.
- Use trusted origins and secure database network-access rules when deploying.

---

## 🔧 Current Development Notes

- The backend connects to MongoDB before starting the HTTP server.
- Socket.IO is attached to the HTTP server for real-time application events.
- Rule-based error troubleshooting works independently of external AI services.
- Troubleshooting guidance does not require an external AI API key.
- Configure and test all environment values and integrations before deployment.

---

## 🔮 Future Improvements
>>>>>>> c9e182e (Update professional README)

- Add automated backend and frontend tests.
- Add deployment configuration and production environment documentation.
- Expand error patterns and troubleshooting knowledge.
- Implement role-based access control.
- Improve audit logging and monitoring coverage.
- Add advanced operational alerts and analytics.

---

## 👨‍💻 Author

**Shivam Singh**

- GitHub: [@Shivamsingh12377](https://github.com/Shivamsingh12377)
- Project Repository: [TraceX – AI-Powered Production Debugging](https://github.com/Shivamsingh12377/TraceX-AI-Powered-Production-Debugging-)

---

## 🤝 Contributing

Suggestions, bug reports, and improvements are welcome.

If you find an issue or want to suggest a feature, feel free to open a GitHub Issue.

---

**Built with React, Node.js, Express, MongoDB, and Socket.IO.**
