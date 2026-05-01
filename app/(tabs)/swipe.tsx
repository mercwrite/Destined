import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/app/_layout';
import { supabase } from '@/utils/supabase';
import { useSwipeQueue } from '@/hooks/useSwipeQueue';
import SwipeStack from '@/components/SwipeStack';
import MatchModal from '@/components/MatchModal';
import { ActionBar } from '@/components/ActionBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText } from '@/components/Text';
import { Button } from '@/components/Button';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import type { SwipeCardRef } from '@/components/SwipeCard';
import type { ProfileCardData } from '@/components/ProfileCard';

const HOT_DESTINATIONS = ['Lisbon', 'Tokyo', 'Mexico City', 'Joshua Tree'];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SwipeScreen() {
  const { session } = useAuth();
  const {
    currentProfile,
    nextProfiles,
    isLoading,
    isEmpty,
    error,
    matchedProfile,
    recordSwipe,
    clearMatch,
    retry,
  } = useSwipeQueue();

  const topCardRef = useRef<SwipeCardRef | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileCardData | null>(null);

  // Web-only: user settings for filters panel
  const [filterSettings, setFilterSettings] = useState<{
    distance: number; ageMin: number; ageMax: number; genders: string[];
  }>({ distance: 25, ageMin: 22, ageMax: 35, genders: [] });

  // Web-only: recent match photos for right panel
  const [recentMatchPhotos, setRecentMatchPhotos] = useState<string[]>([]);

  // Fetch current user's own profile (for MatchModal)
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    supabase
      .from('profiles')
      .select(
        'id, name, date_of_birth, bio, location_city, gender, destination, hobbies, relationship_type, profile_photos (id, profile_id, url, display_order, impressions, swipe_left, swipe_right)'
      )
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          const photos = ((data as any).profile_photos ?? [])
            .slice()
            .sort((a: any, b: any) => a.display_order - b.display_order);
          setCurrentUserProfile({ ...(data as any), photos });
        }
      });
  }, [session?.user?.id]);

  // Fetch web sidebar data
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const userId = session?.user?.id;
    if (!userId) return;

    // User settings for filters panel
    supabase
      .from('user_settings')
      .select('preferred_distance_km, preferred_age_min, preferred_age_max, preferred_genders')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setFilterSettings({
            distance: (data as any).preferred_distance_km ?? 25,
            ageMin: (data as any).preferred_age_min ?? 22,
            ageMax: (data as any).preferred_age_max ?? 35,
            genders: (data as any).preferred_genders ?? [],
          });
        }
      });

    // Recent matches for right panel
    supabase
      .from('matches')
      .select('user1_id, user2_id, profiles!matches_user2_id_fkey(profile_photos(url, display_order))')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) {
          const photos = (data as any[])
            .map((m) => {
              const profilePhotos = m.profiles?.profile_photos ?? [];
              const sorted = [...profilePhotos].sort((a: any, b: any) => a.display_order - b.display_order);
              return sorted[0]?.url ?? null;
            })
            .filter(Boolean);
          setRecentMatchPhotos(photos);
        }
      });
  }, [session?.user?.id]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(
          direction === 'right'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light
        );
      }
      await recordSwipe(direction);
    },
    [recordSwipe]
  );

  function handleButtonSwipe(direction: 'left' | 'right') {
    if (direction === 'left') {
      topCardRef.current?.swipeLeft();
    } else {
      topCardRef.current?.swipeRight();
    }
  }

  const allProfiles = currentProfile ? [currentProfile, ...nextProfiles] : [];

  // ── Web layout ──────────────────────────────────────────────────────────────

  if (Platform.OS === 'web') {
    return (
      <GestureHandlerRootView style={webStyles.root}>
        <ScrollView contentContainerStyle={webStyles.scroll} showsVerticalScrollIndicator={false}>
          <View style={webStyles.grid}>

            {/* ── Left sidebar ── */}
            <View style={webStyles.sidebar}>
              <View style={webStyles.panel}>
                <AppText variant="label" color={colors.inkSoft} style={webStyles.panelTitle}>
                  Filters
                </AppText>
                <FilterRow label="Distance" value={`${filterSettings.distance} mi`} />
                <FilterRow
                  label="Age"
                  value={`${filterSettings.ageMin}–${filterSettings.ageMax}`}
                />
                <FilterRow
                  label="Looking for"
                  value={
                    filterSettings.genders.length > 0
                      ? filterSettings.genders.join(', ')
                      : 'Long-term, Short-term'
                  }
                  last
                />
              </View>

              <View style={[webStyles.panel, { marginTop: spacing.md }]}>
                <AppText variant="label" color={colors.accent} style={webStyles.panelTitle}>
                  ✦ Today's hot destinations
                </AppText>
                {HOT_DESTINATIONS.map((dest, i) => (
                  <View
                    key={dest}
                    style={[
                      webStyles.destRow,
                      i < HOT_DESTINATIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.rule },
                    ]}
                  >
                    <AppText variant="body" color={colors.ink}>{dest}</AppText>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Center ── */}
            <View style={webStyles.center}>
              <ScreenHeader
                eyebrow="Today's stack"
                title="Discover"
                trailing={
                  <Pressable style={webStyles.filterBtn}>
                    <AppText style={{ fontSize: 16, color: colors.inkSoft }}>⚙</AppText>
                  </Pressable>
                }
              />

              <View style={webStyles.cardArea}>
                {isLoading ? (
                  <View style={webStyles.centerState}>
                    <ActivityIndicator size="large" color={colors.accent} />
                  </View>
                ) : error ? (
                  <View style={webStyles.centerState}>
                    <AppText style={{ fontSize: 40 }}>☁</AppText>
                    <AppText variant="h3" color={colors.ink} align="center" style={{ marginTop: spacing.md }}>
                      Something went wrong
                    </AppText>
                    <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginTop: spacing.sm }}>
                      {error}
                    </AppText>
                    <View style={{ marginTop: spacing.lg, width: 160 }}>
                      <Button label="Try again" variant="primary" onPress={retry} />
                    </View>
                  </View>
                ) : isEmpty ? (
                  <View style={webStyles.centerState}>
                    <AppText style={{ fontSize: 40 }}>✈</AppText>
                    <AppText variant="h2" color={colors.ink} align="center" style={{ marginTop: spacing.md }}>
                      You're all caught up.
                    </AppText>
                    <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginTop: spacing.sm }}>
                      New profiles arrive every morning.
                    </AppText>
                    <View style={{ marginTop: spacing.lg, width: 160 }}>
                      <Button label="Refresh" variant="secondary" onPress={retry} />
                    </View>
                  </View>
                ) : (
                  <SwipeStack
                    profiles={allProfiles}
                    onSwipe={handleSwipe}
                    cardRef={topCardRef}
                  />
                )}
              </View>

              <ActionBar
                onUndo={() => {}}
                onNope={() => handleButtonSwipe('left')}
                onLike={() => handleButtonSwipe('right')}
                onStar={() => handleButtonSwipe('right')}
              />
            </View>

            {/* ── Right sidebar ── */}
            <View style={webStyles.sidebar}>
              <View style={webStyles.panel}>
                <AppText variant="label" color={colors.inkSoft} style={webStyles.panelTitle}>
                  Recent matches
                </AppText>
                {recentMatchPhotos.length > 0 ? (
                  <View style={webStyles.matchPhotos}>
                    {recentMatchPhotos.map((uri, i) => (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={webStyles.matchPhoto}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                ) : (
                  <AppText variant="bodySmall" color={colors.inkFaint}>
                    Your matches will appear here.
                  </AppText>
                )}
              </View>

              <View style={[webStyles.panel, { marginTop: spacing.md }]}>
                <AppText variant="label" color={colors.inkSoft} style={webStyles.panelTitle}>
                  Tip
                </AppText>
                <AppText variant="body" color={colors.ink} style={{ lineHeight: 22 }}>
                  Profiles with a destination get{' '}
                  <AppText variant="bodyMedium" color={colors.accent}>
                    2.4× more right swipes
                  </AppText>
                  .
                </AppText>
              </View>
            </View>

          </View>
        </ScrollView>

        {matchedProfile && (
          <MatchModal
            matchedProfile={matchedProfile}
            currentUserProfile={currentUserProfile}
            onKeepSwiping={clearMatch}
          />
        )}
      </GestureHandlerRootView>
    );
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────

  return (
    <View style={mobileStyles.root}>
      <SafeAreaView style={mobileStyles.safe}>
        <ScreenHeader
          eyebrow="Today's stack"
          title="Discover"
          trailing={
            <Pressable style={mobileStyles.filterBtn}>
              <AppText style={{ fontSize: 16, color: colors.inkSoft }}>⚙</AppText>
            </Pressable>
          }
        />

        {isLoading ? (
          <View style={mobileStyles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : error ? (
          <View style={mobileStyles.centered}>
            <AppText style={{ fontSize: 48 }}>☁</AppText>
            <AppText variant="h3" color={colors.ink} align="center" style={{ marginTop: spacing.md }}>
              Something went wrong
            </AppText>
            <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginTop: spacing.sm }}>
              {error}
            </AppText>
            <View style={{ marginTop: spacing.lg, width: 180 }}>
              <Button label="Try again" variant="primary" onPress={retry} />
            </View>
          </View>
        ) : isEmpty ? (
          <View style={mobileStyles.centered}>
            <AppText style={{ fontSize: 48 }}>✈</AppText>
            <AppText variant="h2" color={colors.ink} align="center" style={{ marginTop: spacing.md }}>
              You're all caught up.
            </AppText>
            <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginTop: spacing.sm, maxWidth: 260 }}>
              New profiles arrive every morning.
            </AppText>
            <View style={{ marginTop: spacing.lg, width: 180 }}>
              <Button label="Refresh" variant="secondary" onPress={retry} />
            </View>
          </View>
        ) : (
          <>
            <GestureHandlerRootView style={mobileStyles.stackArea}>
              <SwipeStack
                profiles={allProfiles}
                onSwipe={handleSwipe}
                cardRef={topCardRef}
              />
            </GestureHandlerRootView>
            <ActionBar
              onUndo={() => {}}
              onNope={() => handleButtonSwipe('left')}
              onLike={() => handleButtonSwipe('right')}
              onStar={() => handleButtonSwipe('right')}
            />
          </>
        )}
      </SafeAreaView>

      {matchedProfile && (
        <MatchModal
          matchedProfile={matchedProfile}
          currentUserProfile={currentUserProfile}
          onKeepSwiping={clearMatch}
        />
      )}
    </View>
  );
}

// ── Helper sub-components ────────────────────────────────────────────────────

function FilterRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[webStyles.filterRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.rule }]}>
      <AppText variant="caption" color={colors.inkSoft}>{label}</AppText>
      <AppText variant="bodySmall" color={colors.ink}>{value}</AppText>
    </View>
  );
}

// ── Web styles ────────────────────────────────────────────────────────────────

const webStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  grid: {
    width: '100%',
    maxWidth: 1060,
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  sidebar: {
    width: 252,
    flexShrink: 0,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: spacing.lg,
    ...shadows.sm,
  },
  panelTitle: {
    marginBottom: spacing.md,
  },
  filterRow: {
    paddingVertical: spacing.sm,
    gap: 2,
  },
  destRow: {
    paddingVertical: 10,
  },
  matchPhotos: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  matchPhoto: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
  },
  center: {
    flex: 1,
    minWidth: 0,
  },
  cardArea: {
    height: 520,
    marginHorizontal: spacing.edge,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});

// ── Mobile styles ─────────────────────────────────────────────────────────────

const mobileStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stackArea: {
    flex: 1,
    paddingHorizontal: spacing.edge,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
});
