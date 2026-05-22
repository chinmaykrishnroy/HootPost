import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { badRequest, notFound } from "../utils/errors.js";
import { deleteUserAccount } from "../services/accountCleanupService.js";
import { deleteAllObjects, deleteObjects } from "../services/storageService.js";

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -sessions.tokenHash").lean();
  res.status(200).json(users);
});

export const deleteAllUsers = asyncHandler(async (req, res) => {
  await Promise.all([
    deleteAllObjects(),
    User.deleteMany({}),
    Post.deleteMany({}),
    Chat.deleteMany({}),
    Message.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  res.status(200).json({ success: "All users, posts, chats, messages, and media deleted." });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const username = String(req.body.username || "").trim().toLowerCase();
  if (!username) throw badRequest("Username is required.");

  const user = await User.findOne({ username });
  if (!user) throw notFound("User not found.");

  const result = await deleteUserAccount(user);
  res.status(200).json({ success: "User and related data deleted.", ...result });
});

export const deleteLargeBuffers = asyncHandler(async (req, res) => {
  const sizeLimitMB = Number(req.body.sizeLimitMB || 1);
  if (!Number.isFinite(sizeLimitMB) || sizeLimitMB <= 0) {
    throw badRequest("sizeLimitMB must be a positive number.");
  }

  const sizeLimit = sizeLimitMB * 1024 * 1024;
  const users = await User.find({ profilePictureSmall: { $exists: true } })
    .select("profilePictureSmall");
  const userIds = users
    .filter((user) => (user.profilePictureSmall?.length || 0) > sizeLimit)
    .map((user) => user._id);

  if (userIds.length > 0) {
    await User.updateMany({ _id: { $in: userIds } }, { $unset: { profilePictureSmall: "" } });
  }

  res.status(200).json({ success: "Large legacy profile buffers deleted.", deletedCount: userIds.length });
});

export const deleteAllPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find({ image: { $exists: true } }).select("image imageKey").lean();
  await Promise.all([
    deleteObjects(posts.map((post) => post.imageKey || post.image)),
    Post.deleteMany({}),
    User.updateMany({}, { $set: { posts: [] } }),
  ]);
  res.status(200).json({ success: "All posts deleted.", deletedCount: posts.length });
});
