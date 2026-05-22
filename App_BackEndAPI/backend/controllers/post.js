import Post from "../models/Post.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { includesId } from "../utils/objectId.js";
import { pageFromItems, parsePagination } from "../utils/pagination.js";
import { deleteMedia, processPostImage, signMediaUrl, uploadImage } from "../services/mediaService.js";
import { assertPostOwner, loadFeedPosts, serializePost } from "../services/postService.js";

const findOwnedPost = async (postId, userId) => {
  const post = await Post.findById(postId);
  if (!post) throw notFound("Post not found.");
  if (!assertPostOwner(post, userId)) throw forbidden("You are not allowed to modify this post.");
  return post;
};

export const getAllPosts = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const page = await loadFeedPosts({
    currentUserId: req.currentUser._id,
    before: pagination.before,
    limit: pagination.limit,
  });
  res.status(200).json(pagination.paginated ? page : page.items);
});

export const getAllPosts2 = getAllPosts;

export const getUserPosts = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const query = { userId: req.currentUser._id, archived: { $ne: true } };
  if (pagination.before) query.createdAt = { $lt: pagination.before };
  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(pagination.limit + 1)
    .lean();

  const page = pageFromItems(posts, pagination.limit);
  const items = await Promise.all(page.items.map((post) => serializePost(post, req.currentUser, req.currentUser._id)));
  res.status(200).json(pagination.paginated ? { ...page, items } : items);
});

const mediaField = (body, index, field) =>
  body.media?.[index]?.[field] ?? body[`media[${index}][${field}]`];

const mediaCropField = (body, index, field) =>
  body.media?.[index]?.crop?.[field] ?? body[`media[${index}][crop][${field}]`];

const frameModes = new Set(["original", "square", "3:4", "4:5", "4:3", "5:4"]);

const frameModeFor = (value) => frameModes.has(value) ? value : "original";

const cropFor = (value = {}) => ({
  x: Number(value.x) || 0,
  y: Number(value.y) || 0,
  scale: Number(value.scale) || 1,
});

export const createPost = asyncHandler(async (req, res) => {
  const files = req.files?.length ? req.files : (req.file ? [req.file] : []);
  if (!files.length) throw badRequest("At least one image is required.");

  const media = await Promise.all(files.slice(0, 10).map(async (file, index) => {
    const processedImage = await processPostImage(file);
    const key = await uploadImage({
      file,
      buffer: processedImage.buffer,
      keyPrefix: "posts",
      ownerId: req.currentUser._id,
      contentType: processedImage.contentType,
      extension: processedImage.extension,
    });
    return {
      key,
      type: "image",
      width: Number(mediaField(req.body, index, "width")) || undefined,
      height: Number(mediaField(req.body, index, "height")) || undefined,
      aspectRatio: Number(mediaField(req.body, index, "aspectRatio")) || undefined,
      frameMode: frameModeFor(mediaField(req.body, index, "frameMode")),
      crop: {
        x: Number(mediaCropField(req.body, index, "x")) || 0,
        y: Number(mediaCropField(req.body, index, "y")) || 0,
        scale: Number(mediaCropField(req.body, index, "scale")) || 1,
      },
      order: index,
    };
  }));

  const post = await Post.create({
    userId: req.currentUser._id,
    image: media[0].key,
    imageKey: media[0].key,
    media,
    caption: String(req.body.caption || "").trim(),
    sizeMode: req.body.sizeMode || null,
  });

  req.currentUser.posts.addToSet(post._id);
  await req.currentUser.save();

  res.status(201).json({
    message: "Post created successfully.",
    postId: post._id,
    post: await serializePost(post, req.currentUser, req.currentUser._id),
  });
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await findOwnedPost(req.params.postId, req.currentUser._id);
  const keys = post.media?.length
    ? post.media.map((item) => item.key)
    : [post.imageKey || post.image];
  await Promise.all(keys.filter(Boolean).map((key) => deleteMedia(key)));
  req.currentUser.posts.pull(post._id);
  await Promise.all([
    req.currentUser.save(),
    Post.deleteOne({ _id: post._id }),
  ]);

  res.status(200).json({ success: "Post deleted successfully." });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await findOwnedPost(req.params.postId, req.currentUser._id);
  if (req.body.caption !== undefined) post.caption = String(req.body.caption).trim();
  if (req.body.sizeMode !== undefined) post.sizeMode = req.body.sizeMode || null;

  if (Array.isArray(req.body.media)) {
    if (!req.body.media.length) throw badRequest("A post must keep at least one image.");

    const mediaById = new Map((post.media || []).map((item) => [item._id.toString(), item]));
    const nextMedia = req.body.media.map((incoming, index) => {
      const current = mediaById.get(String(incoming.id || incoming._id || ""));
      if (!current) throw badRequest("One or more media items could not be found.");

      return {
        _id: current._id,
        key: current.key,
        type: current.type || "image",
        width: Number(incoming.width) || current.width,
        height: Number(incoming.height) || current.height,
        aspectRatio: Number(incoming.aspectRatio) || current.aspectRatio,
        frameMode: frameModeFor(incoming.frameMode || current.frameMode),
        crop: cropFor(incoming.crop || current.crop),
        order: index,
      };
    });

    const keptIds = new Set(nextMedia.map((item) => item._id.toString()));
    const removedKeys = (post.media || [])
      .filter((item) => !keptIds.has(item._id.toString()))
      .map((item) => item.key);

    await Promise.all(removedKeys.filter(Boolean).map((key) => deleteMedia(key)));
    post.media = nextMedia;
    post.image = nextMedia[0].key;
    post.imageKey = nextMedia[0].key;
  }

  await post.save();

  res.status(200).json({
    success: "Post updated successfully.",
    post: await serializePost(post, req.currentUser, req.currentUser._id),
  });
});

