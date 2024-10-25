import express from "express";
import path from "path";
import sharp from "sharp";
import User from "../models/User.js";
import { detectFileType, handleError } from "../utility/fileutils.js";
import { uploadFileToS3, generateSignedUrl, deleteFileFromS3 } from '../utility/s3client.js';

const router = express.Router({ mergeParams: true });

export const seachUser = async (req, res) => {
  const { usr } = req.query;
  if (!usr) return res.status(400).send("Search term is required");

  const searchCriteria = {
    $or: [
      { username: usr },
      { email: usr },
      { firstName: { $regex: usr, $options: "i" } },
      { lastName: { $regex: usr, $options: "i" } },
    ],
  };

  try {
    const users = await User.find(searchCriteria).select("-password");

    const currentUserBlockedUsers = req.currentUser.blockedUsers || [];

    const accessibleUsers = users.filter((user) => {
      const userBlockedUsers = user.blockedUsers || [];

      const isBlockedByCurrentUser = currentUserBlockedUsers.includes(user._id);
      const hasBlockedCurrentUser = userBlockedUsers.includes(
        req.currentUser._id
      );

      return !isBlockedByCurrentUser && !hasBlockedCurrentUser;
    });

    if (accessibleUsers.length === 0)
      return res.status(404).send("No users found");
    res.json(accessibleUsers);
  } catch (err) {
    handleError(res, err);
  }
};
export const getAllUserSelf = async (req, res) => {
  try {
    const users = await User.find().select(
      "username email firstName lastName age sex bio"
    );

    const currentUserBlockedUsers = req.currentUser.blockedUsers || [];
    const accessibleUsers = users.filter((user) => {
      const userBlockedUsers = user.blockedUsers || [];
      const isBlockedByCurrentUser = currentUserBlockedUsers.includes(user._id);
      const hasBlockedCurrentUser = userBlockedUsers.includes(
        req.currentUser._id
      );

      return !isBlockedByCurrentUser && !hasBlockedCurrentUser;
    });

    res.json(accessibleUsers);
  } catch (err) {
    handleError(res, err);
  }
};
export const uploadProfilePicture2 = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");
    const allowedExtensions = /jpeg|jpg|png|gif/;
    const extname = allowedExtensions.test(path.extname(req.file.originalname).toLowerCase());
    const mimetype = allowedExtensions.test(req.file.mimetype);
    if (!extname || !mimetype) return res.status(400).send("Only image files are allowed!");
    let compressedImage;
    if (req.file.mimetype === 'image/gif') {
      compressedImage = req.file.buffer;
    } else {
      compressedImage = await sharp(req.file.buffer)
        .resize({ width: 1080, height: 1080, fit: sharp.fit.cover })
        .toFormat(mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 95 })
        .toBuffer();
    }
    const smallProfilePicture = await sharp(req.file.buffer)
      .resize(200, 200)
      .toFormat(mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 95 })
      .toBuffer();
    req.currentUser.profilePicture = compressedImage;
    req.currentUser.profilePictureSmall = smallProfilePicture;
    await req.currentUser.save();
    res.status(200).send("Profile picture updated successfully");
  } catch (err) {
    res.status(500).send("Error updating profile picture");
  }
};
export const deleteProfilePicture = async (req, res) => {
  try {
    if (!req.currentUser.profilePicture)
    return res.status(204).send("No profile picture to delete");
    const oldFileName = req.currentUser.profilePicture.split('/').pop().split('?')[0];
    await deleteFileFromS3(oldFileName);
    req.currentUser.profilePicture = undefined;
    req.currentUser.profilePictureSmall = undefined;
    await req.currentUser.save();
    res.status(200).send("Profile picture deleted successfully");
  } catch (err) {
    handleError(res, err);
  }
};
export const getProfilePicture2 = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      "profilePicture blockedUsers"
    );
    if (
      req.currentUser.blockedUsers.includes(user._id) ||
      user.blockedUsers.includes(req.currentUser._id)
    ) {
      return res.status(403).send("Access denied");
    }
    if (!user || !user.profilePicture)
      return res.status(404).send("Profile picture not found");
    const mimeType = await detectFileType(user.profilePicture);
    res.set("Content-Type", mimeType);
    res.send(user.profilePicture);
  } catch (err) {
    handleError(res, err);
  }
};
export const sendRequest = async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username });
    if (!targetUser) return res.status(404).send("User not found");
    if (targetUser._id.equals(req.currentUser._id))
      return res.status(400).send("You cannot connect with yourself");
    if (
      req.currentUser.blockedUsers.includes(targetUser._id) ||
      targetUser.blockedUsers.includes(req.currentUser._id)
    ) {
      return res.status(403).send("Cannot connect with this user");
    }
    if (targetUser.connections.includes(req.currentUser._id))
      return res.status(400).send("Already connected");
    if (targetUser.connectionRequests.includes(req.currentUser._id))
      return res.status(400).send("Connection request already sent");
    targetUser.connectionRequests.push(req.currentUser._id);
    await targetUser.save();
    res.status(200).send("Connection request sent");
  } catch (err) {
    handleError(res, err);
  }
};
export const acceptRequest = async (req, res) => {
  try {
    const requesterUser = await User.findOne({ username: req.params.username });
    if (!requesterUser) return res.status(404).send("User not found");
    if (!req.currentUser.connectionRequests.includes(requesterUser._id))
      return res.status(400).send("No connection request from this user");
    req.currentUser.connectionRequests.pull(requesterUser._id);
    req.currentUser.connections.push(requesterUser._id);
    requesterUser.connections.push(req.currentUser._id);
    await req.currentUser.save();
    await requesterUser.save();
    res.send("Connection accepted");
  } catch (err) {
    handleError(res, err);
  }
};
export const viewRequests = async (req, res) => {
  try {
    const user = await User.findById(req.currentUser._id).populate(
      "connectionRequests",
      "username"
    );
    if (!user) return res.status(404).send("User not found");
    res.status(200).json(user.connectionRequests);
  } catch (err) {
    handleError(res, err);
  }
};
export const viewConnections = async (req, res) => {
  try {
    const user = await User.findById(req.currentUser._id).populate(
      "connections",
      "username"
    );
    if (!user) return res.status(404).send("User not found");
    res.status(200).json(user.connections);
  } catch (err) {
    handleError(res, err);
  }
};
export const unsendRequest = async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username });
    if (!targetUser) return res.status(404).send("User not found");

    if (targetUser._id.equals(req.currentUser._id))
      return res.status(400).send("Bad Request");

    if (!targetUser.connectionRequests.includes(req.currentUser._id))
      return res.status(400).send("No connection request to unsend");

    targetUser.connectionRequests.pull(req.currentUser._id);
    await targetUser.save();

    res.send("Connection request unsent");
  } catch (err) {
    handleError(res, err);
  }
};
export const deleteRequest = async (req, res) => {
  try {
    const requesterUser = await User.findOne({ username: req.params.username });
    if (!requesterUser) return res.status(404).send("User not found");

    if (requesterUser._id.equals(req.currentUser._id))
      return res.status(400).send("Bad Request");

    if (!req.currentUser.connectionRequests.includes(requesterUser._id))
      return res.status(400).send("No connection request from this user");

    req.currentUser.connectionRequests.pull(requesterUser._id);
    await req.currentUser.save();

    res.send("Connection request deleted");
  } catch (err) {
    handleError(res, err);
  }
};
export const removeConnection = async (req, res) => {
  try {
    const connectedUser = await User.findOne({ username: req.params.username });
    if (!connectedUser) return res.status(404).send("User not found");

    // Check if the users are connected
    if (!req.currentUser.connections.includes(connectedUser._id))
      return res.status(400).send("No connection exists with this user");

    // Remove each other from connections list
    req.currentUser.connections.pull(connectedUser._id);
    connectedUser.connections.pull(req.currentUser._id);

    await req.currentUser.save();
    await connectedUser.save();

    res.send("Connection removed");
  } catch (err) {
    handleError(res, err);
  }
};
export const blockUser = async (req, res) => {
  try {
    const userToBlock = await User.findOne({ username: req.params.username });
    if (!userToBlock) return res.status(404).send("User not found");
    if (req.currentUser._id.equals(userToBlock._id))
      return res.status(400).send("You cannot block yourself");

    if (!req.currentUser.blockedUsers.includes(userToBlock._id)) {
      req.currentUser.blockedUsers.push(userToBlock._id);

      req.currentUser.connections.pull(userToBlock._id);
      req.currentUser.connectionRequests.pull(userToBlock._id);

      await req.currentUser.save();
      return res.status(200).send("User blocked");
    }
    return res.status(400).send("User already blocked");
  } catch (err) {
    handleError(res, err);
  }
};
export const unblockUser = async (req, res) => {
  try {
    const userToUnblock = await User.findOne({ username: req.params.username });
    if (!userToUnblock) return res.status(404).send("User not found");
    if (req.currentUser._id.equals(userToUnblock._id))
      return res.status(400).send("It's you!");
    if (req.currentUser.blockedUsers.includes(userToUnblock._id)) {
      req.currentUser.blockedUsers.pull(userToUnblock._id);
      await req.currentUser.save();
      return res.status(200).send("User unblocked");
    }
    return res.status(400).send("User is not blocked");
  } catch (err) {
    handleError(res, err);
  }
};
export const viewBlockList = async (req, res) => {
  try {
    const blockedUsers = await User.find({
      _id: { $in: req.currentUser.blockedUsers },
    }).select("username email firstName lastName");

    if (blockedUsers.length === 0) {
      return res.status(404).send("No blocked users found");
    }
    res.status(200).json(blockedUsers);
  } catch (err) {
    handleError(res, err);
  }
};
export const getAllAppUsers = async (req, res) => {
  try {
    const currentUserId = req.currentUser._id;
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select("firstName profilePicture _id blockedUsers connections");
    const currentUserBlockedUsers = req.currentUser.blockedUsers || [];
    const bufferToBase64 = (buffer) => buffer ? `data:image/jpeg;base64,${buffer.toString('base64')}` : null;
    let currentUserProfilePicture = bufferToBase64(req.currentUser.profilePictureSmall);
    if (!currentUserProfilePicture && req.currentUser.profilePicture) {
      currentUserProfilePicture = bufferToBase64(req.currentUser.profilePicture);
    }
    const accessibleUsers = users.filter(user => {
      const isBlockedByCurrentUser = currentUserBlockedUsers.includes(user._id);
      const hasBlockedCurrentUser = (user.blockedUsers || []).includes(currentUserId);
      return !isBlockedByCurrentUser && !hasBlockedCurrentUser;
    });
    const connectedUsers = accessibleUsers.filter(user => req.currentUser.connections.includes(user._id));
    const otherUsers = accessibleUsers.filter(user => !req.currentUser.connections.includes(user._id));
    const signedUrl = async (url) => {
      if (!url) return null;
      const fileName = url.split('/').pop();
      const URL = await generateSignedUrl(fileName, 120);
      return URL;
    };
    const formattedUsers = [
      {
        _id: currentUserId,
        firstName: 'YOU',
        profilePicture: currentUserProfilePicture,
        who: 'u',
      },
      ...await Promise.all(connectedUsers.map(async (user) => ({
        _id: user._id,
        firstName: user.firstName,
        profilePicture: await signedUrl(user.profilePicture),
        who: 'c',
      }))),
      ...await Promise.all(otherUsers.map(async (user) => ({
        _id: user._id,
        firstName: user.firstName,
        profilePicture: await signedUrl(user.profilePicture),
        who: 'n',
      })))
    ];
    res.json(formattedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.currentUser._id;
    const user = await User.findById(userId).select("firstName lastName profilePicture username sex bio blockedUsers createdAt connections connectionRequests");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isBlockedByCurrentUser = req.currentUser.blockedUsers.includes(userId);
    const hasBlockedCurrentUser = user.blockedUsers.includes(currentUserId);
    if (isBlockedByCurrentUser || hasBlockedCurrentUser) {
      return res.status(403).json({ message: "Access denied" });
    }
    const isConnected = user.connections.includes(currentUserId);
    const hasRequested = user.connectionRequests.includes(currentUserId);
    let profilePictureUrl = null;
    if (user.profilePicture) {
      const fileName = user.profilePicture.split('/').pop();
      profilePictureUrl = await generateSignedUrl(fileName, 30);
    }
    res.json({
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      sex: user.sex,
      bio: user.bio,
      joined: user.createdAt,
      profilePicture: profilePictureUrl,
      isConnected: isConnected,
      isBlocked: hasBlockedCurrentUser,
      hasRequested: hasRequested,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.currentUser._id).populate(
      "connectionRequests",
      "username"
    );
    if (!user) return res.status(404).send("User not found");

    const notifications = user.connectionRequests.map((request) => ({
      _id: request._id,
      username: request.username,
      type: "connection request",
    }));

    res.status(200).json(notifications);
  } catch (err) {
    handleError(res, err);
  }
};

export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");
    const allowedExtensions = /jpeg|jpg|png|gif/;
    const extname = allowedExtensions.test(path.extname(req.file.originalname).toLowerCase());
    const mimetype = allowedExtensions.test(req.file.mimetype);
    if (!extname || !mimetype) return res.status(400).send("Only image files are allowed!");
    let compressedImage;
    if (req.file.mimetype === 'image/gif') {
      compressedImage = req.file.buffer;
    } else {
      compressedImage = await sharp(req.file.buffer)
        .resize({ width: 1080, height: 1080, fit: sharp.fit.cover })
        .toFormat(req.file.mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 35 })
        .toBuffer();
    }
    if (req.currentUser.profilePicture) {
      const oldFileName = req.currentUser.profilePicture.split('/').pop().split('?')[0];
      await deleteFileFromS3(oldFileName);
    }
    const fileName = `${req.currentUser._id}-${Date.now()}.${req.file.mimetype.split('/')[1]}`;
    const fileUrl = await uploadFileToS3(compressedImage, fileName, req.file.mimetype);
    req.currentUser.profilePicture = fileUrl;
    const smallProfilePicture = await sharp(req.file.buffer)
      .resize(160, 160)
      .toFormat(req.file.mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 95 })
      .toBuffer();
    req.currentUser.profilePictureSmall = smallProfilePicture;
    await req.currentUser.save();
    res.status(200).send("Profile picture updated successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating profile picture");
  }
};

