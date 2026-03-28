import { useState, useCallback, useRef } from "react";
import { View, StyleSheet, LayoutChangeEvent, Platform, Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import PhotoGridItem, { type ProfilePhoto } from "./PhotoGridItem";

const GRID_GAP = 6;
const COLUMNS = 3;
const TOTAL_SLOTS = 9;
const MAX_GRID_WIDTH = 360;

type Props = {
  photos: ProfilePhoto[];
  onAddPhoto: (slotIndex: number) => void;
  onDeletePhoto: (photo: ProfilePhoto) => void;
  onReorder: (reorderedPhotos: ProfilePhoto[]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
};

export default function PhotoGrid({
  photos,
  onAddPhoto,
  onDeletePhoto,
  onReorder,
  onDragStart,
  onDragEnd,
  disabled,
}: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const effectiveWidth = containerWidth > 0 ? Math.min(containerWidth, MAX_GRID_WIDTH) : 0;
  const cellSize = effectiveWidth > 0 ? (effectiveWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const cellHeight = (cellSize * 4) / 3;

  const photosRef = useRef(photos);
  photosRef.current = photos;

  function handleLayout(e: LayoutChangeEvent) {
    setContainerWidth(e.nativeEvent.layout.width);
  }

  // ── Shared drag state (native) ─────────────────────────────────────────

  const dragIndex = useSharedValue(-1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // ── Web drag state ─────────────────────────────────────────────────────

  const [webDragFrom, setWebDragFrom] = useState<number | null>(null);
  const [webDragPos, setWebDragPos] = useState<{ x: number; y: number } | null>(null);
  const webGridRef = useRef<View>(null);
  const webGridOrigin = useRef({ x: 0, y: 0 });

  function getSlotFromPixel(x: number, y: number): number {
    const col = Math.min(COLUMNS - 1, Math.max(0, Math.floor(x / (cellSize + GRID_GAP))));
    const row = Math.min(2, Math.max(0, Math.floor(y / (cellHeight + GRID_GAP))));
    return row * COLUMNS + col;
  }

  const finishDrag = useCallback(
    (fromSlot: number, toSlot: number) => {
      const current = [...photosRef.current];
      if (
        fromSlot < 0 || toSlot < 0 ||
        fromSlot >= current.length || toSlot >= current.length ||
        fromSlot === toSlot
      ) {
        onDragEnd?.();
        return;
      }
      const temp = current[fromSlot];
      current[fromSlot] = current[toSlot];
      current[toSlot] = temp;
      const reordered = current.map((p, i) => ({ ...p, display_order: i }));
      onReorder(reordered);
      onDragEnd?.();
    },
    [onReorder, onDragEnd]
  );

  const triggerDragStart = useCallback(() => { onDragStart?.(); }, [onDragStart]);

  // ── Web mouse handlers ─────────────────────────────────────────────────

  const webLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webIsMouseDown = useRef(false);

  function handleWebMouseDown(index: number, e: any) {
    if (disabled || index >= photos.length) return;
    webIsMouseDown.current = true;

    // Measure grid position for coordinate mapping
    if (webGridRef.current && (webGridRef.current as any).getBoundingClientRect) {
      const rect = (webGridRef.current as any).getBoundingClientRect();
      webGridOrigin.current = { x: rect.left, y: rect.top };
    }

    // Start long press timer (300ms like native)
    webLongPressTimer.current = setTimeout(() => {
      if (!webIsMouseDown.current) return;
      setWebDragFrom(index);
      onDragStart?.();
    }, 300);
  }

  function handleWebMouseMove(e: any) {
    if (webDragFrom === null) return;
    const nativeEvent = e.nativeEvent || e;
    setWebDragPos({
      x: nativeEvent.clientX - webGridOrigin.current.x,
      y: nativeEvent.clientY - webGridOrigin.current.y,
    });
  }

  function handleWebMouseUp() {
    webIsMouseDown.current = false;
    if (webLongPressTimer.current) {
      clearTimeout(webLongPressTimer.current);
      webLongPressTimer.current = null;
    }
    if (webDragFrom !== null && webDragPos) {
      const toSlot = getSlotFromPixel(webDragPos.x, webDragPos.y);
      finishDrag(webDragFrom, toSlot);
    } else {
      onDragEnd?.();
    }
    setWebDragFrom(null);
    setWebDragPos(null);
  }

  // ── Build slots ────────────────────────────────────────────────────────

  if (cellSize === 0) {
    return <View style={styles.gridOuter} onLayout={handleLayout} />;
  }

  const isWeb = Platform.OS === "web";
  const slots = [];

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const photo = i < photos.length ? photos[i] : null;

    if (photo && !disabled && !isWeb) {
      // ── Native: gesture-handler drag ──
      const gesture = Gesture.Pan()
        .activateAfterLongPress(300)
        .onStart(() => {
          dragIndex.value = i;
          const col = i % COLUMNS;
          const row = Math.floor(i / COLUMNS);
          startX.value = col * (cellSize + GRID_GAP) + cellSize / 2;
          startY.value = row * (cellHeight + GRID_GAP) + cellHeight / 2;
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(triggerDragStart)();
        })
        .onUpdate((e) => {
          translateX.value = e.translationX;
          translateY.value = e.translationY;
        })
        .onEnd((e) => {
          const fromSlot = dragIndex.value;
          const dropX = startX.value + e.translationX;
          const dropY = startY.value + e.translationY;
          const col = Math.min(COLUMNS - 1, Math.max(0, Math.floor(dropX / (cellSize + GRID_GAP))));
          const row = Math.min(2, Math.max(0, Math.floor(dropY / (cellHeight + GRID_GAP))));
          const toSlot = row * COLUMNS + col;
          translateX.value = withSpring(0, { damping: 20 });
          translateY.value = withSpring(0, { damping: 20 });
          dragIndex.value = -1;
          runOnJS(finishDrag)(fromSlot, toSlot);
        })
        .onFinalize(() => {
          translateX.value = withSpring(0, { damping: 20 });
          translateY.value = withSpring(0, { damping: 20 });
          dragIndex.value = -1;
        });

      slots.push(
        <GestureDetector gesture={gesture} key={photo.id}>
          <Animated.View>
            <PhotoGridItem
              photo={photo}
              cellSize={cellSize}
              onAdd={() => onAddPhoto(i)}
              onDelete={onDeletePhoto}
              isBeingDragged={dragIndex.value === i}
              translateX={translateX}
              translateY={translateY}
            />
          </Animated.View>
        </GestureDetector>
      );
    } else if (photo && !disabled && isWeb) {
      // ── Web: mouse-based drag ──
      const isDragHighlight = webDragFrom !== null && webDragPos !== null &&
        getSlotFromPixel(webDragPos.x, webDragPos.y) === i && webDragFrom !== i;
      const isBeingDraggedWeb = webDragFrom === i;

      slots.push(
        <View
          key={photo.id}
          onMouseDown={(e: any) => handleWebMouseDown(i, e)}
          style={[
            isBeingDraggedWeb && styles.webDragging,
            isDragHighlight && styles.webDropTarget,
          ] as any}
        >
          <PhotoGridItem
            photo={photo}
            cellSize={cellSize}
            onAdd={() => onAddPhoto(i)}
            onDelete={onDeletePhoto}
          />
        </View>
      );
    } else {
      slots.push(
        <PhotoGridItem
          key={`empty-${i}`}
          photo={photo}
          cellSize={cellSize}
          onAdd={() => onAddPhoto(i)}
          onDelete={onDeletePhoto}
        />
      );
    }
  }

  const gridInner = (
    <View style={[styles.grid, { maxWidth: MAX_GRID_WIDTH }]}>
      {slots}
    </View>
  );

  if (isWeb) {
    return (
      <View
        style={styles.gridOuter}
        onLayout={handleLayout}
        ref={webGridRef as any}
        onMouseMove={handleWebMouseMove as any}
        onMouseUp={handleWebMouseUp as any}
        onMouseLeave={handleWebMouseUp as any}
      >
        {gridInner}
      </View>
    );
  }

  return (
    <View style={styles.gridOuter} onLayout={handleLayout}>
      {gridInner}
    </View>
  );
}

const styles = StyleSheet.create({
  gridOuter: {
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  webDragging: {
    opacity: 0.5,
  },
  webDropTarget: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4291db",
  },
});
