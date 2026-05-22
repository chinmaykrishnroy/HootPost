import User from "../models/User.js";
import { includesId, idsEqual } from "../utils/objectId.js";

export const usersBlockedEachOther = (currentUser, targetUser) =>
  includesId(currentUser?.blockedUsers, targetUser?._id) ||
  includesId(targetUser?.blockedUsers, currentUser?._id);

export const isConnectedTo = (currentUser, targetUser) =>
  includesId(currentUser?.connections, targetUser?._id);

export const relationFlags = (currentUser, targetUser) => ({
  isSelf: idsEqual(currentUser?._id, targetUser?._id),
  isConnected: isConnectedTo(currentUser, targetUser),
  hasRequested: includesId(targetUser?.connectionRequests, currentUser?._id),
  isBlocked: includesId(currentUser?.blockedUsers, targetUser?._id),
  hasBlockedCurrentUser: includesId(targetUser?.blockedUsers, currentUser?._id),
});

export const assertVisibleUser = (currentUser, targetUser) => {
  if (!targetUser) return false;
  return !usersBlockedEachOther(currentUser, targetUser);
};

export const formatPublicUser = async (user, currentUser = null, { includePrivate = false, profileUrl = null } = {}) => {
  const flags = currentUser ? relationFlags(currentUser, user) : {};
  const accessible = includePrivate || flags.isSelf || flags.isConnected;
  return {
    _id: user._id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    sex: user.sex,
    bio: user.bio,
    joined: user.createdAt,
    profilePicture: profileUrl,
    isConnected: Boolean(flags.isConnected),
    isBlocked: Boolean(flags.hasBlockedCurrentUser),
    hasRequested: Boolean(flags.hasRequested),
    moreAccessible: Boolean(accessible),
  };
};

export const removeUserFromAllRelations = async (userId) =>
  User.updateMany(
    {},
    {
      $pull: {
        connections: userId,
        connectionRequests: userId,
        blockedUsers: userId,
      },
    }
  );
