import sharp from "sharp";
import path from "path";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { uploadFileToS3, generateSignedUrl, deleteFileFromS3 } from '../utility/s3client.js';

export const getAllPosts = async (req, res) => {
  try {
    const user = await User.findById(req.currentUser._id)
      .populate({
        path: "connections",
        select: "posts",
        populate: { path: "posts", model: "Post" },
      })
      .populate("posts")
      .lean();
    const allPosts = [
      ...user.posts.map((post) => ({
        postId: post._id,
        caption: post.caption || "",
        image: post.image,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      })),
      ...user.connections.flatMap((connection) =>
        connection.posts.map((post) => ({
          postId: post._id,
          caption: post.caption || "",
          image: post.image,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        }))
      ),
    ];
    res.status(200).json(allPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getUserPosts = async (req, res) => {
  try {
    const user = await User.findById(req.currentUser._id)
      .populate("posts")
      .lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const userPosts = user.posts.map((post) => ({
      postId: post._id,
      caption: post.caption || "",
      image: post.image,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }));
    res.status(200).json(userPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const createPost = async (req, res) => {
  try {
    const minWidth=1080;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const allowedExtensions = /jpeg|jpg|png|gif/;
    const extname = allowedExtensions.test(
      path.extname(req.file.originalname).toLowerCase()
    );
    const mimetype = allowedExtensions.test(req.file.mimetype);
    if (!extname || !mimetype) {
      return res.status(400).json({ error: "Only image files are allowed!" });
    }
    let processedImage;
    if (req.file.mimetype === 'image/gif') {
      processedImage = req.file.buffer;
    } else {
      processedImage = await sharp(req.file.buffer)
        .resize({ width: minWidth, height: undefined, fit: sharp.fit.cover })
        .toFormat(mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 25 })
        .toBuffer();
    }
    if (!processedImage) {
      return res.status(400).json({ error: "Image processing failed." });
    }
    const fileName = `${req.currentUser._id}-${Date.now()}.${req.file.mimetype.split('/')[1]}`;
    const fileUrl = await uploadFileToS3(processedImage, fileName, req.file.mimetype);
    const post = new Post({
      userId: req.currentUser._id,
      image: fileUrl,
      caption: req.body.caption || "",
      sizeMode: req.body.sizeMode || null
    });
    await post.save();
    req.currentUser.posts.push(post._id);
    await req.currentUser.save();
    res.status(201).json({ message: "Post created successfully", postId: post._id });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (post.userId.toString() !== req.currentUser._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this post!" });
    }
    if (!post) {
      return res.status(404).json({ error: "Post not found!" });
    }
    const imageFileName = post.image.split('/').pop();
    await deleteFileFromS3(imageFileName);
    req.currentUser.posts.pull(postId);
    await req.currentUser.save();
    await Post.findByIdAndDelete(postId);

    res.status(200).json({ success: "Post deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { caption } = req.body;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found!" });
    }
    if (post.userId.toString() !== req.currentUser._id.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this post!" });
    }
    post.updatedAt = Date.now();
    await post.save();
    res.status(200).json({ success: "Post updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found!" });
    }
    if (post.likedBy.includes(req.currentUser._id)) {
      return res.status(400).json({ error: "You have already liked this post!" });
    }
    post.likedBy.push(req.currentUser._id);
    post.likeCount += 1;
    await post.save();
    res.status(200).json({ success: "Post liked!", likes: post.likeCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found!" });
    }
    const userIndex = post.likedBy.indexOf(req.currentUser._id);
    if (userIndex === -1) {
      return res.status(400).json({ error: "You have not liked this post!" });
    }
    post.likedBy.splice(userIndex, 1);
    post.likeCount -= 1;
    await post.save();
    res.status(200).json({ success: "Post disliked!", likes: post.likeCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getAllPostsHTML = async (req, res) => {
  try {
    const currentUser = req.currentUser;
    const connectedUsers = await User.find({
      _id: { $in: currentUser.connections },
    })
      .select("posts username profilePicture")
      .populate("posts")
      .lean();
    const currentUserPosts = await User.findById(currentUser._id)
      .select("posts username profilePicture")
      .populate("posts")
      .lean();
    const userPostsArray = currentUserPosts.posts || [];
    const allPosts = [
      ...userPostsArray.map((post) => ({
        postId: post._id,
        username: currentUserPosts.username,
        userId: currentUserPosts._id,
        profilePicture: currentUserPosts.profilePicture,
        image: post.image,
        caption: post.caption,
        createdAt: post.createdAt,
      })),
      ...connectedUsers.flatMap((user) =>
        user.posts.map((post) => ({
          postId: post._id,
          username: user.username,
          userId: user._id,
          profilePicture: user.profilePicture,
          image: post.image,
          caption: post.caption,
          createdAt: post.createdAt,
        }))
      ),
    ];
    const userIdsInvolved = Array.from(
      new Set(allPosts.map((post) => post.userId.toString()))
    );
    const usersWithProfilePictures = await User.find({
      _id: { $in: userIdsInvolved },
    })
      .select("username profilePicture")
      .lean();
    const resizedProfilePictures = {};

    for (const user of usersWithProfilePictures) {
      // Check if user has a profile picture
      if (user.profilePicture && user.profilePicture.length > 0) {
        try {
          // If profilePicture is a base64 string, decode it to a Buffer
          const profilePictureBuffer = Buffer.isBuffer(user.profilePicture)
            ? user.profilePicture
            : Buffer.from(
                user.profilePicture.replace(/^data:image\/\w+;base64,/, ""),
                "base64"
              );

          const resizedBuffer = await sharp(profilePictureBuffer)
            .resize(40, 40) // Resize to 40x40
            .toBuffer();

          // Convert resized image to base64 and store it by userId
          resizedProfilePictures[
            user._id
          ] = `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`;
        } catch (err) {
          console.error(
            `Error resizing profile picture for user ${user.username}:`,
            err
          );
          // If resizing fails, use placeholder
          resizedProfilePictures[user._id] = "https://via.placeholder.com/40";
        }
      } else {
        // If user has no valid profile picture, use a placeholder
        resizedProfilePictures[user._id] = "https://via.placeholder.com/40";
      }
    }

    // Step 7: HTML structure and CSS styling
    let htmlContent = `
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #fafafa;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .post {
              background-color: #fff;
              border: 1px solid #dbdbdb;
              margin-bottom: 20px;
              border-radius: 8px;
              box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);
            }
            .post-header {
              display: flex;
              align-items: center;
              padding: 10px;
            }
            .profile-pic {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              margin-right: 10px;
              object-fit: cover;
            }
            .username {
              font-weight: bold;
              color: #333;
            }
            .post-image {
              width: 100%;
              display: block;
              object-fit: cover;
            }
            .post-caption {
              padding: 10px;
              font-size: 14px;
              color: #555;
            }
            .no-posts {
              text-align: center;
              color: #999;
              font-size: 16px;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">`;

    // Step 8: Generate HTML for each post with resized profile pictures
    for (const post of allPosts) {
      const profilePicSrc =
        resizedProfilePictures[post.userId] || "https://via.placeholder.com/40"; // Use stored profile picture or fallback

      const postImageSrc = post.image
        ? `data:image/jpeg;base64,${post.image.toString("base64")}` // Convert buffer to base64
        : "https://via.placeholder.com/600"; // Fallback if no post image

      htmlContent += `
          <div class="post">
            <div class="post-header">
              <img src="${profilePicSrc}" alt="Profile Picture" class="profile-pic">
              <span class="username">${post.username}</span>
            </div>
            <img src="${postImageSrc}" alt="Post Image" class="post-image">
            <div class="post-caption">${post.caption || ""}</div>
          </div>`;
    }

    // Step 9: If no posts found, display a message
    if (allPosts.length === 0) {
      htmlContent += `<div class="no-posts">No posts found</div>`;
    }

    // Step 10: Close HTML tags and send the response
    htmlContent += `
          </div>
        </body>
        </html>`;

    // Send HTML content
    res.status(200).send(htmlContent);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: err.message });
  }
};
export const downloadPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const currentUser = await User.findById(req.currentUser._id).populate('connections');
    const post = await Post.findById(postId).populate('userId', 'username');
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const isOwner = post.userId._id.equals(currentUser._id);
    const isConnection = currentUser.connections.some((connection) =>
      connection._id.equals(post.userId._id)
    );
    if (!isOwner && !isConnection) {
      return res.status(403).json({ error: 'Access denied: User is not a connection' });
    }
    const fileName = post.image.split('/').pop();
    const signedUrl = await generateSignedUrl(fileName, 30);
    // const base64Image = post.image.toString('base64');
    res.status(200).json({ image: signedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getAllPosts2 = async (req, res) => {
  const getTimeDifference = (createdAt, updatedAt, now) => {
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    const isEdited = created !== updated;
    const diff = isEdited ? now - updated : now - created;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (years > 0) return `${isEdited ? "Reacted" : "Posted"} ${years} year${years > 1 ? "s" : ""} ago`;
    if (months > 0) return `${isEdited ? "Reacted" : "Posted"} ${months} month${months > 1 ? "s" : ""} ago`;
    if (weeks > 0) return `${isEdited ? "Reacted" : "Posted"} ${weeks} week${weeks > 1 ? "s" : ""} ago`;
    if (days > 0) return `${isEdited ? "Reacted" : "Posted"} ${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${isEdited ? "Reacted" : "Posted"} ${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${isEdited ? "Reacted" : "Posted"} ${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return `${isEdited ? "Reacted" : "Posted"} ${seconds} second${seconds > 1 ? "s" : ""} ago`;
  };
  const signedUrl = async (url) => {
    if (!url || typeof url !== 'string') return null;
    const fileName = url.split('/').pop();
    const URL = await generateSignedUrl(fileName, 120);
    return URL;
  };
  try {
    const now = Date.now();
    const user = await User.findById(req.currentUser._id)
      .populate({
        path: "connections",
        select: "posts username profilePicture firstName lastName",
        populate: {
          path: "posts",
          model: "Post",
          select: "caption createdAt updatedAt likedBy likeCount sizeMode image",
        },
      })
      .populate({
        path: "posts",
        select: "caption createdAt updatedAt likedBy likeCount sizeMode image",
      })
      .lean();
    // const resizeImage = (buffer) => buffer ? `data:image/jpeg;base64,${buffer.toString('base64')}` : null;
    const transformPost = async (post, username, name, profilePicture) => {
      const image = await signedUrl(post.image);
      const profileUrl = await signedUrl(profilePicture);
      return {
        postId: post._id,
        caption: post.caption || "",
        createdAt: post.createdAt,
        updatedAt: getTimeDifference(post.createdAt, post.updatedAt, now),
        username,
        name,
        liked: post.likedBy?.some(id => id.equals(req.currentUser._id)) || false,
        profilePicture: profileUrl,
        // profilePicture: resizeImage(profilePictureSmall),
        likeCount: post.likeCount || post.likedBy.length,
        sizeMode: post.sizeMode,
        image,
      };
    };
    const allPostsPromises = [
      ...user.posts.map(post => transformPost(post, user.username, `${user.firstName} ${user.lastName}`, user.profilePicture)),
      ...user.connections.flatMap(connection => 
        connection.posts.map(post => transformPost(post, connection.username, `${connection.firstName} ${connection.lastName}`, connection.profilePicture))
      )
    ];
    const allPosts = await Promise.all(allPostsPromises);
    // console.log("All Posts: ", allPosts);
    allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json(allPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
