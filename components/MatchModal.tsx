import { useEffect } from "react";
import { Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, gradients, radii, shadows, spacing } from "@/theme";
import type { ProfileCardData } from "@/components/ProfileCard";

type Props = {
  matchedProfile: ProfileCardData;
  currentUserProfile: ProfileCardData | null;
  onKeepSwiping: () => void;
};

const PHOTO_SIZE = 130;

export default function MatchModal({ matchedProfile, currentUserProfile, onKeepSwiping }: Props) {
  const router = useRouter();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 320 });
    scale.value = withSpring(1, { damping: 18, stiffness: 200 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const myPhoto = currentUserProfile?.photos[0]?.url ?? null;
  const theirPhoto = matchedProfile.photos[0]?.url ?? null;
  const theirName = matchedProfile.name ?? "your match";
  const destination = matchedProfile.destination ?? "somewhere amazing";

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, containerStyle]}>
        <LinearGradient colors={gradients.sunrise} style={StyleSheet.absoluteFill} />

        <Animated.View style={[styles.content, contentStyle]}>
          <AppText variant="label" color={colors.accent} style={{ marginBottom: spacing.md }}>
            ✦ It's a match
          </AppText>

          <AppText variant="display" color={colors.ink} align="center">
            {"You're both\n"}
            <AppText variant="displayItalic" color={colors.accent}>
              going to {destination}.
            </AppText>
          </AppText>

          <View style={styles.photoRow}>
            <Image
              source={myPhoto ? { uri: myPhoto } : undefined}
              style={[styles.photo, styles.photoLeft, shadows.md]}
            />
            <Image
              source={theirPhoto ? { uri: theirPhoto } : undefined}
              style={[styles.photo, styles.photoRight, shadows.md]}
            />
            <View style={styles.heart}>
              <AppText style={{ fontSize: 24, color: colors.white }}>♥</AppText>
            </View>
          </View>

          <AppText
            variant="body"
            color={colors.inkSoft}
            align="center"
            style={{ marginBottom: spacing.xxl, maxWidth: 300 }}
          >
            Plan the trip together. Start with a message.
          </AppText>

          <View style={styles.actions}>
            <Button
              label={`Message ${theirName}`}
              variant="primary"
              onPress={() => {
                onKeepSwiping();
                router.push("/(tabs)/matches" as never);
              }}
            />
            <View style={{ height: spacing.sm }} />
            <Button label="Keep swiping" variant="ghost" onPress={onKeepSwiping} />
          </View>
        </Animated.View>

        <Pressable onPress={onKeepSwiping} style={styles.closeBtn} hitSlop={12}>
          <AppText style={{ fontSize: 18, color: colors.inkSoft }}>✕</AppText>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.edge,
  },
  photoRow: {
    flexDirection: "row",
    marginVertical: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radii.lg,
    borderWidth: 4,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceSoft,
  },
  photoLeft: { transform: [{ rotate: "-6deg" }, { translateX: 16 }] },
  photoRight: { transform: [{ rotate: "6deg" }, { translateX: -16 }] },
  heart: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.accent,
  },
  actions: { width: "100%", maxWidth: 320 },
  closeBtn: {
    position: "absolute",
    top: 56,
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