export const archivePost = asyncHandler(async (req, res) => {
  const post = await findOwnedPost(req.params.postId, req.currentUser._id);
  post.archived = true;
  await post.save();
  res.status(200).json({ success: "Post archived.", postId: post._id });
});

export const unarchivePost = asyncHandler(async (req, res) => {
  const post = await findOwnedPost(req.params.postId, req.currentUser._id);
  post.archived = false;
  await post.save();
  res.status(200).json({ success: "Post unarchived.", postId: post._id });
});

export const likePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) throw notFound("Post not found.");
  if (includesId(post.likedBy, req.currentUser._id)) {
    throw badRequest("You have already liked this post.");
  }

  post.likedBy.addToSet(req.currentUser._id);
  post.likeCount = post.likedBy.length;
  await post.save();
  res.status(200).json({ success: "Post liked.", likes: post.likeCount });
});

export const unlikePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) throw notFound("Post not found.");
  if (!includesId(post.likedBy, req.currentUser._id)) {
    throw badRequest("You have not liked this post.");
  }

  post.likedBy.pull(req.currentUser._id);
  post.likeCount = post.likedBy.length;
  await post.save();
  res.status(200).json({ success: "Post unliked.", likes: post.likeCount });
});

export const downloadPost = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.currentUser._id).select("connections");
  const post = await Post.findById(req.params.postId).populate("userId", "username");
  if (!post) throw notFound("Post not found.");

  const ownerId = post.userId?._id || post.userId;
  const isOwner = ownerId.equals(currentUser._id);
  const isConnection = currentUser.connections.some((connectionId) => connectionId.equals(ownerId));
  if (!isOwner && !isConnection) throw forbidden("You are not allowed to download this post.");

  const keys = post.media?.length
    ? post.media.sort((a, b) => (a.order || 0) - (b.order || 0)).map((item) => item.key)
    : [post.imageKey || post.image];
  const images = await Promise.all(keys.filter(Boolean).map((key) => signMediaUrl(key, 30)));
  res.status(200).json({ image: images[0] || null, images });
});
