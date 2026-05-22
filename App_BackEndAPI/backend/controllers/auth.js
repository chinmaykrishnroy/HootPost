import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import config from "../config/config.js";
import asyncHandler from "../utils/asyncHandler.js";
import { badRequest, unauthorized } from "../utils/errors.js";
import { normalizeEmail, normalizeUsername } from "../utils/sanitize.js";
import { deleteUserAccount } from "../services/accountCleanupService.js";
import {
  createSession,
  publicSession,
  revokeAllSessions,
  revokeSession,
  sessionCookieOptions,
} from "../services/sessionService.js";

const emitSessionRevoked = (req, userId, sessionId) => {
  req.io?.of("/realtime")?.to(`session:${sessionId}`).emit("session:revoked", { sessionId });
  req.io?.of("/realtime")?.to(`session:${sessionId}`).disconnectSockets(true);
  req.io?.of("/realtime")?.to(`user:${userId}`).emit("sessions:changed", { userId });
};

export const registerUser = asyncHandler(async (req, res) => {
  const validation = validationResult(req);
  if (!validation.isEmpty()) throw badRequest("Validation failed", validation.array());

  const { username, email, password, firstName, lastName, age, sex, bio } = req.body;
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await User.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  }).lean();

  if (existingUser?.username === normalizedUsername) {
    return res.status(400).json({ error: "Username already exists!" });
  }
  if (existingUser?.email === normalizedEmail) {
    return res.status(400).json({ email_error: "Email already exists!" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
    firstName,
    lastName,
    age,
    sex,
    bio,
    roles: ["user"],
  });

  res.status(201).json({
    success: "Registration successful!",
    userId: newUser._id,
    username: newUser.username,
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) throw badRequest("Username/email and password are required.");

  const normalizedIdentifier = String(identifier).trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
  }).select("+sessions.tokenHash");

  if (!user) return res.status(400).json({ error: "User not found!" });
  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) return res.status(401).json({ error: "Wrong Password!" });

  const { token, session } = await createSession(user, req);
  res.cookie(config.sessionCookieName, token, sessionCookieOptions());
  req.io?.of("/realtime")?.to(`user:${user._id}`).emit("sessions:changed", { userId: user._id });

  res.status(200).json({
    success: "Log in successful!",
    userId: user._id,
    username: user.username,
    session,
    token,
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  const user = req.currentUser;
  const sessionId = req.session?.sessionId;
  if (!user || !sessionId) throw unauthorized("No active session.");

  await revokeSession(user, sessionId, sessionId);
  res.clearCookie(config.sessionCookieName, { path: "/" });
  emitSessionRevoked(req, user._id, sessionId);
  res.status(200).json({ success: "Log out successful!" });
});

export const currentSession = asyncHandler(async (req, res) => {
  if (!req.currentUser) throw unauthorized("No active session.");
  res.status(200).json({
    user_id: req.currentUser._id,
    userId: req.currentUser._id,
    username: req.currentUser.username,
    session: publicSession(req.session, req.session?.sessionId),
  });
});

export const listSessions = asyncHandler(async (req, res) => {
  const currentSessionId = req.session?.sessionId;
  const sessions = (req.currentUser.sessions || [])
    .map((session) => publicSession(session, currentSessionId))
    .sort((a, b) => new Date(b.lastUsedAt || b.createdAt) - new Date(a.lastUsedAt || a.createdAt));

  res.status(200).json({ sessions });
});

export const revokeSelectedSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) throw badRequest("Session id is required.");
  if (sessionId === req.session?.sessionId) {
    throw badRequest("Use /auth/logout to revoke the current session.");
  }

  const revoked = await revokeSession(req.currentUser, sessionId, req.session?.sessionId);
  if (!revoked) return res.status(404).json({ error: "Session not found." });
  emitSessionRevoked(req, req.currentUser._id, sessionId);
  res.status(200).json({ success: "Session revoked.", session: revoked });
});

export const revokeOtherSessions = asyncHandler(async (req, res) => {
  const currentSessionId = req.session?.sessionId;
  const revoked = await revokeAllSessions(req.currentUser, currentSessionId);
  for (const session of revoked) emitSessionRevoked(req, req.currentUser._id, session.sessionId);
  res.status(200).json({ success: "Other sessions revoked.", revoked });
});

export const revokeAllUserSessions = asyncHandler(async (req, res) => {
  const revoked = await revokeAllSessions(req.currentUser);
  for (const session of revoked) emitSessionRevoked(req, req.currentUser._id, session.sessionId);
  res.clearCookie(config.sessionCookieName, { path: "/" });
  res.status(200).json({ success: "All sessions revoked.", revoked });
});

export const deleteUserSelf = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) throw badRequest("Password is required.");

  const user = req.currentUser;
  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) return res.status(400).json({ error: "Invalid Password!" });

  await deleteUserAccount(user);

  res.clearCookie(config.sessionCookieName, { path: "/" });
  res.status(200).json({ success: "User deleted successfully!" });
});

export const isUsernameValid = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const existingUser = await User.exists({ username });
  return existingUser ? res.status(400).send() : res.status(200).send();
});

export const isEmailValid = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const existingEmail = await User.exists({ email });
  return existingEmail ? res.status(400).send() : res.status(200).send();
});
