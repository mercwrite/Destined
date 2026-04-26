// SwipeCard.tsx — destination-led profile card with gesture handling.
// Visual: destination hero badge, photo tap navigation, slide-up bio drawer.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './Text';
import { colors, gradients, radii, shadows, spacing } from '../theme';
import type { ProfileCardData } from './ProfileCard';

export type { ProfileCardData };

const SWIPE_THRESHOLD = 120;
const FLY_DURATION = 300;

export type SwipeCardRef = {
  swipeLeft: () => void;
  swipeRight: () => void;
};

// Backward-compat interface for prototype screens/SwipeScreen.tsx
export interface SwipeProfile {
  id: string;
  name: string;
  age: number;
  photo: string;
  location: string;
  destination: string;
  destinationVibe?: string;
  bio?: string;
  interests: string[];
}

type Props = {
  profile: ProfileCardData;
  onSwipe?: (direction: 'left' | 'right') => void;
  isTop?: boolean;
  stackIndex?: number;
  onPressDetails?: () => void;
};

function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = Math.min(screenWidth - spacing.edge * 2, 420);
const CARD_HEIGHT = CARD_WIDTH * 1.5;

const SwipeCard = forwardRef<SwipeCardRef, Props>(
  ({ profile, onSwipe = () => {}, isTop = false, stackIndex = 0 }, ref) => {
    const { width } = useWindowDimensions();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const onSwipeRef = useRef(onSwipe);
    useEffect(() => { onSwipeRef.current = onSwipe; }, [onSwipe]);

    const [photoIndex, setPhotoIndex] = useState(0);
    const [cardWidth, setCardWidth] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerProgress = useSharedValue(0);

    const photos = profile.photos ?? [];
    const currentPhoto = photos[photoIndex]?.url ?? null;
    const age = computeAge(profile.date_of_birth);
    const interests = profile.hobbies ?? [];

    // ── Layout ──────────────────────────────────────────────────────────────────

    function handleLayout(e: LayoutChangeEvent) {
      setCardWidth(e.nativeEvent.layout.width);
    }

    // ── Photo navigation ────────────────────────────────────────────────────────

    function handlePhotoTap(x: number) {
      if (photos.length <= 1 || drawerOpen) return;
      if (x < cardWidth / 2) {
        setPhotoIndex(i => Math.max(0, i - 1));
      } else {
        setPhotoIndex(i => Math.min(photos.length - 1, i + 1));
      }
    }

    // ── Bio drawer ──────────────────────────────────────────────────────────────

    function openDrawer() {
      setDrawerOpen(true);
      drawerProgress.value = withTiming(1, { duration: 260 });
    }

    function closeDrawer() {
      drawerProgress.value = withTiming(0, { duration: 220 }, () => {
        runOnJS(setDrawerOpen)(false);
      });
    }

    const drawerAnimStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: (1 - drawerProgress.value) * 480 }],
    }));

    const backdropAnimStyle = useAnimatedStyle(() => ({
      opacity: drawerProgress.value * 0.45,
    }));

    // ── Swipe gesture ───────────────────────────────────────────────────────────

    function flyOff(direction: 'left' | 'right') {
      'worklet';
      const target = direction === 'right' ? width * 1.5 : -width * 1.5;
      translateX.value = withTiming(target, { duration: FLY_DURATION }, () => {
        runOnJS(onSwipeRef.current)(direction);
      });
    }

    useImperativeHandle(ref, () => ({
      swipeLeft: () => runOnUI(flyOff)('left'),
      swipeRight: () => runOnUI(flyOff)('right'),
    }));

    const panGesture = Gesture.Pan()
      .enabled(isTop && !drawerOpen)
      .minDistance(6)
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY * 0.3;
      })
      .onEnd((e) => {
        if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
          flyOff(e.translationX > 0 ? 'right' : 'left');
        } else {
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      });

    // ── Animated styles ─────────────────────────────────────────────────────────

    const stackScale = 1 - stackIndex * 0.04;
    const stackOffsetY = stackIndex * 8;

    const cardStyle = useAnimatedStyle(() => {
      const rotate = interpolate(
        translateX.value,
        [-width / 2, 0, width / 2],
        [-12, 0, 12],
        Extrapolation.CLAMP
      );
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: isTop ? translateY.value : stackOffsetY },
          { rotate: isTop ? `${rotate}deg` : '0deg' },
          { scale: isTop ? 1 : stackScale },
        ],
      };
    });

    const likeOpacity = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [30, 100], [0, 1], Extrapolation.CLAMP),
    }));

    const nopeOpacity = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [-30, -100], [0, 1], Extrapolation.CLAMP),
    }));

    // ── Render ──────────────────────────────────────────────────────────────────

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
          <View style={[styles.card, shadows.lg]} onLayout={handleLayout}>

            {/* Tappable photo area */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={(e) => isTop && handlePhotoTap(e.nativeEvent.locationX)}
            >
              {currentPhoto ? (
                <Image source={{ uri: currentPhoto }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]} />
              )}
            </Pressable>

            {/* Destination badge */}
            {profile.destination ? (
              <View style={styles.destBadge} pointerEvents="none">
                <AppText variant="label" color={colors.white} style={{ opacity: 0.85, marginBottom: 2 }}>
                  ✈ Wants to go to
                </AppText>
                <AppText variant="h1" color={colors.white} style={styles.destText}>
                  {profile.destination}
                </AppText>
              </View>
            ) : null}

            {/* Photo progress bars */}
            {photos.length > 1 && (
              <View style={styles.progressRow} pointerEvents="none">
                {photos.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.progressBar, i === photoIndex && styles.progressBarActive]}
                  />
                ))}
              </View>
            )}

            {/* Bottom scrim */}
            <LinearGradient
              colors={gradients.cardScrim}
              style={styles.scrim}
              pointerEvents="none"
            />

            {/* Identity row + info button */}
            <View style={styles.identity} pointerEvents="box-none">
              <View style={styles.identityRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h2" color={colors.white}>
                    {profile.name ?? 'Unknown'}{age !== null ? `, ${age}` : ''}
                  </AppText>
                  {profile.location_city ? (
                    <AppText variant="bodySmall" color={colors.white} style={{ opacity: 0.85, marginTop: 2 }}>
                      {profile.location_city}
                    </AppText>
                  ) : null}
                </View>
                {isTop ? (
                  <Pressable onPress={openDrawer} hitSlop={16} style={styles.infoBtn}>
                    <AppText style={styles.infoBtnText}>ⓘ</AppText>
                  </Pressable>
                ) : null}
              </View>

              {interests.length > 0 ? (
                <View style={styles.chipRow}>
                  {interests.slice(0, 3).map((interest) => (
                    <View key={interest} style={styles.chipGlass}>
                      <AppText variant="caption" color={colors.white}>{interest}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* ── Bio drawer ─────────────────────────────────────────────────── */}
            {drawerOpen ? (
              <>
                <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimStyle]}>
                  <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
                </Animated.View>

                <Animated.View style={[styles.drawer, drawerAnimStyle]}>
                  <View style={styles.drawerHandle} />

                  <View style={styles.drawerHeader}>
                    <AppText variant="h2" color={colors.ink}>
                      {profile.name ?? 'Unknown'}{age !== null ? `, ${age}` : ''}
                    </AppText>
                    <Pressable onPress={closeDrawer} hitSlop={12} style={styles.drawerClose}>
                      <AppText style={{ fontSize: 18, color: colors.inkSoft }}>✕</AppText>
                    </Pressable>
                  </View>

                  <ScrollView
                    contentContainerStyle={styles.drawerContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {profile.bio ? (
                      <DrawerSection label="About">
                        <AppText variant="body" color={colors.ink} style={{ lineHeight: 22 }}>
                          {profile.bio}
                        </AppText>
                      </DrawerSection>
                    ) : null}

                    {profile.destination ? (
                      <DrawerSection label="Looking to go">
                        <AppText variant="bodyMedium" color={colors.accent}>
                          ✈ {profile.destination}
                        </AppText>
                      </DrawerSection>
                    ) : null}

                    {profile.relationship_type ? (
                      <DrawerSection label="Looking for">
                        <View style={styles.drawerChipRow}>
                          <View style={styles.drawerChip}>
                            <AppText variant="caption" color={colors.accentDeep}>
                              {profile.relationship_type}
                            </AppText>
                          </View>
                        </View>
                      </DrawerSection>
                    ) : null}

                    {interests.length > 0 ? (
                      <DrawerSection label="Interests">
                        <View style={styles.drawerChipRow}>
                          {interests.map(h => (
                            <View key={h} style={styles.drawerChip}>
                              <AppText variant="caption" color={colors.accentDeep}>{h}</AppText>
                            </View>
                          ))}
                        </View>
                      </DrawerSection>
                    ) : null}
                  </ScrollView>
                </Animated.View>
              </>
            ) : null}
          </View>

          {/* LIKE / NOPE overlays */}
          <Animated.View style={[styles.overlayLabel, styles.likeLabel, likeOpacity]} pointerEvents="none">
            <Animated.Text style={styles.likeLabelText}>LIKE</Animated.Text>
          </Animated.View>
          <Animated.View style={[styles.overlayLabel, styles.nopeLabel, nopeOpacity]} pointerEvents="none">
            <Animated.Text style={styles.nopeLabelText}>NOPE</Animated.Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  }
);

SwipeCard.displayName = 'SwipeCard';
export { SwipeCard };
export default SwipeCard;

// ── Drawer section helper ─────────────────────────────────────────────────────

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.drawerSection}>
      <AppText variant="label" color={colors.inkFaint} style={{ marginBottom: spacing.sm }}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  photoPlaceholder: {
    backgroundColor: colors.surfaceSoft,
  },
  destBadge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(26, 22, 18, 0.45)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  destText: {
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  progressRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  progressBarActive: {
    backgroundColor: colors.white,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
  identity: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginBottom: 2,
  },
  infoBtnText: {
    fontSize: 20,
    color: colors.white,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipGlass: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  // Drawer
  backdrop: {
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ruleStrong,
    marginBottom: spacing.sm,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  drawerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  drawerSection: {
    marginBottom: spacing.lg,
  },
  drawerChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  drawerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
  },
  // LIKE / NOPE overlays
  overlayLabel: {
    position: 'absolute',
    top: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: radii.sm,
  },
  likeLabel: {
    left: 20,
    borderColor: '#4ade80',
    transform: [{ rotate: '-15deg' }],
  },
  likeLabelText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 2,
  },
  nopeLabel: {
    right: 20,
    borderColor: colors.danger,
    transform: [{ rotate: '15deg' }],
  },
  nopeLabelText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 2,
  },
});
