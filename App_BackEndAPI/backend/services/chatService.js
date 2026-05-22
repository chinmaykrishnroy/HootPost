import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import { signMediaUrl } from "./mediaService.js";
import { pageFromItems } from "../utils/pagination.js";

export const participantKeyFor = (ids) =>
  ids.map((id) => id.toString()).sort().join(":");

export const ensureDirectChat = async (currentUser, targetUser) => {
  const participants = [currentUser._id, targetUser._id];
  const participantKey = participantKeyFor(participants);
  let chat = await Chat.findOne({ participantKey });
  if (chat) return chat;

  chat = await Chat.create({
    participants,
    participantKey,
    createdBy: currentUser._id,
    lastMessageAt: new Date(),
  });

  await User.updateMany({ _id: { $in: participants } }, { $addToSet: { chats: chat._id } });
  return chat;
};

export const serializeMessage = async (message) => {
  const raw = typeof message.toObject === "function" ? message.toObject() : message;
  return {
    ...raw,
    fileUrl: await signMediaUrl(raw.fileKey, 300),
  };
};

export const serializeMessages = async (messages) =>
  Promise.all(messages.map(serializeMessage));

const unreadCountFor = (chat, userId) => {
  const key = userId.toString();
  if (chat.unreadCounts instanceof Map) return chat.unreadCounts.get(key) || 0;
  return chat.unreadCounts?.[key] || 0;
};

const serializeParticipant = async (participant) => {
  const raw = typeof participant.toObject === "function" ? participant.toObject() : participant;
  return {
    _id: raw._id,
    username: raw.username,
    firstName: raw.firstName,
    lastName: raw.lastName,
    profilePicture: await signMediaUrl(raw.profilePictureThumb || raw.profilePicture, 300),
  };
};

export const serializeChat = async (chat, currentUserId) => {
  const raw = typeof chat.toObject === "function" ? chat.toObject() : chat;
  return {
    _id: raw._id,
    participants: await Promise.all((raw.participants || []).map(serializeParticipant)),
    participantKey: raw.participantKey,
    createdBy: raw.createdBy,
    lastMessage: raw.lastMessage && raw.lastMessage.content !== undefined
      ? await serializeMessage(raw.lastMessage)
      : raw.lastMessage || null,
    lastMessageAt: raw.lastMessageAt,
    unreadCount: currentUserId ? unreadCountFor(raw, currentUserId) : 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

export const serializeChats = async (chats, currentUserId) =>
  Promise.all(chats.map((chat) => serializeChat(chat, currentUserId)));

export const emitChatEvent = (io, chat, eventName, payload) => {
  const realtime = io?.of("/realtime");
  if (!realtime) return;
  realtime.to(`chat:${chat._id}`).emit(eventName, payload);
  for (const participantId of chat.participants) {
    const roomId = participantId?._id || participantId;
    realtime.to(`user:${roomId}`).emit(eventName, payload);
  }
};

export const messageTypeFromMime = (mime = "") => {
  const family = mime.split("/")[0];
  return ["image", "video", "audio"].includes(family) ? family : "file";
};

export const loadMessagesPage = async ({ chatId, before, limit = 30 }) => {
  const createdBefore = before ? new Date(before) : null;
  const query = { chat: chatId, deletedAt: null };
  if (createdBefore && !Number.isNaN(createdBefore.getTime())) {
    query.createdAt = { $lt: createdBefore };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 30, 100) + 1)
    .populate("sender", "username")
    .lean();

  const page = pageFromItems(messages, Math.min(Number(limit) || 30, 100));
  return { ...page, items: page.items.reverse() };
};

export const markMessagesDelivered = async ({ chatId, userId }) =>
  Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, deliveredTo: { $ne: userId } },
    { $addToSet: { deliveredTo: userId } }
  );

export const markMessagesRead = async ({ chatId, userId }) =>
  Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, seenBy: { $ne: userId } },
    { $addToSet: { seenBy: userId } }
  );
