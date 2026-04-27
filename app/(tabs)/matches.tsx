import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/app/_layout';
import { supabase } from '@/utils/supabase';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText } from '@/components/Text';
import { colors, radii, spacing } from '@/theme';

type ConversationItem = {
  matchId: string;
  partnerName: string;
  partnerPhoto: string;
  destination: string;
  lastMessage: string;
  time: string;
  unread: number;
  isNewMatch: boolean;
};

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MatchesScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id ?? null;

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [newMatches, setNewMatches] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        created_at,
        user1_id,
        user2_id,
        user1_profile:profiles!matches_user1_id_fkey(id, name, destination, profile_photos(url, display_order)),
        user2_profile:profiles!matches_user2_id_fkey(id, name, destination, profile_photos(url, display_order))
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (matchError || !matches) {
      setError(matchError?.message ?? 'Unable to load matches.');
      setLoading(false);
      return;
    }

    const matchIds = (matches as any[]).map((m) => m.id);

    if (matchIds.length === 0) {
      setConversations([]);
      setNewMatches([]);
      setLoading(false);
      return;
    }

    const { data: messages, error: messageError } = await supabase
      .from('messages')
      .select('id, match_id, sender_id, content, created_at, read_at')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false });

    if (messageError) {
      setError(messageError.message);
      setLoading(false);
      return;
    }

    const latestByMatch = new Map<string, any>();
    const unreadByMatch = new Map<string, number>();

    for (const msg of messages ?? []) {
      if (!latestByMatch.has(msg.match_id)) {
        latestByMatch.set(msg.match_id, msg);
      }
      if (msg.sender_id !== userId && msg.read_at == null) {
        unreadByMatch.set(msg.match_id, (unreadByMatch.get(msg.match_id) ?? 0) + 1);
      }
    }

    const normalized: ConversationItem[] = (matches as any[]).map((match) => {
      const isUser1 = match.user1_id === userId;
      const profile = isUser1 ? match.user2_profile : match.user1_profile;
      const sortedPhotos = (profile?.profile_photos ?? [])
        .slice()
        .sort((a: any, b: any) => a.display_order - b.display_order);
      const photo = sortedPhotos[0]?.url ?? '';
      const latest = latestByMatch.get(match.id);

      return {
        matchId: match.id,
        partnerName: profile?.name ?? 'Your match',
        partnerPhoto: photo,
        destination: profile?.destination ?? '',
        lastMessage: latest?.content ?? 'Say hello and plan the trip 👋',
        time: latest ? formatTime(latest.created_at) : formatTime(match.created_at),
        unread: unreadByMatch.get(match.id) ?? 0,
        isNewMatch: !latest,
      };
    });

    setNewMatches(normalized.filter((c) => c.isNewMatch));
    setConversations(normalized.filter((c) => !c.isNewMatch));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const openChat = (item: ConversationItem) => {
    router.push({
      pathname: '/chat',
      params: {
        matchId: item.matchId,
        partnerName: item.partnerName,
        partnerPhoto: item.partnerPhoto,
        destination: item.destination,
      },
    });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader eyebrow="Your trips" title="Matches" />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <AppText variant="body" color={colors.danger} align="center">{error}</AppText>
          </View>
        ) : newMatches.length === 0 && conversations.length === 0 ? (
          <View style={styles.centered}>
            <AppText style={{ fontSize: 40 }}>✈</AppText>
            <AppText variant="h3" color={colors.ink} align="center" style={{ marginTop: spacing.md }}>
              No matches yet
            </AppText>
            <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginTop: spacing.sm, maxWidth: 260 }}>
              When you and someone both swipe right, they'll appear here.
            </AppText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
            {/* New matches horizontal strip */}
            {newMatches.length > 0 ? (
              <View style={styles.newMatchesSection}>
                <AppText variant="label" color={colors.inkSoft} style={styles.sectionLabel}>
                  New matches · say hi
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: spacing.edge, gap: spacing.md }}
                >
                  {newMatches.map((m) => (
                    <Pressable key={m.matchId} onPress={() => openChat(m)} style={styles.newMatchItem}>
                      {m.partnerPhoto ? (
                        <Image source={{ uri: m.partnerPhoto }} style={styles.newMatchPhoto} />
                      ) : (
                        <View style={[styles.newMatchPhoto, styles.avatarPlaceholder]}>
                          <AppText style={{ fontSize: 20, color: colors.inkFaint }}>?</AppText>
                        </View>
                      )}
                      <View style={styles.newMatchBadge}>
                        <AppText style={{ color: colors.white, fontSize: 10 }}>✦</AppText>
                      </View>
                      <AppText variant="caption" color={colors.ink} style={{ marginTop: 6, fontWeight: '500' }}>
                        {m.partnerName}
                      </AppText>
                      {m.destination ? (
                        <AppText variant="caption" color={colors.accent} style={{ fontSize: 10 }}>
                          ✈ {m.destination}
                        </AppText>
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Conversation threads */}
            {conversations.length > 0 ? (
              <>
                <AppText variant="label" color={colors.inkSoft} style={styles.sectionLabel}>
                  Messages
                </AppText>
                {conversations.map((c, i) => (
                  <View key={c.matchId}>
                    <Pressable
                      onPress={() => openChat(c)}
                      style={({ pressed }) => [styles.thread, pressed && { opacity: 0.85 }]}
                    >
                      <View style={styles.avatarWrap}>
                        {c.partnerPhoto ? (
                          <Image source={{ uri: c.partnerPhoto }} style={styles.avatar} />
                        ) : (
                          <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <AppText style={{ fontSize: 20, color: colors.inkFaint }}>?</AppText>
                          </View>
                        )}
                      </View>

                      <View style={styles.threadBody}>
                        <View style={styles.threadTop}>
                          <AppText variant="bodyMedium" color={colors.ink}>{c.partnerName}</AppText>
                          <AppText variant="caption" color={colors.inkFaint}>{c.time}</AppText>
                        </View>
                        {c.destination ? (
                          <AppText variant="caption" color={colors.accent} style={{ marginTop: 1 }}>
                            ✈ {c.destination}
                          </AppText>
                        ) : null}
                        <AppText
                          variant="bodySmall"
                          color={c.unread > 0 ? colors.ink : colors.inkSoft}
                          numberOfLines={1}
                          style={{ marginTop: 2, fontWeight: c.unread > 0 ? '500' : '400' }}
                        >
                          {c.lastMessage}
                        </AppText>
                      </View>

                      {c.unread > 0 ? (
                        <View style={styles.badge}>
                          <AppText style={styles.badgeText}>{c.unread}</AppText>
                        </View>
                      ) : null}
                    </Pressable>
                    {i < conversations.length - 1 ? (
                      <View style={styles.separator} />
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.sm,
  },
  newMatchesSection: { paddingVertical: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { paddingHorizontal: spacing.edge, marginBottom: spacing.md },
  newMatchItem: { alignItems: 'center', width: 80 },
  newMatchPhoto: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  newMatchBadge: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.edge,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadBody: { flex: 1 },
  threadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  separator: {
    height: 1,
    backgroundColor: colors.rule,
    marginLeft: spacing.edge + 56 + spacing.md,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
