import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { icons } from '@/constants';

const PREPARED_UPLOAD_KEY = 'hootpost:prepared-upload';
const MAX_SELECTION = 10;
const MIN_DISPLAY_ASPECT = 0.5;
const MAX_DISPLAY_ASPECT = 2;
const screenWidth = Dimensions.get('window').width;
const previewWidth = screenWidth;
const ENABLE_SELECTION_HAPTICS = true;

const ASPECT_OPTIONS = [
  { key: 'original', label: 'Original' },
  { key: 'square', label: '1:1' },
  { key: '3:4', label: '3:4' },
  { key: '4:5', label: '4:5' },
  { key: '4:3', label: '4:3' },
  { key: '5:4', label: '5:4' },
];

const ASPECT_RATIO_BY_MODE: Record<string, number> = {
  square: 1,
  '3:4': 3 / 4,
  '4:5': 4 / 5,
  '4:3': 4 / 3,
  '5:4': 5 / 4,
};

const hapticSelection = () => {
  if (!ENABLE_SELECTION_HAPTICS) return;
  Haptics.selectionAsync().catch(() => {});
};

const springConfig = {
  damping: 22,
  stiffness: 240,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const clampWorklet = (value: number, min: number, max: number) => {
  'worklet';
  return Math.max(min, Math.min(value, max));
};

const resolveMediaAsset = async (asset: any) => {
  const id = asset?.id || asset?.assetId;
  let info: any = null;
  if (id || asset?.uri?.startsWith('ph://')) {
    info = await MediaLibrary.getAssetInfoAsync(id || asset, { shouldDownloadFromNetwork: true }).catch(() => null);
  }

  const resolvedUri = info?.localUri || asset?.uri || info?.uri;
  return {
    uri: resolvedUri,
    previewUri: resolvedUri,
    fileName: asset?.fileName || asset?.filename || info?.filename,
    mimeType: asset?.mimeType,
  };
};

const createGalleryItem = (asset: any) => {
  const uri = asset.uri;
  return {
    id: asset.id || asset.assetId || uri,
    assetId: asset.id || asset.assetId || null,
    uri,
    previewUri: uri,
    width: asset.width || 1,
    height: asset.height || 1,
    fileName: asset.fileName || asset.filename,
    mimeType: asset.mimeType,
  };
};

const displayAspectForItem = (item: any) => {
  if (!item) return 1;
  if (item.frameMode === 'original') {
    return clamp(item.width / item.height, MIN_DISPLAY_ASPECT, MAX_DISPLAY_ASPECT);
  }
  return ASPECT_RATIO_BY_MODE[item.frameMode] || 1;
};

const previewFrameForItem = (item: any) => {
  const aspect = displayAspectForItem(item);
  if (aspect >= 1) {
    return { width: previewWidth, height: previewWidth / aspect };
  }
  return { width: previewWidth * aspect, height: previewWidth };
};

const coverFrameForItem = (item: any, width: number, height: number) => {
  const sourceWidth = item?.width || width;
  const sourceHeight = item?.height || height;
  const coverScale = Math.max(width / sourceWidth, height / sourceHeight);
  return {
    width: sourceWidth * coverScale,
    height: sourceHeight * coverScale,
  };
};

const clampCrop = (item: any, crop: any) => {
  const previewFrame = previewFrameForItem(item);
  const scale = clamp(crop.scale || 1, 1, 4);
  const frame = coverFrameForItem(item, previewFrame.width, previewFrame.height);
  const imageWidth = frame.width * scale;
  const imageHeight = frame.height * scale;
  const maxX = Math.max(0, (imageWidth - previewFrame.width) / 2);
  const maxY = Math.max(0, (imageHeight - previewFrame.height) / 2);

  return {
    x: clamp(crop.x || 0, -maxX, maxX),
    y: clamp(crop.y || 0, -maxY, maxY),
    scale,
  };
};

const createUploadItem = async (asset: any, frameMode = 'square', source = 'recent') => {
  const resolved = await resolveMediaAsset(asset);
  const width = asset.width || 1;
  const height = asset.height || 1;
  return {
    id: asset.id || asset.assetId || resolved.uri,
    assetId: asset.id || asset.assetId || null,
    source,
    uri: resolved.uri,
    previewUri: resolved.previewUri || resolved.uri,
    fileName: resolved.fileName,
    mimeType: resolved.mimeType,
    width,
    height,
    frameMode,
    crop: { x: 0, y: 0, scale: 1 },
  };
};

const FramedPreview = ({ item, frameWidth, frameHeight, onCropChange }: any) => {
  const imageUri = item.uri || item.previewUri;
  const frame = useMemo(
    () => coverFrameForItem(item, frameWidth, frameHeight),
    [frameHeight, frameWidth, item]
  );
  const translateX = useSharedValue(item.crop?.x || 0);
  const translateY = useSharedValue(item.crop?.y || 0);
  const scale = useSharedValue(item.crop?.scale || 1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  useEffect(() => {
    const crop = clampCrop(item, item.crop || { x: 0, y: 0, scale: 1 });
    translateX.value = crop.x;
    translateY.value = crop.y;
    scale.value = crop.scale;
  }, [frame.height, frame.width, item, scale, translateX, translateY]);

  const commitCrop = useCallback((crop: any) => {
    onCropChange(clampCrop(item, crop));
  }, [item, onCropChange]);

  const panGesture = useMemo(() => Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxX = Math.max(0, (frame.width * scale.value - frameWidth) / 2);
      const maxY = Math.max(0, (frame.height * scale.value - frameHeight) / 2);
      translateX.value = clampWorklet(startX.value + event.translationX, -maxX, maxX);
      translateY.value = clampWorklet(startY.value + event.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      const nextCrop = {
        x: clampWorklet(translateX.value, -Math.max(0, (frame.width * scale.value - frameWidth) / 2), Math.max(0, (frame.width * scale.value - frameWidth) / 2)),
        y: clampWorklet(translateY.value, -Math.max(0, (frame.height * scale.value - frameHeight) / 2), Math.max(0, (frame.height * scale.value - frameHeight) / 2)),
        scale: scale.value,
      };
      translateX.value = withSpring(nextCrop.x, springConfig);
      translateY.value = withSpring(nextCrop.y, springConfig);
      runOnJS(commitCrop)(nextCrop);
    }), [commitCrop, frame.height, frame.width, frameHeight, frameWidth, scale, startX, startY, translateX, translateY]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clampWorklet(startScale.value * event.scale, 1, 4);
      const maxX = Math.max(0, (frame.width * nextScale - frameWidth) / 2);
      const maxY = Math.max(0, (frame.height * nextScale - frameHeight) / 2);
      scale.value = nextScale;
      translateX.value = clampWorklet(translateX.value, -maxX, maxX);
      translateY.value = clampWorklet(translateY.value, -maxY, maxY);
    })
    .onEnd(() => {
      const maxX = Math.max(0, (frame.width * scale.value - frameWidth) / 2);
      const maxY = Math.max(0, (frame.height * scale.value - frameHeight) / 2);
      const nextCrop = {
        x: clampWorklet(translateX.value, -maxX, maxX),
        y: clampWorklet(translateY.value, -maxY, maxY),
        scale: scale.value,
      };
      translateX.value = withSpring(nextCrop.x, springConfig);
      translateY.value = withSpring(nextCrop.y, springConfig);
      runOnJS(commitCrop)(nextCrop);
    }), [commitCrop, frame.height, frame.width, frameHeight, frameWidth, scale, startScale, translateX, translateY]);

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture),
    [panGesture, pinchGesture]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        style={{ width: frameWidth, height: frameHeight, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View
          style={[{ width: frame.width, height: frame.height }, animatedStyle]}
        >
          <ExpoImage
            source={{ uri: imageUri }}
            style={{ width: frame.width, height: frame.height }}
            contentFit="cover"
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

const Upload = () => {
  const navigation = useNavigation();
  const [recentImages, setRecentImages] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [page, setPage] = useState(1);
  const [defaultFrameMode, setDefaultFrameMode] = useState('square');
  const [isPreparing, setIsPreparing] = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const didAutoSelect = useRef(false);
  const selectedItemsRef = useRef<any[]>([]);
  const defaultFrameModeRef = useRef(defaultFrameMode);

  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  useEffect(() => {
    defaultFrameModeRef.current = defaultFrameMode;
  }, [defaultFrameMode]);

  const activeItem = useMemo(
    () => selectedItems.find((item) => item.id === activeId) || selectedItems[0],
    [activeId, selectedItems]
  );

  const setActivePatch = useCallback((patch: any) => {
    if (!activeItem) return;
    setSelectedItems((items) =>
      items.map((item) => item.id === activeItem.id ? { ...item, ...patch } : item)
    );
  }, [activeItem]);

  const chooseSingle = useCallback(async (asset: any) => {
    const item = await createUploadItem(asset, defaultFrameMode, 'recent');
    setSelectedItems([item]);
    setActiveId(item.id);
    setMultiMode(false);
  }, [defaultFrameMode]);

  const toggleMulti = useCallback(async (asset: any) => {
    const exists = selectedItems.find((item) => item.id === asset.id);
    if (exists) {
      const next = selectedItems.filter((item) => item.id !== asset.id);
      setSelectedItems(next);
      setActiveId(next[0]?.id || null);
      setMultiMode(next.length > 1);
      hapticSelection();
      return;
    }
    if (selectedItems.length >= MAX_SELECTION) {
      Alert.alert('Limit reached', `You can add up to ${MAX_SELECTION} photos in one post.`);
      return;
    }
    const item = await createUploadItem(asset, defaultFrameMode, 'recent');
    setSelectedItems((items) => [...items, item]);
    setActiveId(item.id);
    setMultiMode(true);
    hapticSelection();
  }, [defaultFrameMode, selectedItems]);

  const handleAssetPress = useCallback(async (asset: any) => {
    if (multiMode) {
      const selected = selectedItems.find((item) => item.id === asset.id);
      if (selected) setActiveId(selected.id);
      return;
    }

    const selected = selectedItems.find((item) => item.id === asset.id);
    if (selected) {
      setActiveId(selected.id);
      return;
    }

    await chooseSingle(asset);
  }, [chooseSingle, multiMode, selectedItems]);

  const handleAssetLongPress = useCallback(async (asset: any) => {
    setMultiMode(true);
    await toggleMulti(asset);
  }, [toggleMulti]);

  const reconcileSelectedItems = useCallback(async (assets: any[], deletedIds = new Set<string>()) => {
    const currentSelection = selectedItemsRef.current;
    if (!currentSelection.length) return;

    const currentAssetIds = new Set(assets.map((asset) => asset.assetId || asset.id).filter(Boolean));
    const keep: any[] = [];

    for (const item of currentSelection) {
      if (item.source !== 'recent' || !item.assetId) {
        keep.push(item);
        continue;
      }

      if (deletedIds.has(item.assetId)) continue;
      if (currentAssetIds.has(item.assetId)) {
        keep.push(item);
        continue;
      }

      const info = await MediaLibrary.getAssetInfoAsync(item.assetId).catch(() => null);
      if (info?.id || info?.uri || info?.localUri) keep.push(item);
    }

    if (keep.length === currentSelection.length) return;

    if (keep.length) {
      setSelectedItems(keep);
      setActiveId((current) => keep.some((item) => item.id === current) ? current : keep[0].id);
      setMultiMode(keep.length > 1);
      return;
    }

    if (assets.length) {
      const fallback = await createUploadItem(assets[0], defaultFrameModeRef.current, 'recent');
      setSelectedItems([fallback]);
      setActiveId(fallback.id);
      setMultiMode(false);
      return;
    }

    setSelectedItems([]);
    setActiveId(null);
    setMultiMode(false);
  }, []);

  const loadRecentImages = useCallback(async (deletedIds = new Set<string>()) => {
    setIsLoadingMedia(true);
    setMediaError(null);
    try {
      const media = await MediaLibrary.getAssetsAsync({
        first: 28 * page,
        mediaType: ['photo'],
        sortBy: ['creationTime'],
      });
      const assets = media.assets.map(createGalleryItem);
      setRecentImages(assets);
      if (!didAutoSelect.current && assets.length) {
        didAutoSelect.current = true;
        const firstItem = await createUploadItem(assets[0], defaultFrameMode, 'recent');
        setSelectedItems((current) => current.length ? current : [firstItem]);
        setActiveId((current) => current || firstItem.id);
      }
      await reconcileSelectedItems(assets, deletedIds);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Could not load photos.');
    } finally {
      setIsLoadingMedia(false);
    }
  }, [defaultFrameMode, page, reconcileSelectedItems]);

  useEffect(() => {
    (async () => {
      try {
        const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo'] as any);
        if (permission.status === 'granted') {
          await loadRecentImages();
        } else {
          setMediaError('Photo permission is required to create a post.');
          setIsLoadingMedia(false);
        }
      } catch (error) {
        setMediaError(error instanceof Error ? error.message : 'Could not request photo permission.');
        setIsLoadingMedia(false);
      }
    })();
  }, [loadRecentImages]);

  useEffect(() => {
    const subscription = MediaLibrary.addListener((event) => {
      const deletedIds = new Set((event.deletedAssets || []).map((asset) => asset.id));
      loadRecentImages(deletedIds);
    });
    return () => subscription.remove();
  }, [loadRecentImages, reconcileSelectedItems]);

  const reloadGallery = useCallback(async () => {
    let permission;
    try {
      permission = await MediaLibrary.requestPermissionsAsync(false, ['photo'] as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not request photo permission.';
      setMediaError(message);
      Alert.alert('Gallery error', message);
      return;
    }
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to create a post.');
      return;
    }
    setPage(1);
    setIsLoadingMedia(true);
    setMediaError(null);
    try {
      const media = await MediaLibrary.getAssetsAsync({
        first: 28,
        mediaType: ['photo'],
        sortBy: ['creationTime'],
      });
      const assets = media.assets.map(createGalleryItem);
      setRecentImages(assets);
      if (!selectedItems.length && assets.length) {
        const firstItem = await createUploadItem(assets[0], defaultFrameMode, 'recent');
        setSelectedItems([firstItem]);
        setActiveId(firstItem.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load photos.';
      setMediaError(message);
      Alert.alert('Gallery error', message);
    } finally {
      setIsLoadingMedia(false);
    }
  }, [defaultFrameMode, selectedItems.length]);

  const openSystemLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_SELECTION,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled) return;
    const items = await Promise.all(result.assets.slice(0, MAX_SELECTION).map((asset) => createUploadItem(asset, defaultFrameMode, 'picker')));
    setSelectedItems(items);
    setActiveId(items[0]?.id || null);
    setMultiMode(items.length > 1);
    if (items.length) hapticSelection();
  }, [defaultFrameMode]);

  const setAspectMode = useCallback((mode: string) => {
    if (!activeItem) return;
    const next = {
      ...activeItem,
      frameMode: mode,
      crop: clampCrop({ ...activeItem, frameMode: mode }, activeItem.crop || { x: 0, y: 0, scale: 1 }),
    };
    setActivePatch({
      frameMode: next.frameMode,
      crop: next.crop,
    });
    setDefaultFrameMode(mode);
  }, [activeItem, setActivePatch]);

  const cycleAspectMode = useCallback(() => {
    const currentMode = activeItem?.frameMode || defaultFrameMode;
    const currentIndex = ASPECT_OPTIONS.findIndex((option) => option.key === currentMode);
    const nextMode = ASPECT_OPTIONS[(currentIndex + 1) % ASPECT_OPTIONS.length].key;
    if (activeItem) {
      setAspectMode(nextMode);
    } else {
      setDefaultFrameMode(nextMode);
    }
  }, [activeItem, defaultFrameMode, setAspectMode]);

  const rotateActiveItem = useCallback(async () => {
    if (!activeItem || rotatingId) return;
    setRotatingId(activeItem.id);
    try {
      const result = await manipulateAsync(
        activeItem.uri,
        [{ rotate: 90 }],
        { compress: 1, format: SaveFormat.JPEG }
      );
      setActivePatch({
        uri: result.uri,
        previewUri: result.uri,
        fileName: `rotated_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        width: result.width,
        height: result.height,
        crop: { x: 0, y: 0, scale: 1 },
      });
    } catch (error) {
      Alert.alert('Rotate failed', error instanceof Error ? error.message : 'Could not rotate this photo.');
    } finally {
      setRotatingId(null);
    }
  }, [activeItem, rotatingId, setActivePatch]);

  const preparePost = useCallback(async () => {
    if (!selectedItems.length) {
      Alert.alert('Select photos', 'Choose at least one photo to continue.');
      return;
    }

    setIsPreparing(true);
    try {
      const preparedImages = selectedItems.map((item) => {
        const displayFrame = previewFrameForItem(item);
        return {
          uri: item.uri,
          width: item.width,
          height: item.height,
          aspectRatio: displayAspectForItem(item),
          frameMode: item.frameMode,
          crop: clampCrop(item, item.crop || { x: 0, y: 0, scale: 1 }),
          displayWidth: displayFrame.width,
          displayHeight: displayFrame.height,
          previewUri: item.previewUri || item.uri,
          fileName: item.fileName,
          mimeType: item.mimeType,
        };
      });
      await AsyncStorage.setItem(PREPARED_UPLOAD_KEY, JSON.stringify({ images: preparedImages }));
      router.push('/upload-compose');
    } catch (error) {
      Alert.alert('Could not continue', error instanceof Error ? error.message : 'Could not prepare selected photos.');
    } finally {
      setIsPreparing(false);
    }
  }, [selectedItems]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View className="flex-row items-center">
          <Image source={icons.upload} className="w-6 h-6 mr-4" style={{ tintColor: '#f33eb7' }} />
          <Text className="text-secondary text-2xl font-spotifymixuititle">New Post</Text>
        </View>
      ),
      headerStyle: { backgroundColor: '#050505' },
      headerRight: () => (
        <TouchableOpacity disabled={isPreparing} onPress={preparePost} className="mr-4">
          <Text className="text-primary-200 text-2xl font-spotifymixuititleextrabold">
            {isPreparing ? '...' : 'Next'}
          </Text>
        </TouchableOpacity>
      ),
      headerLeft: () => null,
    });
  }, [isPreparing, navigation, preparePost]);

  const selectionOrder = (id: string) => selectedItems.findIndex((item) => item.id === id) + 1;
  const activePreviewFrame = previewFrameForItem(activeItem);
  const updateActiveCrop = useCallback((crop: any) => {
    setActivePatch({ crop });
  }, [setActivePatch]);

  return (
    <GestureHandlerRootView className="flex-1 bg-black">
      <View className="flex-1 bg-[#050505]">
        <View style={{ width: previewWidth, height: previewWidth }} className="bg-black items-center justify-center overflow-hidden">
          {activeItem ? (
            <View style={{ width: previewWidth, height: previewWidth }} className="items-center justify-center">
              <View
                className="items-center justify-center overflow-hidden bg-black"
                style={{ width: activePreviewFrame.width, height: activePreviewFrame.height }}
              >
                <FramedPreview
                  item={activeItem}
                  frameWidth={activePreviewFrame.width}
                  frameHeight={activePreviewFrame.height}
                  onCropChange={updateActiveCrop}
                />
              </View>
              <View className="absolute left-3 top-3 bg-black/55 rounded-full px-3 py-1">
                <Text className="text-secondary-300 font-spotifymixui">
                  {ASPECT_OPTIONS.find((option) => option.key === activeItem.frameMode)?.label || '1:1'}
                </Text>
              </View>
              {selectedItems.length > 1 && (
                <View className="absolute right-3 top-3 bg-primary-200 rounded-full px-3 py-1">
                  <Text className="text-black font-spotifymixblack">{selectedItems.length} selected</Text>
                </View>
              )}
            </View>
          ) : (
            <Text className="text-primary-200 font-spotifymixui">Select a photo</Text>
          )}
        </View>

        <View className="bg-black px-3 py-2">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={openSystemLibrary} className="flex-row items-center">
              <Image source={icons.upload} className="w-5 h-5 mr-2" style={{ tintColor: '#f33eb7' }} />
              <Text className="text-primary-200 font-spotifymixuititle text-xl">Library</Text>
            </TouchableOpacity>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={rotateActiveItem}
                disabled={!activeItem || rotatingId === activeItem?.id}
                className="px-3 py-1 rounded-md flex-row items-center bg-gray-800"
              >
                <Feather name="rotate-cw" size={16} color="#eab7d9" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={cycleAspectMode}
                disabled={!activeItem}
                className="px-3 py-1 rounded-md flex-row items-center bg-gray-800"
              >
                <Text className="text-secondary-300 font-spotifymixuititle">
                  {ASPECT_OPTIONS.find((option) => option.key === (activeItem?.frameMode || defaultFrameMode))?.label || '1:1'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {mediaError && !recentImages.length ? (
          <View className="flex-1 items-center justify-center px-6 bg-[#111]">
            <Text className="text-secondary-300 text-center font-spotifymixui mb-4">{mediaError}</Text>
            <TouchableOpacity onPress={reloadGallery} className="bg-primary-200 px-4 py-3 rounded-md">
              <Text className="text-black font-spotifymixuititle">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : isLoadingMedia && !recentImages.length ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#f33eb7" />
          </View>
        ) : (
          <FlatList
            data={recentImages}
            keyExtractor={(item) => item.id}
            numColumns={4}
            onEndReached={() => setPage((value) => value + 1)}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingBottom: 88, backgroundColor: '#111' }}
            renderItem={({ item }) => {
              const order = selectionOrder(item.id);
              return (
                <TouchableOpacity
                  onPress={() => handleAssetPress(item)}
                  onLongPress={() => handleAssetLongPress(item)}
                  delayLongPress={220}
                >
                  <View>
                    <ExpoImage
                      source={{ uri: item.uri }}
                      style={{
                        width: screenWidth / 4 - 4,
                        height: screenWidth / 4 - 4,
                        margin: 2,
                        borderRadius: 6,
                        borderWidth: activeItem?.id === item.id ? 3 : 0,
                        borderColor: '#f33eb7',
                      }}
                      contentFit="cover"
                    />
                    {order > 0 && (
                      <View className="absolute top-2 right-2 bg-primary-200 rounded-full items-center justify-center" style={{ width: 24, height: 24 }}>
                        <Text className="text-black font-spotifymixblack text-xs">{order}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
};

export default Upload;
