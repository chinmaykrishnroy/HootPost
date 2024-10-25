import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated, ActivityIndicator} from "react-native";
import { Image } from 'expo-image';
import { icons, images } from "../constants";
import BASE_URL from '../config.js';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  return `${hours}:${minutes} - ${day} ${month} ${year}`;
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
    onDotButtonPress,
  }) => {
    const [liked, setLiked] = useState(post.liked);
    const [showHeart, setShowHeart] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      setLiked(post.liked);
      setLikeCount(post.likeCount || 0);
    }, [post]);

    const getImageSource = useCallback(() => {
      if (!post.image) { return null; }
      if (post.image.startsWith("https://")){
        return post.image;
      }
      if (post.image && typeof post.image === "string") {
        if (post.image.startsWith("/9j")) {
          return `data:image/jpeg;base64,${post.image}`;
        } else if (post.image.startsWith("iVBORw0KG")) {
          return `data:image/png;base64,${post.image}`;
        } else if (post.image.startsWith("R0lGOD")) {
          return `data:image/gif;base64,${post.image}`;
        }
        return post.image;
      }
      return null;
    }, [post.image]);
    

    const imageUri = useMemo(() => getImageSource(), [post.image]);

    const handleLikeUpdate = useCallback(async (action) => {
      const url = `${BASE_URL}/posts/${post.postId}/${action}`;
      try {
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
        if (response.ok) {
          const data = await response.json();
          setLiked(action === 'like');
          setLikeCount(data.likes);
        } else {
          const errorData = await response.json();
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
          source={post.profilePicture && post.profilePicture.startsWith("https://") 
            ? { uri: post.profilePicture } : post.profilePicture && post.profilePicture.startsWith("data:image/") 
            ? { uri: post.profilePicture }
            : images.owl
          } 
          className="w-10 h-10 rounded-lg mr-3" 
        />
          <View className="flex-col">
            <Text className={`${title_color || "text-black-200"} text-xl font-spotifymixuititle`}>
              {post.name || "Unknown User"}
            </Text>
            <Text className={`${title_color || "text-black-200"} text-sm font-spotifymixui pt-0`}>
              {`@${post.username}` || "@username"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onDotButtonPress(post.postId)} className="ml-auto pt-1">
            <Image source={icons.dots} className="w-7 h-7" contentFit="contain" style={{ tintColor: "#f33eb7" }} />
          </TouchableOpacity>
        </View>

        {post.image && (
          <TouchableWithoutFeedback onPress={handleDoubleTap}>
            <View className="mb-2 overflow-hidden relative" style={{ flex: 1 }}>
              {isLoading && !hasError && (
                <View style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, 
                  bottom: 0, justifyContent: 'center', alignItems: 'center' 
                }}>
                  <ActivityIndicator 
                    size="large" 
                    color="#f33eb7"
                  />
                </View>
              )}
              <Image
                source={{ uri: imageUri }}
                style={{ aspectRatio: post.sizeMode ? parseInt(post.sizeMode[1]) / parseInt(post.sizeMode[0]) : 1,  display: hasError ? 'none' : 'flex' }}
                className="w-full rounded-xl"
                contentFit="cover"
                onLoadStart={() => {
                  setIsLoading(true); 
                  setHasError(false);
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false); 
                  setHasError(true);
                }}
              />
              {hasError && (
                <Image 
                  source={icons.sad}
                  style={{ aspectRatio: post.sizeMode ? parseInt(post.sizeMode[1]) / parseInt(post.sizeMode[0]) : 1 }}
                  className="w-full rounded-lg" 
                />
              )}
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
            <Text className="text-primary-200 text-2xl font-spotifymixuititle px-2">
              {likeCount}
            </Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text className="text-secondary-300 font-spotifymixuititle text-xs px-0.5">
              {formatDate(post.createdAt) || "Recently Created"}
            </Text>
            <Text className="text-secondary-300 font-spotifymixui text-xs px-0.5">
              {post.updatedAt || ""}
            </Text>
          </View>
        </View>

        {post.caption && (
          <Text className={`${caption_color || "text-gray-200"} font-spotifymixui text-lg ml-1`}>
            {post.caption}
          </Text>
        )}
      </View>
    );
  }
);

export default PostTile;
