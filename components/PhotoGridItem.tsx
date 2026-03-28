import { StyleSheet, TouchableOpacity, Alert, View, Platform, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, SharedValue } from "react-native-reanimated";

export type ProfilePhoto = {
  id: string;
  profile_id: string;
  url: string;
  display_order: number;
  impressions: number;
  swipe_left: number;
  swipe_right: number;
};

type Props = {
  photo: ProfilePhoto | null;
  cellSize: number;
  onAdd: () => void;
  onDelete: (photo: ProfilePhoto) => void;
  isBeingDragged?: boolean;
  translateX?: SharedValue<number>;
  translateY?: SharedValue<number>;
};

function confirmDeletePhoto(photo: ProfilePhoto, onDelete: (p: ProfilePhoto) => void) {
  if (Platform.OS === "web") {
    const ok = window.confirm(
      "Are you sure you want to delete this photo? All statistics will be lost."
    );
    if (ok) onDelete(photo);
  } else {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo? All statistics will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(photo) },
      ]
    );
  }
}

export default function PhotoGridItem({
  photo,
  cellSize,
  onAdd,
  onDelete,
  isBeingDragged,
  translateX,
  translateY,
}: Props) {
  const cellHeight = (cellSize * 4) / 3;

  const animatedStyle = useAnimatedStyle(() => {
    if (!isBeingDragged || !translateX || !translateY) {
      return {};
    }
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: 1.05 },
      ],
      zIndex: 100,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
    };
  });

  if (!photo) {
    return (
      <TouchableOpacity
        style={[styles.emptySlot, { width: cellSize, height: cellHeight }]}
        onPress={onAdd}
        activeOpacity={0.6}
      >
        <Ionicons name="add" size={32} color="#C0C0C0" />
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View
      style={[
        styles.occupiedSlot,
        { width: cellSize, height: cellHeight },
        animatedStyle,
      ]}
    >
      <Image
        source={{ uri: photo.url }}
        style={styles.photo}
        contentFit="cover"
      />
      <Pressable
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation?.();
          confirmDeletePhoto(photo, onDelete);
        }}
        hitSlop={10}
      >
        <View style={styles.deleteCircle}>
          <Ionicons name="close" size={14} color="#fff" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  emptySlot: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D0D0D0",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  occupiedSlot: {
    borderRadius: 10,
    overflow: "visible",
    backgroundColor: "#E0E0E0",
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  deleteButton: {
    position: "absolute",
    top: -6,
    right: -6,
    zIndex: 10,
    cursor: "pointer" as any,
  },
  deleteCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
