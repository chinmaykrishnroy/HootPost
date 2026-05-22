import dotenv from "dotenv";

dotenv.config();

const csv = (value, fallback = []) =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : fallback;

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};

const boolFromEnv = (name, fallback = false) => {
  if (process.env[name] === undefined) return fallback;
  return ["true", "1", "yes"].includes(String(process.env[name]).toLowerCase());
};

const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: numberFromEnv("PORT", 5000),
  mongoURI:
    process.env.MONGO_URI ||
    "mongodb://hootpost:hootpost@localhost:27017/hootpost?authSource=admin",
  redisUrl: process.env.REDIS_URL || "",
  clientOrigins: csv(process.env.CLIENT_ORIGIN, ["http://localhost:8081", "http://localhost:19006"]),

  sessionCookieName: process.env.SESSION_COOKIE_NAME || "session_id",
  sessionMaxAgeDays: numberFromEnv("SESSION_MAX_AGE_DAYS", 30),
  maxActiveSessions: numberFromEnv("MAX_ACTIVE_SESSIONS", 10),
  sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "dev-only-change-me",

  secureCookies: process.env.NODE_ENV === "production",
  ADMIN: process.env.ADMIN_PASSWORD || "",

  s3: {
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    region: process.env.S3_REGION || "auto",
    bucket: process.env.S3_BUCKET_NAME || process.env.B2_BUCKET_NAME || "hootpost",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.B2_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.B2_APPLICATION_KEY || "",
    forcePathStyle: boolFromEnv("S3_FORCE_PATH_STYLE", true),
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || "",
  },

  maxImageUploadBytes: numberFromEnv("MAX_IMAGE_UPLOAD_MB", 8) * 1024 * 1024,
  maxAttachmentUploadBytes: numberFromEnv("MAX_ATTACHMENT_UPLOAD_MB", 32) * 1024 * 1024,
};

export default config;
