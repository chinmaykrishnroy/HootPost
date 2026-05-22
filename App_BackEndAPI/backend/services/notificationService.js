import Notification from "../models/Notification.js";
import { pageFromItems } from "../utils/pagination.js";

const typeLabels = {
  connection_request: "connection request",
  connection_accepted: "connection accepted",
  session_revoked: "session revoked",
  system: "system notification",
};

export const createNotification = async ({ recipient, actor, type, entityType, entityId, message, metadata = {} }) => {
  const notification = await Notification.findOneAndUpdate(
    { recipient, actor, type, entityId },
    {
      $set: { entityType, message, metadata, readAt: null },
      $setOnInsert: { recipient, actor, type, entityId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("actor", "username firstName lastName profilePicture profilePictureThumb");

  return notification;
};

export const markNotificationsRead = async (filter) =>
  Notification.updateMany(filter, { $set: { readAt: new Date() } });

export const listNotifications = async ({ recipient, before, limit = 30 }) => {
  const query = { recipient };
  if (before) query.createdAt = { $lt: before };
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("actor", "username firstName lastName profilePicture profilePictureThumb")
    .lean();

  return pageFromItems(notifications, limit);
};

export const serializeNotification = (notification) => ({
  notificationId: notification._id,
  _id: notification.actor?._id || notification._id,
  username: notification.actor?.username,
  firstName: notification.actor?.firstName,
  type: typeLabels[notification.type] || notification.type,
  rawType: notification.type,
  message: notification.message,
  readAt: notification.readAt || null,
  createdAt: notification.createdAt,
});

export const emitNotification = (io, notification) => {
  const realtime = io?.of("/realtime");
  if (!realtime) return;
  realtime.to(`user:${notification.recipient}`).emit("notification:new", {
    notification: serializeNotification(notification),
  });
};
