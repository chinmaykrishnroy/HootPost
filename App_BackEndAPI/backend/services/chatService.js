import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import { signMediaUrl } from "./mediaService.js";
import { pageFromItems } from "../utils/pagination.js";

export const participantKeyFor = (ids) =>
  ids.map((id) => id.toString()).sort().join(":");

export const extractLinks = (content = "") => {
  const matches = content.match(/https?:\/\/[^\s<>()]+/gi) || [];
  return [...new Set(matches)].slice(0, 8).map((url) => {
    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {}
    return { url, host, type: "link" };
  });
};

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

  const startedAt = new Date();
  const systemMessage = await Message.create({
    chat: chat._id,
    sender: currentUser._id,
    type: "system",
    content: `${currentUser.username} started the chat`,
    deliveredTo: [currentUser._id],
    seenBy: [currentUser._id],
    deliveredAtByUser: new Map([[currentUser._id.toString(), startedAt]]),
    seenAtByUser: new Map([[currentUser._id.toString(), startedAt]]),
    systemEvent: {
      type: "chat_started",
      actor: currentUser._id,
      payload: { username: currentUser.username },
    },
  });

  chat.lastMessage = systemMessage._id;
  chat.lastMessageAt = systemMessage.createdAt;
  await chat.save();

  await User.updateMany({ _id: { $in: participants } }, { $addToSet: { chats: chat._id } });
  return chat;
};

const mapToObject = (value) => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
};

const serializeMessageSender = async (sender) => {
  if (!sender || typeof sender !== "object" || !sender.username) return sender;
  return serializeParticipant(sender);
};

const replyTextFor = (message = {}) => {
  const content = typeof message.content === "string" ? message.content.trim() : "";
  if (content) return content;
  if (message.fileName) return message.fileName;
  if (["image", "video", "audio", "file"].includes(message.type)) return "Attachment";
  return "";
};

export const createReplySnapshot = (message) => {
  if (!message?._id) return undefined;
  const sender = typeof message.sender === "object" ? message.sender : null;
  return {
    messageId: message._id,
    sender: sender?._id || message.sender,
    senderUsername: sender?.username,
    senderFirstName: sender?.firstName,
    senderLastName: sender?.lastName,
    senderProfilePicture: sender?.profilePicture,
    senderProfilePictureThumb: sender?.profilePictureThumb,
    type: message.type,
    content: replyTextFor(message),
    fileName: message.fileName,
    createdAt: message.createdAt,
  };
};

const serializeSnapshotSender = async (snapshot) => {
  if (!snapshot?.senderUsername) return snapshot?.sender || null;
  return {
    _id: snapshot.sender,
    username: snapshot.senderUsername,
    firstName: snapshot.senderFirstName,
    lastName: snapshot.senderLastName,
    profilePicture: await signMediaUrl(snapshot.senderProfilePictureThumb || snapshot.senderProfilePicture, 300),
  };
};

const summarizeSnapshot = async (snapshot) => {
  if (!snapshot?.messageId) return null;
  return {
    _id: snapshot.messageId,
    sender: await serializeSnapshotSender(snapshot),
    type: snapshot.type || "text",
    content: replyTextFor(snapshot) || "Message",
    createdAt: snapshot.createdAt,
    snapshot: true,
  };
};

const summarizeReply = async (reply, snapshot) => {
  if (!reply) return summarizeSnapshot(snapshot);
  let rawReply = reply;
  if (typeof rawReply !== "object" || (!rawReply.content && !rawReply.type)) {
    rawReply = await Message.findById(reply)
      .select("chat sender type content fileName createdAt")
      .populate("sender", "username firstName lastName profilePicture profilePictureThumb")
      .lean();
  }
  if (!rawReply) return summarizeSnapshot(snapshot);
  return {
    _id: rawReply._id || snapshot?.messageId,
    chat: rawReply.chat,
    sender: await serializeMessageSender(rawReply.sender),
    type: rawReply.type || snapshot?.type || "text",
    content: replyTextFor(rawReply) || replyTextFor(snapshot) || "Message",
    createdAt: rawReply.createdAt || snapshot?.createdAt,
  };
};

export const serializeMessage = async (message) => {
  const raw = typeof message.toObject === "function" ? message.toObject() : message;
  return {
    ...raw,
    sender: await serializeMessageSender(raw.sender),
    replyTo: await summarizeReply(raw.replyTo, raw.replySnapshot),
    deliveredAtByUser: mapToObject(raw.deliveredAtByUser),
    seenAtByUser: mapToObject(raw.seenAtByUser),
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
    settings: raw.settings,
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

export const loadMessagesPage = async ({ chatId, before, limit = 30, extraQuery = null }) => {
  const createdBefore = before ? new Date(before) : null;
  const query = extraQuery || { chat: chatId, deletedAt: null };
  if (createdBefore && !Number.isNaN(createdBefore.getTime())) {
    query.createdAt = { $lt: createdBefore };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 30, 100) + 1)
    .populate("sender", "username firstName lastName profilePicture profilePictureThumb")
    .populate({
      path: "replyTo",
      select: "chat sender type content fileName createdAt",
      populate: { path: "sender", select: "username firstName lastName profilePicture profilePictureThumb" },
    })
    .lean();

  const page = pageFromItems(messages, Math.min(Number(limit) || 30, 100));
  return { ...page, items: page.items.reverse() };
};

export const markMessagesDelivered = async ({ chatId, userId, at = new Date() }) => {
  await Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, deliveredTo: { $ne: userId } },
    {
      $addToSet: { deliveredTo: userId },
      $set: { [`deliveredAtByUser.${userId.toString()}`]: at },
    }
  );
  return at;
};

export const markMessagesRead = async ({ chatId, userId, at = new Date() }) => {
  await Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, deliveredTo: { $ne: userId } },
    {
      $addToSet: { deliveredTo: userId },
      $set: { [`deliveredAtByUser.${userId.toString()}`]: at },
    }
  );
  await Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, seenBy: { $ne: userId } },
    {
      $addToSet: { seenBy: userId },
      $set: { [`seenAtByUser.${userId.toString()}`]: at },
    }
  );
  return at;
};
