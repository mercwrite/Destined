import { useAuth } from '@/app/_layout';
import MatchModal from '@/components/MatchModal';
import ProfileCard, { type ProfileCardData } from '@/components/ProfileCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText } from '@/components/Text';
import { colors, radii, shadows, spacing } from '@/theme';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

const IS_WEB = Platform.OS === 'web';
const NUM_COLS = IS_WEB ? 5 : 2;
const GRID_PAD = IS_WEB ? spacing.edge : spacing.md;
const GAP = spacing.sm;

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

const PHOTO_SELECT =
  'id, profile_id, url, display_order, impressions, swipe_left, swipe_right';

export default function LikesScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const { width: winW, height: winH } = useWindowDimensions();

  const effectiveW = IS_WEB ? Math.min(winW, 1100) : winW;
  const cardW = IS_WEB
    ? Math.floor((effectiveW - 2 * GRID_PAD - (NUM_COLS - 1) * GAP) / NUM_COLS)
    : Math.floor((effectiveW - 2 * GRID_PAD - GAP) / NUM_COLS);
  const cardH = IS_WEB ? cardW : Math.floor(cardW * 1.4);

  const [likers, setLikers] = useState<ProfileCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProfileCardData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<ProfileCardData | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileCardData | null>(null);

  // Own profile for MatchModal
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select(`id, name, date_of_birth, bio, location_city, gender, destination, hobbies, relationship_type, profile_photos(${PHOTO_SELECT})`)
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
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    // Profiles that liked me
    const { data: likerRows } = await supabase
      .from('swipes')
      .select(`
        swiper_id,
        profiles!swipes_swiper_id_fkey(
          id, name, date_of_birth, bio, location_city, gender, destination, hobbies, relationship_type,
          profile_photos(${PHOTO_SELECT})
        )
      `)
      .eq('swiped_id', userId)
      .eq('direction', 'right')
      .order('created_at', { ascending: false })
      .limit(50);

    // Profiles I've already responded to — filter them out so the list
    // only shows pending likes
    const { data: mySwipes } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', userId);

    const respondedTo = new Set((mySwipes ?? []).map((s: any) => s.swiped_id as string));

    const mapped: ProfileCardData[] = (likerRows ?? [])
      .filter((row: any) => !respondedTo.has(row.swiper_id as string))
      .map((row: any) => {
        const p = row.profiles;
        const photos = (p?.profile_photos ?? [])
          .slice()
          .sort((a: any, b: any) => a.display_order - b.display_order);
        return {
          id: p?.id ?? row.swiper_id,
          name: p?.name ?? null,
          date_of_birth: p?.date_of_birth ?? null,
          bio: p?.bio ?? null,
          location_city: p?.location_city ?? null,
          gender: p?.gender ?? null,
          destination: p?.destination ?? null,
          hobbies: p?.hobbies ?? null,
          relationship_type: p?.relationship_type ?? null,
          photos,
        };
      });

    setLikers(mapped);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // FR-MATCH-003: like back or reject from the expanded view
  async function handleAction(direction: 'left' | 'right') {
    if (!selected || !userId || actionLoading) return;
    setActionLoading(true);

    const topPhoto = selected.photos[0];
    const { data: matchId, error } = await supabase.rpc('record_swipe', {
      p_swiped_id: selected.id,
      p_direction: direction,
      p_photo_id: topPhoto?.id ?? null,
    });

    if (error) console.warn('record_swipe error:', error.message);

    const acted = selected;
    setSelected(null);
    setActionLoading(false);
    setLikers((prev) => prev.filter((l) => l.id !== acted.id));

    // FR-MATCH-004: mutual like → show match modal
    if (direction === 'right' && matchId) {
      setMatchedProfile(acted);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader eyebrow="People who like you" title="Likes" />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : likers.length === 0 ? (
          <View style={styles.centered}>
            <AppText style={{ fontSize: 40 }}>♡</AppText>
            <AppText variant="h3" color={colors.ink} align="center" style={{ marginTop: spacing.md }}>
              No likes yet
            </AppText>
            <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginTop: spacing.sm, maxWidth: 260 }}>
              Keep swiping — people who like you will appear here.
            </AppText>
          </View>
        ) : IS_WEB ? (
          <FlatList
            data={likers}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLS}
            key={String(NUM_COLS)}
            contentContainerStyle={[styles.grid, { paddingHorizontal: GRID_PAD }]}
            style={styles.gridList}
            columnWrapperStyle={{ gap: GAP }}
            ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
            renderItem={({ item }) => {
              const age = computeAge(item.date_of_birth);
              const photoUrl = item.photos[0]?.url ?? null;
              return (
                <Pressable
                  style={({ pressed }) => [
                    { width: cardW, height: cardH, borderRadius: radii.md, overflow: 'hidden', ...shadows.sm },
                    pressed && { opacity: 0.88 },
                  ]}
                  onPress={() => setSelected(item)}
                >
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]}>
                      <AppText style={{ fontSize: 32, color: colors.inkFaint }}>?</AppText>
                    </View>
                  )}
                  <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.68)']}
                    style={[StyleSheet.absoluteFill, styles.cardOverlay]}
                  >
                    <AppText variant="bodySmall" numberOfLines={1} style={styles.cardName}>
                      {item.name ?? 'Someone'}{computeAge(item.date_of_birth) !== null ? `, ${computeAge(item.date_of_birth)}` : ''}
                    </AppText>
                    {item.destination ? (
                      <AppText variant="caption" numberOfLines={1} style={styles.cardDest}>
                        ✈ {item.destination}
                      </AppText>
                    ) : null}
                  </LinearGradient>
                </Pressable>
              );
            }}
          />
        ) : (
          // Mobile: plain ScrollView with manual 2-column rows — avoids FlatList numColumns layout issues
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: GRID_PAD, paddingBottom: spacing.xxl }}
            showsVerticalScrollIndicator={false}
          >
            {Array.from({ length: Math.ceil(likers.length / 2) }, (_, rowIdx) => {
              const rowItems = likers.slice(rowIdx * 2, rowIdx * 2 + 2);
              return (
                <View
                  key={rowIdx}
                  style={{
                    flexDirection: 'row',
                    gap: GAP,
                    marginBottom: GAP,
                     // row = green
                  }}
                >
                  {rowItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelected(item)}
                      style={{
                        width: cardW,
                        height: cardH,
                        borderRadius: radii.md,
                        overflow: 'hidden',
                        backgroundColor: colors.surfaceSoft,
                      }}
                    >
                      {/* Step 1: just the Image */}
                      {item.photos[0]?.url ? (
                        <Image
                          source={{ uri: item.photos[0].url }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]}>
                          <AppText style={{ fontSize: 32, color: colors.inkFaint }}>?</AppText>
                        </View>
                      )}
                      <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <LinearGradient
                          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.68)']}
                          style={{ flex: 1, justifyContent: 'flex-end', padding: spacing.sm, gap: 2 }}
                        >
                          <AppText variant="bodySmall" numberOfLines={1} style={styles.cardName}>
                            {item.name ?? 'Someone'}
                          </AppText>
                          {item.destination ? (
                            <AppText variant="caption" numberOfLines={1} style={styles.cardDest}>
                              ✈ {item.destination}
                            </AppText>
                          ) : null}
                        </LinearGradient>
                      </View>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* FR-MATCH-002 / FR-MATCH-003: full profile sheet with like/reject actions */}
      {selected ? (
        <Modal
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setSelected(null)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.cardContainer}>
                <ProfileCard profile={selected} />
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleAction('left')}
                  disabled={actionLoading}
                  accessibilityLabel="Pass"
                >
                  <AppText style={{ fontSize: 26, color: colors.danger }}>✕</AppText>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.likeBtn]}
                  onPress={() => handleAction('right')}
                  disabled={actionLoading}
                  accessibilityLabel="Like back"
                >
                  <AppText style={{ fontSize: 26, color: colors.white }}>♥</AppText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* FR-MATCH-004: match notification */}
      {matchedProfile ? (
        <MatchModal
          matchedProfile={matchedProfile}
          currentUserProfile={currentUserProfile}
          onKeepSwiping={() => setMatchedProfile(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxxl,
  },
  gridList: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: IS_WEB ? 1100 : undefined,
  },
  grid: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  photoPlaceholder: {
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOverlay: {
    justifyContent: 'flex-end',
    padding: spacing.sm,
    gap: 2,
  },
  cardName: {
    color: colors.white,
    fontWeight: '600',
  },
  cardDest: {
    color: 'rgba(255,255,255,0.82)',
  },
  // Profile expand sheet
  modalBackdrop: {
    flex: 1,
    justifyContent: IS_WEB ? 'center' : 'flex-end',
    alignItems: IS_WEB ? 'center' : 'stretch',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    height: '88%',
    width: IS_WEB ? 400 : undefined,
    backgroundColor: colors.bg,
    borderRadius: IS_WEB ? radii.xl : undefined,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ruleStrong,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  cardContainer: {
    flex: 1,
    marginHorizontal: spacing.edge,
    marginBottom: spacing.md,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  rejectBtn: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  likeBtn: {
    backgroundColor: colors.accent,
  },
});
