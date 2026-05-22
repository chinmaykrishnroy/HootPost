import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import config from "../config/config.js";
import { getRedisClient, isRedisConnected } from "../config/redis.js";
import { resolveSession } from "../services/sessionService.js";
import Chat from "../models/Chat.js";
import logger from "../utils/logger.js";

let ioInstance = null;

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((cookies, pair) => {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) return cookies;
    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});

const socketAuth = async (socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const token =
      socket.handshake.auth?.token ||
      cookies[config.sessionCookieName] ||
      cookies.sessionId;

    const resolved = await resolveSession(token);
    if (!resolved?.user) return next(new Error("Authentication required"));

    socket.userId = resolved.user._id.toString();
    socket.username = resolved.user.username;
    socket.sessionId = resolved.session.sessionId;

    socket.join(`user:${socket.userId}`);
    socket.join(`session:${socket.sessionId}`);
    next();
  } catch (err) {
    next(err);
  }
};

export const initSockets = async (server) => {
  if (ioInstance) return ioInstance;

  const io = new Server(server, {
    cors: {
      origin: config.clientOrigins,
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 60_000,
  });

  if (isRedisConnected()) {
    const redisClient = getRedisClient();
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("Socket.IO Redis adapter enabled");
  }

  const realtime = io.of("/realtime");
  realtime.use(socketAuth);
  realtime.on("connection", (socket) => {
    socket.emit("connected", {
      userId: socket.userId,
      username: socket.username,
      sessionId: socket.sessionId,
    });

    socket.on("chat:join", async ({ chatId } = {}, ack) => {
      const chat = await Chat.findOne({ _id: chatId, participants: socket.userId }).lean();
      if (!chat) {
        ack?.({ ok: false, error: "Chat not found" });
        return;
      }
      socket.join(`chat:${chatId}`);
      ack?.({ ok: true });
    });

    socket.on("chat:leave", ({ chatId } = {}, ack) => {
      if (chatId) socket.leave(`chat:${chatId}`);
      ack?.({ ok: true });
    });

    socket.on("typing:start", ({ chatId } = {}) => {
      if (chatId) socket.to(`chat:${chatId}`).emit("typing:start", { chatId, userId: socket.userId });
    });

    socket.on("typing:stop", ({ chatId } = {}) => {
      if (chatId) socket.to(`chat:${chatId}`).emit("typing:stop", { chatId, userId: socket.userId });
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => ioInstance;
