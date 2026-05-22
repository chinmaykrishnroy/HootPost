import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, Pressable, Animated, ActivityIndicator, FlatList, Dimensions} from "react-native";
import { Image } from 'expo-image';
import { icons, images } from "../constants";
import BASE_URL from '../config.js';

const postImageWidth = Dimensions.get('window').width - 12;
const uploadPreviewWidth = Dimensions.get('window').width;
const MIN_POST_ASPECT = 0.5;
const MAX_POST_ASPECT = 2;

const clampPostAspect = (value) => Math.max(MIN_POST_ASPECT, Math.min(value || 1, MAX_POST_ASPECT));

const coverFrameForImage = (item, width, height) => {
  const sourceWidth = item.width || width;
  const sourceHeight = item.height || height;
  const coverScale = Math.max(width / sourceWidth, height / sourceHeight);
  return {
    width: sourceWidth * coverScale,
    height: sourceHeight * coverScale,
  };
};

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
    showOptions = true,
  }) => {
    const [liked, setLiked] = useState(post.liked);
    const [showHeart, setShowHeart] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);

    useEffect(() => {
      setLiked(post.liked);
      setLikeCount(post.likeCount || 0);
    }, [post]);

    const normalizeImageSource = useCallback((image) => {
      if (!image) return null;
      if (image.startsWith("https://") || image.startsWith("http://")) return image;
      if (typeof image === "string") {
        if (image.startsWith("/9j")) return `data:image/jpeg;base64,${image}`;
        if (image.startsWith("iVBORw0KG")) return `data:image/png;base64,${image}`;
        if (image.startsWith("R0lGOD")) return `data:image/gif;base64,${image}`;
        return image;
      }
      return null;
    }, []);

    const profilePictureSource = useMemo(() => {
      const profilePicture = post.profilePicture || post.profileUrl || post.profilePictureThumb;
      if (typeof profilePicture === "string" && profilePicture.length > 0) {
        return { uri: profilePicture };
      }
      return images.owl;
    }, [post.profilePicture, post.profilePictureThumb, post.profileUrl]);

    const mediaItems = useMemo(() => {
      if (post.media?.length) {
        return post.media.map((item, index) => ({
          url: normalizeImageSource(item.url),
          aspectRatio: item.aspectRatio || 1,
          width: item.width || null,
          height: item.height || null,
          frameMode: item.frameMode || 'square',
          crop: item.crop || { x: 0, y: 0, scale: 1 },
          key: `${post.postId}-${index}`,
        })).filter((item) => item.url);
      }
      const image = normalizeImageSource(post.image);
      return image ? [{ url: image, aspectRatio: post.sizeMode ? parseInt(post.sizeMode[1]) / parseInt(post.sizeMode[0]) : 1, width: null, height: null, frameMode: 'square', crop: { x: 0, y: 0, scale: 1 }, key: `${post.postId}-0` }] : [];
    }, [normalizeImageSource, post.image, post.media, post.postId, post.sizeMode]);

    const carouselAspectRatio = useMemo(
      () => clampPostAspect(mediaItems[activeMediaIndex]?.aspectRatio || mediaItems[0]?.aspectRatio || 1),
      [activeMediaIndex, mediaItems]
    );
    const carouselHeight = postImageWidth / carouselAspectRatio;

    useEffect(() => {
      setActiveMediaIndex(0);
      setHasError(false);
      setIsLoading(mediaItems.length > 0);
      if (mediaItems[0]?.url) {
        Image.prefetch(mediaItems[0].url, 'memory-disk').catch(() => {});
      }
    }, [mediaItems]);

    const visibleDotIndex = useCallback((index, total) => {
      if (total <= 5) return index;
      if (index === 0) return 0;
      if (index === 1) return 1;
      if (index === total - 2) return 3;
      if (index === total - 1) return 4;
      return 2;
    }, []);

    const carouselDots = useMemo(() => {
      const count = Math.min(mediaItems.length, 5);
      const activeDot = visibleDotIndex(activeMediaIndex, mediaItems.length);
      return Array.from({ length: count }, (_, index) => ({ index, active: index === activeDot }));
    }, [activeMediaIndex, mediaItems.length, visibleDotIndex]);

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
          source={profilePictureSource} 
          className="w-10 h-10 rounded-lg mr-3" 
          contentFit="cover"
        />
          <View className="flex-col">
            <Text className={`${title_color || "text-black-200"} text-xl font-spotifymixuititle`}>
              {post.name || "Unknown User"}
            </Text>
            <Text className={`${title_color || "text-black-200"} text-sm font-spotifymixui pt-0`}>
              {`@${post.username}` || "@username"}
            </Text>
          </View>
          {showOptions && onDotButtonPress && (
            <TouchableOpacity onPress={() => onDotButtonPress(post.postId)} className="ml-auto pt-1">
              <Image source={icons.dots} className="w-7 h-7" contentFit="contain" style={{ tintColor: "#f33eb7" }} />
            </TouchableOpacity>
          )}
        </View>

        {mediaItems.length > 0 && (
            <View
              className="mb-2 overflow-hidden relative rounded-xl"
              style={{ width: postImageWidth, height: carouselHeight }}
            >
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
              <FlatList
                data={mediaItems}
                horizontal
                pagingEnabled
                nestedScrollEnabled
                directionalLockEnabled
                disableIntervalMomentum
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                keyExtractor={(item) => item.key}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                windowSize={3}
                removeClippedSubviews
                getItemLayout={(_, index) => ({ length: postImageWidth, offset: postImageWidth * index, index })}
                onMomentumScrollEnd={(event) => {
                  setActiveMediaIndex(Math.round(event.nativeEvent.contentOffset.x / postImageWidth));
                }}
                renderItem={({ item, index }) => {
                  const frame = coverFrameForImage(item, postImageWidth, carouselHeight);
                  return (
                    <Pressable
                      onPress={handleDoubleTap}
                      style={{
                        width: postImageWidth,
                        height: carouselHeight,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={{ uri: item.url }}
                        style={{
                          width: frame.width,
                          height: frame.height,
                          display: hasError ? 'none' : 'flex',
                          transform: [
                            { translateX: (item.crop?.x || 0) * (postImageWidth / uploadPreviewWidth) },
                            { translateY: (item.crop?.y || 0) * (postImageWidth / uploadPreviewWidth) },
                            { scale: item.crop?.scale || 1 },
                          ],
                        }}
                        contentFit="cover"
                        priority={index === 0 ? 'high' : 'normal'}
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
                    </Pressable>
                  );
                }}
              />
              {hasError && (
                <Image 
                  source={icons.sad}
                  style={{ width: postImageWidth, height: carouselHeight }}
                  className="w-full rounded-lg" 
                />
              )}
              {mediaItems.length > 1 && (
                <View className="absolute bottom-3 left-0 right-0 flex-row justify-center items-center gap-1">
                  {carouselDots.map((dot) => (
                    <View
                      key={dot.index}
                      style={{
                        width: dot.active ? 16 : 6,
                        height: 6,
                        borderRadius: 4,
                        backgroundColor: dot.active ? '#f33eb7' : 'rgba(255,255,255,0.7)',
                      }}
                    />
                  ))}
                </View>
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
