import User from "../models/User.js";
import Post from "../models/Post.js";
import Chat from "../models/Chat.js";
import { handleError } from "../utility/fileutils.js";
import config from '../config/config.js';
import { deleteFileFromS3, deleteMultipleFilesFromS3, deleteAllFilesFromS3 } from '../utility/s3client.js';

export const getAllUsers = async (req, res) => {
  const { adminPassword } = req.body;
  try {
    if (adminPassword !== config.ADMIN)
      return res.status(403).send("Unauthorized: Invalid admin password");
    const users = await User.find();
    res.json(users);
  } catch (err) {
    handleError(res, err);
  }
};
export const deleteAllUsers = async (req, res) => {
  const { adminPassword } = req.body;
  if (adminPassword !== config.ADMIN) 
    return res.status(403).send("Invalid admin password");
  try {
    const users = await User.find({ profilePicture: { $exists: true } });
    const profilePictures = users
      .map(user => user.profilePicture.split('/').pop().split('?')[0])
    if (profilePictures.length > 0) {
      await deleteMultipleFilesFromS3(profilePictures);
    }
    await deleteAllFilesFromS3()
    await User.deleteMany({});
    await Post.deleteMany({});
    await Chat.deleteMany({});
    res.status(200).send("All users, posts, and chats deleted successfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
};
export const deleteUser = async (req, res) => {
  const { username, adminPassword } = req.body;

  try {
    if (adminPassword !== config.ADMIN)
      return res.status(403).send("Unauthorized: Invalid admin password");

    const user = await User.findOne({ username });

    if (!user) return res.status(404).send("User not found");

    const userId = user._id;
    if (user.profilePicture) {
      const profilePicFileName = user.profilePicture.split('/').pop();
      await deleteFileFromS3(profilePicFileName);
    }
    const posts = await Post.find({ userId });
    const chats = await Chat.find({ participants: userId });
    const postDeletionPromises = posts.map(async post => {
      const postImageFileName = post.image.split('/').pop();
      await deleteFileFromS3(postImageFileName);
    });
    await Post.deleteMany({ userId });
    const chatUpdatePromises = chats.map(async chat => {
      const messageFileDeletionPromises = chat.messages.map(async message => {
        if (message.file) {
          const messageFileName = `message-${message._id}`;
          await deleteFileFromS3(messageFileName);
        }
      });
      await Promise.all(messageFileDeletionPromises);
      chat.participants = chat.participants.filter(participant => participant.toString() !== userId.toString());
      if (chat.participants.length === 0) {
        await Chat.deleteOne({ _id: chat._id });
      } else {
        await chat.save();
      }
    });
    await User.deleteOne({ _id: userId });
    await Promise.all([...postDeletionPromises, ...chatUpdatePromises]);

    res.status(200).send("User and related data deleted successfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
};

export const deleteLargeBuffers = async (req, res) => {
  const { adminPassword, sizeLimitMB } = req.body;
  const sizeLimit = sizeLimitMB * 1024 * 1024;
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(403).send("Unauthorized: Invalid admin password");
  }
  try {
    const posts = await Post.find();
    const largePosts = posts.filter(post => post.image && post.image.length > sizeLimit);
    if (largePosts.length > 0) {
      const postIdsWithLargeImages = largePosts.map(post => post._id);
      await Post.updateMany(
        { _id: { $in: postIdsWithLargeImages } },
        { $unset: { image: "" } }
      );
    }
    const chats = await Chat.find();
    let updatedCount = 0;
    for (const chat of chats) {
      if (chat.messages) {
        const filteredMessages = chat.messages.filter(message => {
          const size = message.file ? message.file.length : 0;
          return size <= sizeLimit;
        });
        if (filteredMessages.length !== chat.messages.length) {
          await Chat.updateOne(
            { _id: chat._id },
            { $set: { messages: filteredMessages } }
          );
          updatedCount++;
        }
      }
    }
    const users = await User.find({ profilePicture: { $exists: true } });
    const usersWithLargePictures = users.filter(user => {
      const size = user.profilePicture ? user.profilePicture.length : 0;
      return size > sizeLimit;
    });
    if (usersWithLargePictures.length > 0) {
      const userIdsWithLargePictures = usersWithLargePictures.map(user => user._id);
      await User.updateMany(
        { _id: { $in: userIdsWithLargePictures } },
        { $unset: { profilePicture: "" } }
      );
    }
    res.status(200).send("All image buffers above the specified limit have been deleted successfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
};
export const deleteAllPosts = async (req, res) => {
  const { adminPassword } = req.body;
  if (adminPassword !== config.ADMIN) 
    return res.status(403).send("Invalid admin password");
  try {
    const posts = await Post.find({ imageUrl: { $exists: true } });
    const imageUrls = posts
      .map(post => post.imageUrl.split('/').pop().split('?')[0]);
    if (imageUrls.length > 0) {
      await deleteMultipleFilesFromS3(imageUrls);
    }
    await Post.deleteMany({});
    res.status(200).send("All posts deleted successfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
};