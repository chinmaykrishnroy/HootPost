okat this is my react native project and I will be using this modal to appear when I click the dot buttons here:
import React, { useState, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated } from "react-native";
import { Image } from 'expo-image';
import { icons, images } from "../constants";

// Memoized helper function to calculate time difference
const getTimeDifference = (createdAt, updatedAt) => {
  const now = Date.now();
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

const PostTile = React.memo(
  ({
    post,
    background,
    title_color,
    caption_color,
    border,
    border_color,
    margin,
    tintColor = "",
  }) => {
    const [liked, setLiked] = useState(post.liked);
    const [showHeart, setShowHeart] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);

    const getImageSource = useCallback(() => {
      if (typeof post.image === "string") {
        if (post.image.startsWith("/9j")) {
          return `data:image/jpeg;base64,${post.image}`;
        } else if (post.image.startsWith("iVBORw0KG")) {
          return `data:image/png;base64,${post.image}`;
        } else if (post.image.startsWith("R0lGOD")) {
          return `data:image/gif;base64,${post.image}`;
        }
        return post.image;
      }
      return icons.rocket;
    }, [post.image]);

    const imageUri = useMemo(() => getImageSource(), [post.image]);
    const timeDifference = useMemo(() => getTimeDifference(post.createdAt, post.updatedAt), [post.createdAt, post.updatedAt]);

    const handleLikeUpdate = useCallback(async (action) => {
      const url = `${BASE_URL}/auth/posts/${post.postId}/${action}`;
      try {
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
        if (response.ok) {
          const data = await response.json();
          setLiked(action === 'like');
          setLikeCount(data.likes);
          console.log(action === 'like' ? "Post liked" : "Like removed");
        } else {
          const errorData = await response.json();
          console.error(errorData.error || "An error occurred");
        }
      } catch (error) {
        console.error(error);
      }
    }, [post.postId]);

    const handleDoubleTap = useCallback(() => {
      const now = Date.now();
      if (lastTap && now - lastTap < 300) {
        handleLikeUpdate('like');
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
      }
      setLastTap(now);
    }, [lastTap, liked, handleLikeUpdate]);

    return (
      <View
        className={`p-0.5 ${background || "bg-white"} rounded-xl border-2 ${border || "border-2"} ${border_color || "border-primary-300"} ${margin || "mx-0.5"} mb-0.5 shadow-lg`}
      >
        <View className="flex-row items-center mb-2">
        <Image 
          source={post.profilePicture && post.profilePicture.startsWith("data:image/") 
            ? { uri: post.profilePicture }
            : images.owl
          } 
          className="w-10 h-10 rounded-lg mr-3" 
        />
          <Text className={`${title_color || "text-black-200"} text-3xl font-spotifymixuititle pt-0`}>
          {`@${post.username}` || "@username"}
          </Text>
          <TouchableOpacity onPress={() => console.log("More options pressed")} className="ml-auto pt-1">
            <Image source={icons.dots} className="w-7 h-7" contentFit="contain" style={{ tintColor }} />
          </TouchableOpacity>
        </View>

        {post.image && (
          <TouchableWithoutFeedback onPress={handleDoubleTap}>
            <View className="mb-2 overflow-hidden relative">
              <Image
                source={{ uri: imageUri }}
                style={{ aspectRatio: post.image.startsWith("R0lGOD") ? 1 : 1 }}
                className="w-full rounded-xl"
                contentFit="cover"
              />
              {showHeart && (
                <Animated.View className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center">
                  <Image
                    source={icons.heart}
                    className="w-24 h-24 opacity-60"
                    contentFit="contain"
                    style={{ tintColor: "red" }}
                  />
                </Animated.View>
              )}
            </View>
          </TouchableWithoutFeedback>
        )}

        <View className="flex-row justify-between items-center mb-1">
          <TouchableOpacity onPress={() => handleLikeUpdate(liked ? 'unlike' : 'like')} className="flex-row items-center">
            <Image
              source={icons.heart}
              className="w-7 h-7 ml-1"
              contentFit="contain"
              style={{ tintColor: liked ? "red" : "white" }}
            />
            <Text className="text-secondary-200 text-2xl font-spotifymixuititle px-2">
              {likeCount}
            </Text>
          </TouchableOpacity>
          <Text className="text-secondary-200 font-spotifymixuititle px-0.5">
            {timeDifference}
          </Text>
        </View>

        {post.caption && (
          <Text className={`${caption_color || "text-black-200"} font-spotifymixui text-lg ml-1`}>
            {post.caption}
          </Text>
        )}
      </View>
    );
  }
);

export default PostTile;

I don't want to put the complete modal here as 