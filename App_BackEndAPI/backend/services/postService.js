import Post from "../models/Post.js";
import User from "../models/User.js";
import { includesId } from "../utils/objectId.js";
import { pageFromItems } from "../utils/pagination.js";
import { signMediaUrl } from "./mediaService.js";

const timeAgo = (createdAt, updatedAt, now = Date.now()) => {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  const isEdited = created !== updated;
  const diff = now - (isEdited ? updated : created);
  const units = [
    ["year", 365 * 24 * 60 * 60],
    ["month", 30 * 24 * 60 * 60],
    ["week", 7 * 24 * 60 * 60],
    ["day", 24 * 60 * 60],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const seconds = Math.max(1, Math.floor(diff / 1000));
  const [unit, size] = units.find(([, unitSeconds]) => seconds >= unitSeconds) || units.at(-1);
  const value = Math.floor(seconds / size);
  return `${isEdited ? "Reacted" : "Posted"} ${value} ${unit}${value > 1 ? "s" : ""} ago`;
};

const legacyMedia = (post) => {
  const key = post.imageKey || post.image;
  return key ? [{ key, type: "image", order: 0 }] : [];
};

const sortedMedia = (post) =>
  [...(post.media?.length ? post.media : legacyMedia(post))]
    .sort((a, b) => (a.order || 0) - (b.order || 0));

const SORT_USER_POSTS_NEWEST_FIRST = true;

export const serializePost = async (post, owner, currentUserId, { signedUrlTtl = 120 } = {}) => {
  const media = await Promise.all(sortedMedia(post).map(async (item, index) => ({
    id: item._id?.toString?.() || String(index),
    type: item.type || "image",
    url: await signMediaUrl(item.key, signedUrlTtl),
    width: item.width || null,
    height: item.height || null,
    aspectRatio: item.aspectRatio || null,
    frameMode: item.frameMode || "square",
    crop: item.crop || { x: 0, y: 0, scale: 1 },
    order: item.order ?? index,
  })));

  return {
    postId: post._id,
    caption: post.caption || "",
    createdAt: post.createdAt,
    updatedAt: timeAgo(post.createdAt, post.updatedAt),
    username: owner.username,
    name: `${owner.firstName || ""} ${owner.lastName || ""}`.trim(),
    liked: includesId(post.likedBy || [], currentUserId),
    profilePicture: await signMediaUrl(owner.profilePictureThumb || owner.profilePicture, signedUrlTtl),
    likeCount: post.likeCount || post.likedBy?.length || 0,
    archived: !!post.archived,
    sizeMode: post.sizeMode,
    media,
    image: media[0]?.url || null,
  };
};

export const loadFeedPosts = async ({ currentUserId, before = null, limit = 30 } = {}) => {
  const user = await User.findById(currentUserId)
    .select("connections")
    .lean();

  const ownerIds = [currentUserId, ...(user?.connections || [])];
  const query = { userId: { $in: ownerIds }, archived: { $ne: true } };
  if (before) query.createdAt = { $lt: before };

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("userId", "username firstName lastName profilePicture profilePictureThumb")
    .lean();

  const page = pageFromItems(posts, limit);
  const items = await Promise.all(
    page.items.map((post) => serializePost(post, post.userId, currentUserId))
  );

  return { ...page, items };
};

export const loadUserPostTiles = async (user) =>
  Promise.all((user.posts || [])
    .filter((post) => !post.archived)
    .sort((a, b) => SORT_USER_POSTS_NEWEST_FIRST
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(async (post) => {
      const media = await Promise.all(sortedMedia(post).map(async (item, index) => ({
        id: item._id?.toString?.() || String(index),
        type: item.type || "image",
        url: await signMediaUrl(item.key, 120),
        width: item.width || null,
        height: item.height || null,
        aspectRatio: item.aspectRatio || null,
        frameMode: item.frameMode || "original",
        crop: item.crop || { x: 0, y: 0, scale: 1 },
        order: item.order ?? index,
      })));
      return {
        postId: post._id,
        caption: post.caption || "",
        createdAt: post.createdAt,
        updatedAt: timeAgo(post.createdAt, post.updatedAt || post.createdAt),
        liked: includesId(post.likedBy || [], user._id),
        likeCount: post.likeCount || post.likedBy?.length || 0,
        archived: !!post.archived,
        image: media[0]?.url || await signMediaUrl(post.imageKey || post.image, 120),
        media,
      };
    }));

export const assertPostOwner = (post, userId) =>
  post?.userId?.toString?.() === userId?.toString?.();

export const deleteUserPosts = async (userId) => Post.deleteMany({ userId });
