// ConversationsScreen.tsx — list of matches/active threads.

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, ScrollView, Image, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '../components/Text';
import { ScreenHeader } from '../components/ScreenHeader';
import { TabBar, TabId } from '../components/TabBar';
import { colors, spacing, radii } from '../theme';
import { supabase } from '../utils/supabase';
import { useAuth } from '../app/_layout';

export interface Conversation {
  id: string;
  name: string;
  age: number;
  photo: string;
  destination: string;
  lastMessage: string;
  time: string;
  unread: number;
  online?: boolean;
  isNewMatch?: boolean;
}

interface Props {
  activeTab: TabId;
  onChangeTab: (id: TabId) => void;
}

export function ConversationsScreen({ activeTab, onChangeTab }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newMatches, setNewMatches] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTime = useCallback((iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }, []);

  const loadMatches = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

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

    const matchIds = matches.map((match: any) => match.id);
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

    const latestMessageByMatch = new Map<string, any>();
    const unreadCountByMatch = new Map<string, number>();
    (messages ?? []).forEach((message: any) => {
      const existing = unreadCountByMatch.get(message.match_id) ?? 0;
      if (message.sender_id !== userId && message.read_at == null) {
        unreadCountByMatch.set(message.match_id, existing + 1);
      }
      if (!latestMessageByMatch.has(message.match_id)) {
        latestMessageByMatch.set(message.match_id, message);
      }
    });

    const normalized: Conversation[] = (matches as any[]).map((match) => {
      const isUser1 = match.user1_id === userId;
      const profile = isUser1 ? match.user2_profile : match.user1_profile;
      const photo = (profile?.profile_photos ?? [])
        .slice()
        .sort((a: any, b: any) => a.display_order - b.display_order)[0]?.url ?? '';
      const latest = latestMessageByMatch.get(match.id);

      return {
        id: match.id,
        name: profile?.name ?? 'Your match',
        age: 0,
        photo,
        destination: profile?.destination ?? '',
        lastMessage: latest?.content ?? 'Say hello and plan the trip 👋',
        time: latest ? formatTime(latest.created_at) : 'New',
        unread: unreadCountByMatch.get(match.id) ?? 0,
        online: false,
        isNewMatch: !latest,
      };
    });

    setNewMatches(normalized.filter((item) => item.isNewMatch));
    setConversations(normalized.filter((item) => !item.isNewMatch));
    setLoading(false);
  }, [userId, formatTime]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader eyebrow="Your trips" title="Conversations" />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <AppText variant="body" color={colors.accent} align="center">
              {error}
            </AppText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
            {newMatches.length > 0 ? (
              <View style={styles.matchesStrip}>
                <AppText variant="label" color={colors.inkSoft} style={styles.stripLabel}>
                  New matches · say hi
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.edge, gap: spacing.md }}>
                  {newMatches.map((m) => (
                    <Pressable key={m.id} onPress={() => router.push({ pathname: '/chat', params: { matchId: m.id, partnerName: m.name, partnerPhoto: m.photo, destination: m.destination, online: m.online ? 'true' : 'false' } })} style={styles.newMatch}>
                      <Image source={{ uri: m.photo }} style={styles.newMatchPhoto} />
                      <View style={styles.newMatchBadge}>
                        <AppText variant="caption" color={colors.white} style={{ fontSize: 10 }}>✦</AppText>
                      </View>
                      <AppText variant="caption" color={colors.ink} style={{ marginTop: 6, fontWeight: '500' }}>
                        {m.name}
                      </AppText>
                      <AppText variant="caption" color={colors.accent} style={{ fontSize: 10 }}>
                        ✈ {m.destination}
                      </AppText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <AppText variant="label" color={colors.inkSoft} style={styles.threadsLabel}>
              Messages
            </AppText>
            {conversations.map((c) => (
              <Pressable key={c.id} onPress={() => router.push({ pathname: '/chat', params: { matchId: c.id, partnerName: c.name, partnerPhoto: c.photo, destination: c.destination, online: c.online ? 'true' : 'false' } })} style={styles.thread}>
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: c.photo }} style={styles.avatar} />
                  {c.online ? <View style={styles.onlineDot} /> : null}
                </View>

                <View style={styles.threadBody}>
                  <View style={styles.threadTop}>
                    <AppText variant="bodyMedium" color={colors.ink}>{c.name}</AppText>
                    <AppText variant="caption" color={colors.inkFaint}>{c.time}</AppText>
                  </View>
                  <AppText variant="caption" color={colors.accent} style={{ fontWeight: '600', marginTop: 1 }}>
                    ✈ {c.destination}
                  </AppText>
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
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      <TabBar active={activeTab} onChange={onChangeTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  matchesStrip: { paddingVertical: spacing.md, marginBottom: spacing.sm },
  stripLabel: { paddingHorizontal: spacing.edge, marginBottom: spacing.md },
  newMatch: { alignItems: 'center', width: 80 },
  newMatchPhoto: {
    width: 72, height: 72, borderRadius: radii.full,
    borderWidth: 2, borderColor: colors.accent,
  },
  newMatchBadge: {
    position: 'absolute', top: 0, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.edge,
  },
  threadsLabel: { paddingHorizontal: spacing.edge, marginTop: spacing.lg, marginBottom: spacing.sm },
  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.edge,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2, borderColor: colors.bg,
  },
  threadBody: { flex: 1 },
  threadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
