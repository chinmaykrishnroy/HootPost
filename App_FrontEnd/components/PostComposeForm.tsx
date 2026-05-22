import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { icons } from '@/constants';
import ModalActionButton from './ModalActionButton';

const previewWidth = Dimensions.get('window').width;
const THUMB_SIZE = 72;
const THUMB_GAP = 8;
const THUMB_STEP = THUMB_SIZE + THUMB_GAP;

const coverFrameForImage = (image: any, width: number, height: number) => {
  const sourceWidth = image?.width || width;
  const sourceHeight = image?.height || height;
  const coverScale = Math.max(width / sourceWidth, height / sourceHeight);
  return {
    width: sourceWidth * coverScale,
    height: sourceHeight * coverScale,
  };
};

const framedImageStyle = (image: any, width: number, height: number) => {
  const displayWidth = image.displayWidth || previewWidth;
  const displayHeight = image.displayHeight || displayWidth / (image.aspectRatio || 1);

  return {
    ...coverFrameForImage(image, width, height),
    transform: [
      { translateX: (image.crop?.x || 0) * (width / displayWidth) },
      { translateY: (image.crop?.y || 0) * (height / displayHeight) },
      { scale: image.crop?.scale || 1 },
    ],
  };
};

const imageKey = (item: any, index: number) => `${item.id || item.uri}-${index}`;

const DeleteChip = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    className="absolute right-3 top-3 w-9 h-9 rounded-full bg-white/80 items-center justify-center"
    style={{
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    }}
  >
    <Feather name="x" size={20} color="#d71920" />
  </TouchableOpacity>
);

