import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { deleteObjects } from "./storageService.js";

const compactKeys = (items) => [...new Set(items.filter(Boolean).map(String))];

export const deleteUserContent = async (user) => {
  const userId = user._id;
  const [posts, chats] = await Promise.all([
    Post.find({ userId }).select("image imageKey media.key").lean(),
    Chat.find({ participants: userId }).select("_id").lean(),
  ]);

  const chatIds = chats.map((chat) => chat._id);
  const attachmentMessages = await Message.find({
    $or: [{ sender: userId }, { chat: { $in: chatIds } }],
    fileKey: { $exists: true, $ne: null },
  }).select("fileKey").lean();

  const storageKeys = compactKeys([
    user.profilePicture,
    user.profilePictureThumb,
    ...posts.map((post) => post.imageKey || post.image),
    ...posts.flatMap((post) => (post.media || []).map((item) => item.key)),
    ...attachmentMessages.map((message) => message.fileKey),
  ]);

  await deleteObjects(storageKeys);
  await Promise.all([
    Message.deleteMany({ $or: [{ sender: userId }, { chat: { $in: chatIds } }] }),
    Notification.deleteMany({ $or: [{ recipient: userId }, { actor: userId }] }),
    Chat.deleteMany({ _id: { $in: chatIds } }),
    Post.deleteMany({ userId }),
    User.updateMany(
      {},
      {
        $pull: {
          connections: userId,
          connectionRequests: userId,
          blockedUsers: userId,
          chats: { $in: chatIds },
        },
      }
    ),
  ]);

  return {
    postsDeleted: posts.length,
    chatsDeleted: chats.length,
    filesDeleted: storageKeys.length,
  };
};

export const deleteUserAccount = async (user) => {
  const result = await deleteUserContent(user);
  await User.deleteOne({ _id: user._id });
  return result;
};
