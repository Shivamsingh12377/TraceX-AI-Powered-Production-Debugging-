
require("dotenv").config();

const http = require("http");

const app = require("./app");
const connectDB = require("./config/db");

const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const httpServer = http.createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
 origin: "https://tracex-ai-powered-production-debugging-2.onrender.com",
    methods: ["GET", "POST"],
  },
});

// Make io accessible inside Express routes
app.set("io", io);

// Socket connection
io.on("connection", (socket) => {
  console.log(
    "TraceX client connected:",
    socket.id
  );

  socket.on("disconnect", () => {
    console.log(
      "TraceX client disconnected:",
      socket.id
    );
  });
});

// Start server after MongoDB connects
async function startServer() {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(
        `TraceX server running on port ${PORT}`
      );

      console.log(
        "Socket.IO real-time monitoring enabled"
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exitCode = 1;
  }
}

startServer();
