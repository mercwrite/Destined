import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import type { ProfilePhoto } from "./PhotoGridItem";

export type ProfileCardData = {
  id: string;
  name: string | null;
  date_of_birth: string | null;
  bio: string | null;
  location_city: string | null;
  gender: string | null;
  destination: string | null;
  hobbies: string[] | null;
  relationship_type: string | null;
  photos: ProfilePhoto[];
};

type Props = {
  profile: ProfileCardData;
};

function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function ProfileCard({ profile }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  const drawerProgress = useSharedValue(0);

  const photos = profile.photos ?? [];
  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[photoIndex] : null;
  const age = computeAge(profile.date_of_birth);

  function handleLayout(e: LayoutChangeEvent) {
    setCardWidth(e.nativeEvent.layout.width);
  }

  function handleTapPhoto(e: any) {
    if (!cardWidth || photos.length <= 1) return;
    const x = e.nativeEvent.locationX;
    if (x < cardWidth / 2) {
      setPhotoIndex((i) => Math.max(0, i - 1));
    } else {
      setPhotoIndex((i) => Math.min(photos.length - 1, i + 1));
    }
  }

  function openInfo() {
    setInfoOpen(true);
    drawerProgress.value = withTiming(1, { duration: 260 });
  }

  function closeInfo() {
    drawerProgress.value = withTiming(0, { duration: 220 });
    setTimeout(() => setInfoOpen(false), 220);
  }

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - drawerProgress.value) * 600 }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: drawerProgress.value * 0.5,
  }));

  return (
    <View style={styles.card} onLayout={handleLayout}>
      {/* Photo */}
      <Pressable style={styles.photoArea} onPress={handleTapPhoto}>
        {currentPhoto ? (
          <Image
            source={{ uri: currentPhoto.url }}
            style={styles.photo}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="person" size={96} color="#C0C0C0" />
          </View>
        )}

        {/* Progress bars */}
        {photos.length > 1 && (
          <View style={styles.progressRow}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressBar,
                  i === photoIndex && styles.progressBarActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Bottom gradient-ish info bar */}
        <View style={styles.bottomInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name ?? "Unknown"}
              {age !== null && (
                <Text style={styles.age}>{`  ${age}`}</Text>
              )}
            </Text>
            <Pressable
              onPress={openInfo}
              hitSlop={10}
              style={styles.infoButton}
            >
              <Ionicons name="information-circle" size={32} color="#fff" />
            </Pressable>
          </View>
          {profile.location_city && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#fff" />
              <Text style={styles.location} numberOfLines={1}>
                {profile.location_city}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Info drawer */}
      {infoOpen && (
        <>
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeInfo} />
          </Animated.View>
          <Animated.View style={[styles.drawer, drawerStyle]}>
            <View style={styles.drawerHandle} />
            <ScrollView
              contentContainerStyle={styles.drawerContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.drawerHeaderRow}>
                <Text style={styles.drawerName}>
                  {profile.name ?? "Unknown"}
                  {age !== null && (
                    <Text style={styles.drawerAge}>{`, ${age}`}</Text>
                  )}
                </Text>
                <Pressable onPress={closeInfo} hitSlop={10}>
                  <Ionicons name="close" size={26} color="#1A1A1A" />
                </Pressable>
              </View>

              {profile.bio ? (
                <Section title="About">
                  <Text style={styles.bodyText}>{profile.bio}</Text>
                </Section>
              ) : null}

              {profile.destination ? (
                <Section title="Looking to go">
                  <Text style={styles.bodyText}>{profile.destination}</Text>
                </Section>
              ) : null}

              {profile.relationship_type ? (
                <Section title="Looking for">
                  <Pill label={profile.relationship_type} />
                </Section>
              ) : null}

              {profile.gender ? (
                <Section title="Gender">
                  <Pill label={profile.gender} />
                </Section>
              ) : null}

              {profile.hobbies && profile.hobbies.length > 0 ? (
                <Section title="Interests">
                  <View style={styles.pillWrap}>
                    {profile.hobbies.map((h) => (
                      <Pill key={h} label={h} />
                    ))}
                  </View>
                </Section>
              ) : null}
            </ScrollView>
          </Animated.View>
        </>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  photoArea: {
    flex: 1,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  progressBarActive: {
    backgroundColor: "#fff",
  },
  bottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    paddingTop: 40,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    flexShrink: 1,
  },
  age: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "400",
  },
  infoButton: {
    marginLeft: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  location: {
    color: "#fff",
    fontSize: 14,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  drawer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "80%",
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
  },
  drawerHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0D0D0",
    marginBottom: 6,
  },
  drawerContent: {
    padding: 20,
    paddingBottom: 40,
  },
  drawerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  drawerName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  drawerAge: {
    fontSize: 22,
    fontWeight: "400",
    color: "#1A1A1A",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9E9E9E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 15,
    color: "#1A1A1A",
    lineHeight: 22,
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    backgroundColor: "#E6F0FA",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  pillText: {
    color: "#4291db",
    fontSize: 14,
    fontWeight: "600",
  },
});
