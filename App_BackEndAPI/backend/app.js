import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import config from "./config/config.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { initializeS3 } from "./utility/s3client.js";
import { initSockets } from "./sockets/index.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import chatRoutes from "./routes/chat.js";
import adminRoutes from "./routes/admin.js";
import postRoutes from "./routes/post.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";
import { startBackgroundJobs } from "./services/jobService.js";

const app = express();
const server = http.createServer(app);

app.set("trust proxy", 1);
app.use(helmet());
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.clientOrigins.includes(origin) || config.clientOrigins.includes("*")) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
}));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "hootpost-api" });
});

app.use((req, res, next) => {
  req.io = app.get("io");
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    try {
      await connectRedis();
    } catch (err) {
      logger.warn("Redis unavailable; continuing with memory fallback:", err.message);
    }
    await initializeS3();
    const io = await initSockets(server);
    app.set("io", io);
    startBackgroundJobs();
    server.listen(config.PORT, () => {
      logger.info(`Server running at http://localhost:${config.PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info("Shutting down...");
  server.close(async () => {
    try { await disconnectRedis(); } catch {}
    try { await disconnectDB(); } catch {}
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start();

export default app;
