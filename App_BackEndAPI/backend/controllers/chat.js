import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import asyncHandler from "../utils/asyncHandler.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { uploadAttachment } from "../services/mediaService.js";
import {
  emitChatEvent,
  ensureDirectChat,
  createReplySnapshot,
  extractLinks,
  loadMessagesPage,
  markMessagesDelivered,
  markMessagesRead,
  messageTypeFromMime,
  participantKeyFor,
  serializeChat,
  serializeChats,
  serializeMessage,
  serializeMessages,
} from "../services/chatService.js";
import { parsePagination } from "../utils/pagination.js";

const findDirectChat = async (currentUser, targetUser) => {
  const chat = await Chat.findOne({
    participantKey: participantKeyFor([currentUser._id, targetUser._id]),
  });
  if (!chat) throw notFound("Chat not found.");
  return chat;
};

export const listChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ participants: req.currentUser._id })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 30, 100))
    .populate("participants", "username firstName lastName profilePicture profilePictureThumb")
    .populate("lastMessage")
    .lean();

  res.status(200).json({ chats: await serializeChats(chats, req.currentUser._id) });
});

export const startChat = asyncHandler(async (req, res) => {
  const chat = await ensureDirectChat(req.currentUser, req.targetUser);
  const hydrated = await Chat.findById(chat._id)
    .populate("participants", "username firstName lastName profilePicture profilePictureThumb")
    .populate("lastMessage");
  const serialized = await serializeChat(hydrated, req.currentUser._id);
  emitChatEvent(req.io, hydrated, "chat:started", {
    chat: serialized,
    createdBy: req.currentUser._id,
    username: req.currentUser.username,
  });
  res.status(201).json(serialized);
});

export const loadChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    participantKey: participantKeyFor([req.currentUser._id, req.targetUser._id]),
  }).populate("participants", "username firstName lastName profilePicture profilePictureThumb");
  if (!chat) throw notFound("Chat not found. Please start a new chat.");

  const pagination = parsePagination(req.query);
  const page = await loadMessagesPage({
    chatId: chat._id,
    before: pagination.before,
    limit: pagination.limit,
  });
  const deliveredAt = await markMessagesDelivered({ chatId: chat._id, userId: req.currentUser._id });
  emitChatEvent(req.io, chat, "chat:delivered", { chatId: chat._id, userId: req.currentUser._id, at: deliveredAt });

  res.status(200).json({
    chat: await serializeChat(chat, req.currentUser._id),
    messages: await serializeMessages(page.items),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  });
});

export const deleteChat = asyncHandler(async (req, res) => {
  const chat = await findDirectChat(req.currentUser, req.targetUser);
  chat.deletedAtByUser.set(req.currentUser._id.toString(), new Date());
  await chat.save();
  res.status(200).json({ success: "Chat hidden for current user." });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const content = String(req.body.content || "").trim();
  const isPrivate = req.body.private === true || req.body.private === "true";
  const replyTo = req.body.replyTo || null;
  if (!content && !req.file) throw badRequest("Message content or file must be provided.");

  const chat = await ensureDirectChat(req.currentUser, req.targetUser);
  let replyMessage = null;
  if (replyTo) {
    replyMessage = await Message.findOne({ _id: replyTo, chat: chat._id, deletedAt: null })
      .select("chat sender type content fileName createdAt")
      .populate("sender", "username firstName lastName profilePicture profilePictureThumb")
      .lean();
    if (!replyMessage) throw badRequest("Reply target does not belong to this chat.");
  }
  const attachment = req.file
    ? await uploadAttachment({ file: req.file, keyPrefix: `chat/${chat._id}`, ownerId: req.currentUser._id })
    : null;
  const sentAt = new Date();

  const message = await Message.create({
    chat: chat._id,
    sender: req.currentUser._id,
    type: attachment ? messageTypeFromMime(attachment.mime) : "text",
    content,
    fileKey: attachment?.key,
    fileName: req.file?.originalname,
    fileSize: req.file?.size,
    fileType: attachment?.mime,
    replyTo,
    replySnapshot: createReplySnapshot(replyMessage),
    metadata: { links: extractLinks(content) },
    private: isPrivate,
    seenBy: [req.currentUser._id],
    deliveredTo: [req.currentUser._id],
    deliveredAtByUser: new Map([[req.currentUser._id.toString(), sentAt]]),
    seenAtByUser: new Map([[req.currentUser._id.toString(), sentAt]]),
    expiresAt: isPrivate
      ? new Date(Date.now() + (Number(req.body.expires) || 24 * 60) * 60 * 1000)
      : null,
  });

  chat.lastMessage = message._id;
  chat.lastMessageAt = message.createdAt;
  for (const participantId of chat.participants) {
    if (!participantId.equals(req.currentUser._id)) {
      const key = participantId.toString();
      chat.unreadCounts.set(key, (chat.unreadCounts.get(key) || 0) + 1);
    }
  }
  await chat.save();

  const hydrated = await Message.findById(message._id)
    .populate("sender", "username firstName lastName profilePicture profilePictureThumb")
    .populate({
      path: "replyTo",
      select: "chat sender type content fileName createdAt",
      populate: { path: "sender", select: "username firstName lastName profilePicture profilePictureThumb" },
    })
    .lean();
  const serialized = await serializeMessage(hydrated);
  emitChatEvent(req.io, chat, "message:new", { chatId: chat._id, message: serialized });
  res.status(201).json(serialized);
});