export const getProfilePicture = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("profilePicture profilePictureSmall blockedUsers");
    if (!user) {
      return res.status(404).send("User not found");
    }
    if (
      req.currentUser.blockedUsers.includes(user._id) ||
      user.blockedUsers.includes(req.currentUser._id)
    ) {
      return res.status(403).send("Access denied");
    }
    if (!user.profilePicture) {
      return res.status(204).send("Profile picture does not exist");
    }
    const fileName = user.profilePicture.split('/').pop();
    const signedUrl = await generateSignedUrl(fileName, 30);
    res.status(200).json({ profilePicture: signedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving profile picture");
  }
};

import { Types } from 'mongoose';

export const getUserInfoWithPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.currentUser?._id; // Use optional chaining
    const user = await User.findOne({ username })
      .select("firstName lastName profilePicture username sex bio age email createdAt connections connectionRequests posts blockedUsers")
      .populate("posts", "image likedBy");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isBlockedByCurrentUser = req.currentUser?.blockedUsers?.includes(user._id) || false;
    const hasBlockedCurrentUser = user.blockedUsers?.includes(currentUserId) || false;

    if (isBlockedByCurrentUser || hasBlockedCurrentUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    const isConnected = user.connections?.includes(currentUserId) || false;

    const responseData = {
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      createdAt: user.createdAt,
      profilePicture: user.profilePicture ? await generateSignedUrl(user.profilePicture.split('/').pop(), 30) : null,
      connectionsCount: user.connections?.length || 0,
      connectionRequestsCount: user.connectionRequests?.length || 0,
      postsCount: user.posts?.length || 0,
      totalLikesCount: user.posts?.reduce((acc, post) => acc + post.likedBy.length, 0) || 0,
      moreAccessible: user._id.equals(currentUserId) || isConnected,
    };

    if (user._id.equals(currentUserId) || isConnected) {
      responseData.age = user.age || null;
      responseData.email = user.email;
      responseData.gender = user.sex;
      responseData.posts = await Promise.all(user.posts.map(async post => ({
        postId: post._id,
        image: await generateSignedUrl(post.image.split('/').pop(), 120),
      })));
    }

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export default router;
