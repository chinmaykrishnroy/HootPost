import mongoose from "mongoose";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { escapeRegExp, normalizeUsername } from "../utils/sanitize.js";
import { includesId, idsEqual } from "../utils/objectId.js";
import { deleteMedia, processProfileImage, signMediaUrl, uploadImage } from "../services/mediaService.js";
import {
  createNotification,
  emitNotification,
  listNotifications,
  markNotificationsRead,
  serializeNotification,
} from "../services/notificationService.js";
import { assertVisibleUser, formatPublicUser, relationFlags } from "../services/userRelationService.js";
import { loadUserPostTiles } from "../services/postService.js";
import { parsePagination } from "../utils/pagination.js";

const userPublicSelect = "username email firstName lastName age sex bio profilePicture profilePictureThumb blockedUsers connections connectionRequests posts createdAt";

const findUserByUsername = async (username) =>
  User.findOne({ username: normalizeUsername(username) }).select(userPublicSelect);

const requireUserByUsername = async (username) => {
  const user = await findUserByUsername(username);
  if (!user) throw notFound("User not found.");
  return user;
};

const ensureVisible = (currentUser, targetUser) => {
  if (!assertVisibleUser(currentUser, targetUser)) throw forbidden("Access denied.");
};

const profileUrlFor = (user, expiresIn = 300) =>
  signMediaUrl(user?.profilePictureThumb || user?.profilePicture, expiresIn);

const serializeUser = async (user, currentUser, options = {}) => {
  const profilePicture = await profileUrlFor(user, options.expiresIn);
  return formatPublicUser(user, currentUser, {
    includePrivate: options.includePrivate,
    profileUrl: profilePicture,
  });
};

const visibleUsers = (users, currentUser) =>
  users.filter((user) => !idsEqual(user._id, currentUser._id) && assertVisibleUser(currentUser, user));

export const seachUser = asyncHandler(async (req, res) => {
  const term = String(req.query.usr || "").trim();
  if (!term) throw badRequest("Search term is required.");

  const normalized = normalizeUsername(term);
  const regex = new RegExp(escapeRegExp(term), "i");
  const users = await User.find({
    $or: [
      { username: normalized },
      { email: normalized },
      { firstName: regex },
      { lastName: regex },
    ],
  }).select(userPublicSelect);

  const response = await Promise.all(
    visibleUsers(users, req.currentUser).map((user) => serializeUser(user, req.currentUser))
  );
  if (response.length === 0) throw notFound("No users found.");
  res.status(200).json(response);
});

export const getAllUserSelf = asyncHandler(async (req, res) => {
  const users = await User.find().select(userPublicSelect);
  const response = await Promise.all(
    visibleUsers(users, req.currentUser).map((user) => serializeUser(user, req.currentUser))
  );
  res.status(200).json(response);
});

export const uploadProfilePicture = asyncHandler(async (req, res) => {
  if (req.file) {
    req.file.crop = {
      x: req.body.crop?.x ?? req.body["crop[x]"],
      y: req.body.crop?.y ?? req.body["crop[y]"],
      scale: req.body.crop?.scale ?? req.body["crop[scale]"],
      displaySize: req.body.crop?.displaySize ?? req.body["crop[displaySize]"],
      sourceWidth: req.body.crop?.sourceWidth ?? req.body["crop[sourceWidth]"],
      sourceHeight: req.body.crop?.sourceHeight ?? req.body["crop[sourceHeight]"],
    };
  }
  const { large, small, thumbContentType, thumbExtension } = await processProfileImage(req.file);
  const [profilePicture, profilePictureThumb] = await Promise.all([
    uploadImage({
      file: req.file,
      buffer: large,
      keyPrefix: "profiles",
      ownerId: req.currentUser._id,
    }),
    uploadImage({
      file: req.file,
      buffer: small,
      keyPrefix: "profiles/thumbs",
      ownerId: req.currentUser._id,
      contentType: thumbContentType,
      extension: thumbExtension,
    }),
  ]);

  await Promise.all([
    deleteMedia(req.currentUser.profilePicture),
    deleteMedia(req.currentUser.profilePictureThumb),
  ]);

  req.currentUser.profilePicture = profilePicture;
  req.currentUser.profilePictureThumb = profilePictureThumb;
  req.currentUser.profilePictureSmall = undefined;
  await req.currentUser.save();
  res.status(200).json({
    success: "Profile picture updated successfully.",
    profilePicture: await signMediaUrl(profilePicture, 300),
    profilePictureThumb: await signMediaUrl(profilePictureThumb, 300),
  });
});