export const getRecentMessage = asyncHandler(async (req, res) => {
  const chat = await findDirectChat(req.currentUser, req.targetUser);
  const message = await Message.findOne({ chat: chat._id, deletedAt: null })
    .sort({ createdAt: -1 })
    .populate("sender", "username")
    .lean();

  if (!message) throw notFound("No messages found in the chat.");
  res.status(200).json(await serializeMessage(message));
});

export const loadAllMessages = asyncHandler(async (req, res) => {
  const chat = await findDirectChat(req.currentUser, req.targetUser);
  const pagination = parsePagination(req.query, { defaultLimit: 50 });
  const page = await loadMessagesPage({
    chatId: chat._id,
    before: pagination.before,
    limit: pagination.limit,
  });
  const deliveredAt = await markMessagesDelivered({ chatId: chat._id, userId: req.currentUser._id });
  emitChatEvent(req.io, chat, "chat:delivered", { chatId: chat._id, userId: req.currentUser._id, at: deliveredAt });
  const messages = await serializeMessages(page.items);
  res.status(200).json(pagination.paginated ? { ...page, items: messages } : messages);
});

export const loadMessageContext = asyncHandler(async (req, res) => {
  const chat = await findDirectChat(req.currentUser, req.targetUser);
  const target = await Message.findOne({ _id: req.params.messageId, chat: chat._id, deletedAt: null }).lean();
  if (!target) throw notFound("Message not found.");

  const populate = [
    { path: "sender", select: "username firstName lastName profilePicture profilePictureThumb" },
    {
      path: "replyTo",
      select: "chat sender type content fileName createdAt",
      populate: { path: "sender", select: "username firstName lastName profilePicture profilePictureThumb" },
    },
  ];
  const contextLimit = 25;
  const [older, newer] = await Promise.all([
    Message.find({ chat: chat._id, deletedAt: null, createdAt: { $lte: target.createdAt } })
      .sort({ createdAt: -1 })
      .limit(contextLimit + 1)
      .populate(populate)
      .lean(),
    Message.find({ chat: chat._id, deletedAt: null, createdAt: { $gt: target.createdAt } })
      .sort({ createdAt: 1 })
      .limit(25)
      .populate(populate)
      .lean(),
  ]);
  const hasMore = older.length > contextLimit;
  const ordered = [...older.slice(0, contextLimit).reverse(), ...newer];
  const seen = new Set();
  const unique = ordered.filter((message) => {
    const id = message._id.toString();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  res.status(200).json({
    chat: await serializeChat(chat, req.currentUser._id),
    messages: await serializeMessages(unique),
    nextCursor: hasMore && unique[0]?.createdAt ? unique[0].createdAt : null,
    hasMore,
    focusMessageId: req.params.messageId,
  });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const chat = await findDirectChat(req.currentUser, req.targetUser);
  const message = await Message.findOne({ _id: req.params.messageId, chat: chat._id });
  if (!message) throw notFound("Message not found.");
  if (!message.sender.equals(req.currentUser._id)) throw forbidden("Only the sender can delete this message.");

  message.deletedAt = new Date();
  await message.save();
  emitChatEvent(req.io, chat, "message:deleted", { chatId: chat._id, messageId: message._id });
  res.status(200).json({ success: "Message deleted successfully." });
});

export const updateMessage = asyncHandler(async (req, res) => {
  const content = String(req.body.content || "").trim();
  if (!content) throw badRequest("Content cannot be empty.");

  const chat = await findDirectChat(req.currentUser, req.targetUser);
  const message = await Message.findOne({ _id: req.params.messageId, chat: chat._id });
  if (!message) throw notFound("Message not found.");
  if (!message.sender.equals(req.currentUser._id)) throw forbidden("Only the sender can update this message.");

  message.content = content;
  message.metadata = { links: extractLinks(content) };
  message.editedAt = new Date();
  await message.save();
  const hydrated = await Message.findById(message._id)
    .populate("sender", "username firstName lastName profilePicture profilePictureThumb")
    .populate({
      path: "replyTo",
      select: "chat sender type content fileName createdAt",
      populate: { path: "sender", select: "username firstName lastName profilePicture profilePictureThumb" },
    })
    .lean();
  const serialized = await serializeMessage(hydrated);
  emitChatEvent(req.io, chat, "message:updated", { chatId: chat._id, message: serialized });
  res.status(200).json(serialized);
});

export const clearAllMessages = asyncHandler(async (req, res) => {
  const chat = await findDirectChat(req.currentUser, req.targetUser);
  await Message.updateMany({ chat: chat._id }, { $set: { deletedAt: new Date() } });
  chat.unreadCounts = new Map();
  await chat.save();
  emitChatEvent(req.io, chat, "chat:cleared", { chatId: chat._id });
  res.status(200).json({ success: "All messages cleared." });
});

export const searchMessage = asyncHandler(async (req, res) => {
  const query = String(req.query.query || "").trim();
  if (!query) throw badRequest("Search query cannot be empty.");

  const chat = await findDirectChat(req.currentUser, req.targetUser);
  const messages = await Message.find({
    chat: chat._id,
    deletedAt: null,
    type: { $ne: "system" },
    $text: { $search: query },
  })
    .sort({ score: { $meta: "textScore" } })
    .limit(50)
    .populate("sender", "username firstName lastName profilePicture profilePictureThumb")
    .populate({
      path: "replyTo",
      select: "chat sender type content fileName createdAt",
      populate: { path: "sender", select: "username firstName lastName profilePicture profilePictureThumb" },
    })
    .lean();

  res.status(200).json({ items: await serializeMessages(messages) });
});

export const listChatAttachments = asyncHandler(async (req, res) => {
  const type = String(req.query.type || "media");
  const chat = await Chat.findOne({ _id: req.params.chatId, participants: req.currentUser._id });
  if (!chat) throw notFound("Chat not found.");

  const query = { chat: chat._id, deletedAt: null };
  if (type === "links") {
    query["metadata.links.0"] = { $exists: true };
  } else if (type === "files") {
    query.fileKey = { $exists: true };
    query.type = { $nin: ["image", "video"] };
  } else {
    query.type = { $in: ["image", "video"] };
  }

  const pagination = parsePagination(req.query, { defaultLimit: 40 });
  const page = await loadMessagesPage({
    chatId: chat._id,
    before: pagination.before,
    limit: pagination.limit,
    extraQuery: query,
  });
  res.status(200).json({
    items: await serializeMessages(page.items),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  });
});

export const markChatRead = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.chatId, participants: req.currentUser._id });
  if (!chat) throw notFound("Chat not found.");

  chat.unreadCounts.set(req.currentUser._id.toString(), 0);
  await chat.save();
  const readAt = await markMessagesRead({ chatId: chat._id, userId: req.currentUser._id });

  emitChatEvent(req.io, chat, "chat:read", { chatId: chat._id, userId: req.currentUser._id, at: readAt });
  res.status(200).json({ success: "Chat marked as read.", at: readAt });
});
