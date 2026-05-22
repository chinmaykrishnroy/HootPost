import { createClient } from "redis";
import config from "./config.js";
import logger from "../utils/logger.js";

let redisClient = null;
let connected = false;
const memoryStore = new Map();

const cleanupMemoryStore = () => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) memoryStore.delete(key);
  }
};

setInterval(cleanupMemoryStore, 60_000).unref?.();

export const connectRedis = async () => {
  if (!config.redisUrl) {
    logger.info("Redis URL missing; using in-memory cache fallback");
    return null;
  }

  redisClient = createClient({ url: config.redisUrl });
  redisClient.on("error", (err) => {
    connected = false;
    logger.warn("Redis error:", err.message);
  });

  await redisClient.connect();
  connected = true;
  logger.info("Redis connected");
  return redisClient;
};

export const disconnectRedis = async () => {
  if (redisClient && connected) await redisClient.quit();
  connected = false;
};

export const isRedisConnected = () => connected && Boolean(redisClient);

export const getRedisClient = () => redisClient;

export const setCache = async (key, value, ttlSeconds = 300) => {
  if (isRedisConnected()) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return;
  }

  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export const getCache = async (key) => {
  if (isRedisConnected()) {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

export const delCache = async (key) => {
  if (isRedisConnected()) {
    await redisClient.del(key);
    return;
  }
  memoryStore.delete(key);
};
