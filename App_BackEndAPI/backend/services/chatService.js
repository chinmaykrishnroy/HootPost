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

export const emitChatEvent = (io, chat, eventName, payload) => {
  const realtime = io?.of("/realtime");
  if (!realtime) return;
  realtime.to(`chat:${chat._id}`).emit(eventName, payload);
  for (const participantId of chat.participants) {
    realtime.to(`user:${participantId}`).emit(eventName, payload);
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