export const deleteProfilePicture = asyncHandler(async (req, res) => {
  await Promise.all([
    deleteMedia(req.currentUser.profilePicture),
    deleteMedia(req.currentUser.profilePictureThumb),
  ]);
  req.currentUser.profilePicture = undefined;
  req.currentUser.profilePictureThumb = undefined;
  req.currentUser.profilePictureSmall = undefined;
  await req.currentUser.save();
  res.status(200).json({ success: "Profile picture deleted successfully." });
});

export const getProfilePicture = asyncHandler(async (req, res) => {
  const user = await requireUserByUsername(req.params.username);
  ensureVisible(req.currentUser, user);
  if (!user.profilePicture) return res.status(204).send();
  res.status(200).json({ profilePicture: await signMediaUrl(user.profilePicture, 300) });
});

export const sendRequest = asyncHandler(async (req, res) => {
  const targetUser = await requireUserByUsername(req.params.username);
  if (idsEqual(targetUser._id, req.currentUser._id)) throw badRequest("You cannot connect with yourself.");
  ensureVisible(req.currentUser, targetUser);
  if (includesId(targetUser.connections, req.currentUser._id)) throw badRequest("Already connected.");
  if (includesId(targetUser.connectionRequests, req.currentUser._id)) {
    throw badRequest("Connection request already sent.");
  }

  targetUser.connectionRequests.addToSet(req.currentUser._id);
  await targetUser.save();
  const notification = await createNotification({
    recipient: targetUser._id,
    actor: req.currentUser._id,
    type: "connection_request",
    entityType: "User",
    entityId: req.currentUser._id,
    message: `${req.currentUser.username} sent you a connection request.`,
  });
  emitNotification(req.io, notification);
  res.status(200).json({ success: "Connection request sent." });
});

export const acceptRequest = asyncHandler(async (req, res) => {
  const requesterUser = await requireUserByUsername(req.params.username);
  if (!includesId(req.currentUser.connectionRequests, requesterUser._id)) {
    throw badRequest("No connection request from this user.");
  }

  req.currentUser.connectionRequests.pull(requesterUser._id);
  req.currentUser.connections.addToSet(requesterUser._id);
  requesterUser.connections.addToSet(req.currentUser._id);
  requesterUser.connectionRequests.pull(req.currentUser._id);
  await Promise.all([req.currentUser.save(), requesterUser.save()]);
  await markNotificationsRead({
    recipient: req.currentUser._id,
    actor: requesterUser._id,
    type: "connection_request",
  });
  const notification = await createNotification({
    recipient: requesterUser._id,
    actor: req.currentUser._id,
    type: "connection_accepted",
    entityType: "User",
    entityId: req.currentUser._id,
    message: `${req.currentUser.username} accepted your connection request.`,
  });
  emitNotification(req.io, notification);
  res.status(200).json({ success: "Connection accepted." });
});

export const viewRequests = asyncHandler(async (req, res) => {
  const user = await User.findById(req.currentUser._id)
    .populate("connectionRequests", "username firstName lastName profilePicture profilePictureThumb");
  if (!user) throw notFound("User not found.");
  const response = await Promise.all(user.connectionRequests.map((request) => serializeUser(request, req.currentUser)));
  res.status(200).json(response);
});