const PostComposeForm = ({
  title,
  submitLabel,
  submittingLabel,
  initialImages = [],
  initialCaption = '',
  isSubmitting = false,
  successVisible = false,
  successTitle,
  successText,
  onSubmit,
  onBack,
  onSuccessHome,
  onSuccessClose,
}: any) => {
  const [images, setImages] = useState<any[]>(initialImages);
  const [caption, setCaption] = useState(initialCaption);
  const [activeIndex, setActiveIndex] = useState(0);
  const [captionOffset, setCaptionOffset] = useState(0);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const previewRef = useRef<FlatList>(null);
  const scrollRef = useRef<ScrollView>(null);
  const imagesRef = useRef<any[]>(initialImages || []);
  const dragX = useRef(new Animated.Value(0)).current;
  const dragStartIndexRef = useRef<number | null>(null);
  const draggingIndexRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setImages(initialImages || []);
    setActiveIndex(0);
  }, [initialImages]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    setCaption(initialCaption || '');
  }, [initialCaption]);

  const previewImage = useMemo(() => images[activeIndex] || images[0], [activeIndex, images]);
  const previewHeight = previewImage ? previewWidth / (previewImage.aspectRatio || 1) : previewWidth;

  const scrollPreviewTo = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(index, images.length - 1));
    setActiveIndex(nextIndex);
    previewRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  }, [images.length]);

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    const total = imagesRef.current.length;
    const from = Math.max(0, Math.min(fromIndex, total - 1));
    const to = Math.max(0, Math.min(toIndex, total - 1));
    if (from === to) return;
    setImages((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setTimeout(() => scrollPreviewTo(to), 0);
  }, [scrollPreviewTo]);

  const beginThumbnailDrag = (index: number) => {
    dragStartIndexRef.current = index;
    draggingIndexRef.current = index;
    hoverIndexRef.current = index;
    setDraggingIndex(index);
    setHoverIndex(index);
    dragX.setValue(0);
    scrollPreviewTo(index);
  };

  const finishThumbnailDrag = useCallback((dx = 0) => {
    const from = dragStartIndexRef.current;
    if (from !== null) {
      const target = Math.max(0, Math.min(imagesRef.current.length - 1, from + Math.round(dx / THUMB_STEP)));
      reorderImages(from, target);
    }
    dragX.setValue(0);
    dragStartIndexRef.current = null;
    draggingIndexRef.current = null;
    hoverIndexRef.current = null;
    setDraggingIndex(null);
    setHoverIndex(null);
  }, [dragX, reorderImages]);

  const thumbnailPanResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponderCapture: () => draggingIndexRef.current !== null,
      onMoveShouldSetPanResponder: () => draggingIndexRef.current !== null,
      onMoveShouldSetPanResponderCapture: () => draggingIndexRef.current !== null,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gestureState) => {
        const from = dragStartIndexRef.current;
        if (from !== null) {
          const target = Math.max(0, Math.min(imagesRef.current.length - 1, from + Math.round(gestureState.dx / THUMB_STEP)));
          if (target !== hoverIndexRef.current) {
            hoverIndexRef.current = target;
            setHoverIndex(target);
          }
        }
        dragX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => finishThumbnailDrag(gestureState.dx),
      onPanResponderTerminate: (_, gestureState) => finishThumbnailDrag(gestureState.dx),
      onShouldBlockNativeResponder: () => true,
    }),
    [dragX, finishThumbnailDrag]
  );

  const thumbnailShift = (index: number) => {
    if (draggingIndex === null || hoverIndex === null || index === draggingIndex) return 0;
    if (draggingIndex < hoverIndex && index > draggingIndex && index <= hoverIndex) return -THUMB_STEP;
    if (draggingIndex > hoverIndex && index >= hoverIndex && index < draggingIndex) return THUMB_STEP;
    return 0;
  };

  const removeImage = (index: number) => {
    if (images.length <= 1) {
      Alert.alert('Keep one photo', 'A post needs at least one photo.');
      return;
    }
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setTimeout(() => scrollPreviewTo(index >= images.length - 1 ? index - 1 : index), 0);
  };

  const scrollCaptionIntoView = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, captionOffset - 88), animated: true });
    }, 220);
  };

  const handleSubmit = () => {
    if (!images.length) {
      Alert.alert('Select photos', 'A post needs at least one photo.');
      return;
    }
    onSubmit(images, caption);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <View className="h-16 flex-row items-center justify-between px-4 border-b border-[#161616] bg-[#050505]">
        <TouchableOpacity onPress={onBack} className="w-10 h-10 items-center justify-center">
          <Image source={icons.leftArrow} className="w-6 h-6" style={{ tintColor: '#f33eb7' }} />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Image source={icons.upload} className="w-6 h-6 mr-2" style={{ tintColor: '#f33eb7' }} />
          <Text className="text-secondary-300 text-2xl font-spotifymixuititleextrabold">{title}</Text>
        </View>
        <TouchableOpacity
          disabled={isSubmitting || !images.length}
          onPress={handleSubmit}
          className={`h-10 px-3 rounded-md flex-row items-center ${isSubmitting || !images.length ? 'bg-gray-800' : 'bg-primary-200'}`}
        >
          <Image source={icons.plane} className="w-5 h-5 mr-1" style={{ tintColor: isSubmitting || !images.length ? '#eab7d9' : '#050505' }} />
          <Text className={`${isSubmitting || !images.length ? 'text-secondary-300' : 'text-black'} font-spotifymixuititleextrabold`}>
            {isSubmitting ? submittingLabel : submitLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: 36 }}
        >
          {previewImage && (
            <View className="bg-black overflow-hidden" style={{ width: previewWidth, height: previewHeight }}>
              <FlatList
                ref={previewRef}
                horizontal
                pagingEnabled
                data={images}
                keyExtractor={imageKey}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / previewWidth));
                }}
                getItemLayout={(_, index) => ({ length: previewWidth, offset: previewWidth * index, index })}
                renderItem={({ item, index }) => (
                  <View className="bg-black overflow-hidden items-center justify-center" style={{ width: previewWidth, height: previewHeight }}>
                    <Image
                      source={{ uri: item.previewUri || item.uri }}
                      style={framedImageStyle(item, previewWidth, previewHeight)}
                      resizeMode="cover"
                    />
                    <DeleteChip onPress={() => removeImage(index)} />
                  </View>
                )}
              />
              {images.length > 1 && (
                <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={{
                        width: index === activeIndex ? 16 : 6,
                        height: 6,
                        borderRadius: 4,
                        backgroundColor: index === activeIndex ? '#f33eb7' : 'rgba(255,255,255,0.65)',
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          <View className="bg-black border-b border-[#161616]">
            <View className="flex-row items-center justify-between px-3 pt-3">
              <Text className="text-gray-400 font-spotifymixuititle">Order</Text>
              <Text className="text-gray-500 font-spotifymixui">{images.length}/10</Text>
            </View>

            <FlatList
              horizontal
              data={images}
              keyExtractor={imageKey}
              contentContainerStyle={{ padding: 8, gap: 8 }}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={draggingIndex === null}
              renderItem={({ item, index }) => (
                <Animated.View
                  {...thumbnailPanResponder.panHandlers}
                  style={{
                    transform: draggingIndex === index
                      ? [{ translateX: dragX }]
                      : [{ translateX: thumbnailShift(index) }],
                    zIndex: draggingIndex === index ? 10 : 1,
                    opacity: draggingIndex !== null && draggingIndex !== index ? 0.72 : 1,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => scrollPreviewTo(index)}
                    onLongPress={() => beginThumbnailDrag(index)}
                    delayLongPress={220}
                    className="relative"
                    style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                  >
                    <Image
                      source={{ uri: item.previewUri || item.uri }}
                      style={{
                        width: THUMB_SIZE,
                        height: THUMB_SIZE,
                        borderRadius: 8,
                        borderWidth: activeIndex === index || draggingIndex === index ? 3 : 0,
                        borderColor: '#f33eb7',
                      }}
                      resizeMode="cover"
                    />
                    <View className="absolute top-1 left-1 bg-primary-200 rounded-full w-5 h-5 items-center justify-center">
                      <Text className="text-black text-xs font-spotifymixblack">{index + 1}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeImage(index)}
                      className="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-white/85 items-center justify-center"
                    >
                      <Feather name="x" size={14} color="#d71920" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Animated.View>
              )}
            />
          </View>

          <View
            className="p-4 border-t border-[#222]"
            onLayout={(event) => setCaptionOffset(event.nativeEvent.layout.y)}
          >
            <TextInput
              value={caption}
              onChangeText={setCaption}
              onFocus={scrollCaptionIntoView}
              placeholder="Write a caption..."
              placeholderTextColor="#777"
              multiline
              maxLength={150}
              textAlignVertical="top"
              className="text-secondary-300 text-lg font-spotifymixui min-h-28"
            />
            <Text className="text-gray-500 text-right font-spotifymixui">{caption.length}/150</Text>
          </View>

          <View className="px-4 pb-4">
            <Text className="text-gray-500 font-spotifymixuititle mb-2">Filters</Text>
            <View className="flex-row gap-2">
              {['Original', 'Soft', 'Mono', 'Warm'].map((filter) => (
                <View key={filter} className="px-3 py-2 rounded-md bg-[#151515] border border-[#2a2a2a]">
                  <Text className="text-secondary-300 font-spotifymixui">{filter}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {isSubmitting && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center">
          <ActivityIndicator color="#f33eb7" size="large" />
        </View>
      )}

      <Modal visible={successVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/75 items-center justify-center px-8">
          <View className="w-full bg-[#111] rounded-xl border border-[#333] p-5">
            <Text className="text-secondary-300 text-3xl font-spotifymixuititleextrabold mb-2">{successTitle}</Text>
            <Text className="text-gray-400 font-spotifymixui mb-6">{successText}</Text>
            <View className="flex-row gap-3">
              <ModalActionButton title="Home" onPress={onSuccessHome} />
              <ModalActionButton title="Close" onPress={onSuccessClose} variant="secondary" />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PostComposeForm;
