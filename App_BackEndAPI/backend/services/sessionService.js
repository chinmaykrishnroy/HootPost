import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import config from "../config/config.js";
import { delCache, getCache, setCache } from "../config/redis.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_SECONDS = 5 * 60;

export const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: config.secureCookies,
  sameSite: config.secureCookies ? "none" : "lax",
  maxAge: config.sessionMaxAgeDays * DAY_MS,
  path: "/",
});

export const hashToken = (token) =>
  crypto.createHmac("sha256", config.sessionSecret).update(token).digest("hex");

export const generateSessionToken = () => crypto.randomBytes(32).toString("base64url");

export const getTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.[config.sessionCookieName] || req.cookies?.sessionId;
  if (cookieToken) return cookieToken;

  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return null;
};

const inferDeviceLabel = (userAgent = "") => {
  const ua = userAgent.toLowerCase();
  if (ua.includes("expo")) return "Expo app";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ios")) return "iPhone";
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari")) return "Safari";
  return "Unknown device";
};

export const publicSession = (session, currentSessionId = null) => ({
  sessionId: session.sessionId,
  deviceLabel: session.deviceLabel,
  userAgent: session.userAgent,
  ip: session.ip,
  createdAt: session.createdAt,
  lastUsedAt: session.lastUsedAt,
  revokedAt: session.revokedAt || null,
  current: session.sessionId === currentSessionId,
});

const pruneExpiredSessions = (user) => {
  const expiresBefore = Date.now() - config.sessionMaxAgeDays * DAY_MS;
  user.sessions = (user.sessions || []).filter((session) => {
    if (session.revokedAt) return false;
    const lastUsedAt = new Date(session.lastUsedAt || session.createdAt).getTime();
    return lastUsedAt >= expiresBefore;
  });
};

const enforceSessionCap = (user) => {
  const active = (user.sessions || []).filter((session) => !session.revokedAt);
  if (active.length <= config.maxActiveSessions) return;

  active.sort((a, b) => new Date(a.lastUsedAt) - new Date(b.lastUsedAt));
  const revokeCount = active.length - config.maxActiveSessions;
  const toRevoke = new Set(active.slice(0, revokeCount).map((session) => session.sessionId));
  user.sessions.forEach((session) => {
    if (toRevoke.has(session.sessionId)) session.revokedAt = new Date();
  });
};

export const createSession = async (user, req) => {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const sessionId = uuidv4();
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 512);
  const ip = String(req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || "");

  pruneExpiredSessions(user);
  user.sessions.push({
    sessionId,
    tokenHash,
    userAgent,
    ip,
    deviceLabel: inferDeviceLabel(userAgent),
    createdAt: new Date(),
    lastUsedAt: new Date(),
  });
  enforceSessionCap(user);
  user.lastLoginAt = new Date();
  await user.save();

  await setCache(`session:${tokenHash}`, {
    userId: user._id.toString(),
    sessionId,
    username: user.username,
  }, CACHE_TTL_SECONDS);

  return { token, session: publicSession(user.sessions.find((s) => s.sessionId === sessionId), sessionId) };
};

export const resolveSession = async (token) => {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const cached = await getCache(`session:${tokenHash}`);
  if (cached?.userId && cached?.sessionId) {
    const user = await User.findById(cached.userId).select("+sessions.tokenHash");
    const session = user?.sessions?.find((item) => item.sessionId === cached.sessionId && item.tokenHash === tokenHash);
    if (user && session && !session.revokedAt) {
      return { user, session, tokenHash };
    }
    await delCache(`session:${tokenHash}`);
  }

  const user = await User.findOne({ "sessions.tokenHash": tokenHash }).select("+sessions.tokenHash");
  if (!user) return null;
  const session = user.sessions.find((item) => item.tokenHash === tokenHash);
  if (!session || session.revokedAt) return null;

  const expiresBefore = Date.now() - config.sessionMaxAgeDays * DAY_MS;
  if (new Date(session.lastUsedAt || session.createdAt).getTime() < expiresBefore) {
    session.revokedAt = new Date();
    await user.save();
    return null;
  }

  session.lastUsedAt = new Date();
  await user.save();
  await setCache(`session:${tokenHash}`, {
    userId: user._id.toString(),
    sessionId: session.sessionId,
    username: user.username,
  }, CACHE_TTL_SECONDS);

  return { user, session, tokenHash };
};

export const revokeSession = async (user, sessionId, actorSessionId = null) => {
  const session = user.sessions.find((item) => item.sessionId === sessionId);
  if (!session) return null;
  session.revokedAt = new Date();
  await user.save();
  if (session.tokenHash) await delCache(`session:${session.tokenHash}`);
  return publicSession(session, actorSessionId);
};

export const revokeAllSessions = async (user, exceptSessionId = null) => {
  const revoked = [];
  for (const session of user.sessions || []) {
    if (exceptSessionId && session.sessionId === exceptSessionId) continue;
    if (!session.revokedAt) {
      session.revokedAt = new Date();
      revoked.push(publicSession(session, exceptSessionId));
      if (session.tokenHash) await delCache(`session:${session.tokenHash}`);
    }
  }
  await user.save();
  return revoked;
};
