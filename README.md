
# TraceX – AI-Powered Production Debugging

TraceX is a full-stack web application designed to help developers monitor application health, track errors, manage tasks, and simplify production debugging through an organized dashboard.

## 🚀 Features

- **Authentication:** User registration and login.
- **Dashboard:** View application activity and important metrics.
- **Error Monitoring:** Track and manage application errors.
- **API Health Monitoring:** Monitor API health and analytics.
- **Task Management:** Create, update, and manage development tasks.
- **Kanban Board:** Organize tasks using a visual workflow.
- **Calendar:** Manage and track scheduled tasks.
- **Reports & Analytics:** View application-related insights.
- **Real-Time Communication:** Socket.IO integration for real-time updates.
- **Responsive UI:** User-friendly React interface.

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Socket.IO Client

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- REST APIs

## 📁 Project Structure

```text
TraceX/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── services/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

*Note: The structure above is a general overview. Your actual folders may differ.*

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Shivamsingh12377/TraceX-AI-Powered-Production-Debugging-.git
```

### 2. Open the Project

```bash
cd TraceX-AI-Powered-Production-Debugging-
```

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

Add any other environment variables required by your backend configuration.

Start the backend:

```bash
npm run dev
```

### 4. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend folder:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

## 🌐 Environment Variables

### Backend

| Variable | Description |
|---|---|
| PORT | Backend server port |
| MONGO_URI | MongoDB connection string |

### Frontend

| Variable | Description |
|---|---|
| VITE_API_URL | Backend API base URL |
| VITE_SOCKET_URL | Socket.IO server URL |

For production deployment, configure the frontend environment variables with your deployed backend URL.

Never commit `.env` files or database credentials to GitHub.

## 🔗 Live Demo

- **Frontend:** Add your deployed frontend URL here.
- **Backend Health Check:** https://tracex-backend.onrender.com/api/health

## 📡 API

The backend exposes REST API endpoints for application functionality, including authentication, tasks, error monitoring, and analytics.

Refer to the backend routes for the exact endpoint paths and supported methods.

## 🔮 Future Improvements

- Advanced AI-powered error analysis.
- Automated debugging suggestions.
- Enhanced monitoring and reporting.
- More detailed application performance metrics.
- Improved real-time notifications.

## 👨‍💻 Author

**Shivam Singh**

- GitHub: [Shivamsingh12377](https://github.com/Shivamsingh12377)

---

⭐ If you find this project useful, consider giving it a star!