export const viewConnections = asyncHandler(async (req, res) => {
  const user = await User.findById(req.currentUser._id)
    .populate("connections", "username firstName lastName profilePicture profilePictureThumb");
  if (!user) throw notFound("User not found.");
  const response = await Promise.all(user.connections.map((connection) => serializeUser(connection, req.currentUser)));
  res.status(200).json(response);
});

export const unsendRequest = asyncHandler(async (req, res) => {
  const targetUser = await requireUserByUsername(req.params.username);
  if (idsEqual(targetUser._id, req.currentUser._id)) throw badRequest("Bad request.");
  if (!includesId(targetUser.connectionRequests, req.currentUser._id)) {
    throw badRequest("No connection request to unsend.");
  }

  targetUser.connectionRequests.pull(req.currentUser._id);
  await targetUser.save();
  res.status(200).json({ success: "Connection request unsent." });
});

export const deleteRequest = asyncHandler(async (req, res) => {
  const requesterUser = await requireUserByUsername(req.params.username);
  if (idsEqual(requesterUser._id, req.currentUser._id)) throw badRequest("Bad request.");
  if (!includesId(req.currentUser.connectionRequests, requesterUser._id)) {
    throw badRequest("No connection request from this user.");
  }

  req.currentUser.connectionRequests.pull(requesterUser._id);
  await req.currentUser.save();
  await markNotificationsRead({
    recipient: req.currentUser._id,
    actor: requesterUser._id,
    type: "connection_request",
  });
  res.status(200).json({ success: "Connection request deleted." });
});

export const removeConnection = asyncHandler(async (req, res) => {
  const connectedUser = await requireUserByUsername(req.params.username);
  if (!includesId(req.currentUser.connections, connectedUser._id)) {
    throw badRequest("No connection exists with this user.");
  }

  req.currentUser.connections.pull(connectedUser._id);
  connectedUser.connections.pull(req.currentUser._id);
  await Promise.all([req.currentUser.save(), connectedUser.save()]);
  res.status(200).json({ success: "Connection removed." });
});

export const blockUser = asyncHandler(async (req, res) => {
  const userToBlock = await requireUserByUsername(req.params.username);
  if (idsEqual(req.currentUser._id, userToBlock._id)) throw badRequest("You cannot block yourself.");
  if (includesId(req.currentUser.blockedUsers, userToBlock._id)) throw badRequest("User already blocked.");

  req.currentUser.blockedUsers.addToSet(userToBlock._id);
  req.currentUser.connections.pull(userToBlock._id);
  req.currentUser.connectionRequests.pull(userToBlock._id);
  userToBlock.connections.pull(req.currentUser._id);
  userToBlock.connectionRequests.pull(req.currentUser._id);
  await Promise.all([req.currentUser.save(), userToBlock.save()]);
  res.status(200).json({ success: "User blocked." });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const userToUnblock = await requireUserByUsername(req.params.username);
  if (!includesId(req.currentUser.blockedUsers, userToUnblock._id)) {
    throw badRequest("User is not blocked.");
  }

  req.currentUser.blockedUsers.pull(userToUnblock._id);
  await req.currentUser.save();
  res.status(200).json({ success: "User unblocked." });
});

export const viewBlockList = asyncHandler(async (req, res) => {
  const blockedUsers = await User.find({ _id: { $in: req.currentUser.blockedUsers } })
    .select("username email firstName lastName profilePicture profilePictureThumb");
  const response = await Promise.all(blockedUsers.map((user) => serializeUser(user, req.currentUser)));
  res.status(200).json(response);
});

export const getAllAppUsers = asyncHandler(async (req, res) => {
  const currentUserId = req.currentUser._id;
  const users = await User.find({ _id: { $ne: currentUserId } })
    .select("firstName profilePicture profilePictureThumb blockedUsers connections");

  const accessibleUsers = visibleUsers(users, req.currentUser);
  const connectedUsers = accessibleUsers.filter((user) => includesId(req.currentUser.connections, user._id));
  const otherUsers = accessibleUsers.filter((user) => !includesId(req.currentUser.connections, user._id));
  const toCard = async (user, who) => ({
    _id: user._id,
    firstName: user.firstName,
    profilePicture: await profileUrlFor(user, 120),
    who,
  });

  const connectedCards = await Promise.all(connectedUsers.map((user) => toCard(user, "c")));
  const otherCards = await Promise.all(otherUsers.map((user) => toCard(user, "n")));

  res.status(200).json([
    {
      _id: currentUserId,
      firstName: "YOU",
      profilePicture: await profileUrlFor(req.currentUser, 120),
      who: "u",
    },
    ...connectedCards,
    ...otherCards,
  ]);
});

export const getUserById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) throw badRequest("Invalid user id.");
  const user = await User.findById(req.params.userId).select(userPublicSelect);
  if (!user) throw notFound("User not found.");
  ensureVisible(req.currentUser, user);

  const flags = relationFlags(req.currentUser, user);
  const baseUser = await serializeUser(user, req.currentUser);
  res.status(200).json({
    ...baseUser,
    sex: user.sex,
    bio: user.bio,
    joined: user.createdAt,
    profilePicture: await signMediaUrl(user.profilePicture, 300),
    isConnected: flags.isConnected,
    isBlocked: flags.hasBlockedCurrentUser,
    hasRequested: flags.hasRequested,
  });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const user = await User.findById(req.currentUser._id)
    .populate("connectionRequests", "username firstName lastName profilePicture profilePictureThumb");
  if (!user) throw notFound("User not found.");

  const connectionRequestNotifications = await Promise.all(user.connectionRequests.map(async (request) => ({
    _id: request._id,
    username: request.username,
    firstName: request.firstName,
    profilePicture: await profileUrlFor(request, 120),
    type: "connection request",
  })));

  const persisted = await listNotifications({
    recipient: req.currentUser._id,
    before: pagination.before,
    limit: pagination.limit,
  });
  const pendingRequestActors = new Set(user.connectionRequests.map((request) => request._id.toString()));
  const persistedItems = persisted.items
    .filter((notification) =>
      notification.type !== "connection_request" ||
      pendingRequestActors.has(notification.actor?._id?.toString?.())
    )
    .map(serializeNotification);

  const seen = new Set();
  const merged = [...connectionRequestNotifications, ...persistedItems].filter((notification) => {
    const key = `${notification.type}:${notification._id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.status(200).json(pagination.paginated ? { ...persisted, items: merged } : merged);
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await markNotificationsRead({
    _id: req.params.notificationId,
    recipient: req.currentUser._id,
  });
  res.status(200).json({ success: "Notification marked as read." });
});

export const getUserInfoWithPosts = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: normalizeUsername(req.params.username) })
    .select(userPublicSelect)
    .populate("posts", "image imageKey media caption likedBy archived createdAt updatedAt");
  if (!user) throw notFound("User not found.");
  ensureVisible(req.currentUser, user);

  const flags = relationFlags(req.currentUser, user);
  const visiblePosts = (user.posts || []).filter((post) => !post.archived);
  const response = {
    _id: user._id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    bio: user.bio,
    createdAt: user.createdAt,
    profilePicture: await signMediaUrl(user.profilePicture, 300),
    connectionsCount: user.connections?.length || 0,
    connectionRequestsCount: user.connectionRequests?.length || 0,
    postsCount: visiblePosts.length,
    totalLikesCount: visiblePosts.reduce((total, post) => total + (post.likedBy?.length || 0), 0),
    moreAccessible: flags.isSelf || flags.isConnected,
  };

  if (flags.isSelf || flags.isConnected) {
    response.age = user.age || null;
    response.email = user.email;
    response.gender = user.sex;
    response.posts = await loadUserPostTiles(user);
  }

  res.status(200).json(response);
});
