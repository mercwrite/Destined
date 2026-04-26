// ConversationsScreen.tsx — list of matches/active threads.

import React from 'react';
import { View, ScrollView, Image, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { AppText } from '../components/Text';
import { ScreenHeader } from '../components/ScreenHeader';
import { TabBar, TabId } from '../components/TabBar';
import { colors, spacing, radii } from '../theme';

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
  conversations: Conversation[];
  newMatches: Conversation[];        // not yet messaged
  activeTab: TabId;
  onChangeTab: (id: TabId) => void;
  onOpenChat: (c: Conversation) => void;
}

export function ConversationsScreen({
  conversations, newMatches, activeTab, onChangeTab, onOpenChat,
}: Props) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader eyebrow="Your trips" title="Conversations" />

        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          {/* New matches strip */}
          {newMatches.length > 0 ? (
            <View style={styles.matchesStrip}>
              <AppText variant="label" color={colors.inkSoft} style={styles.stripLabel}>
                New matches · say hi
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.edge, gap: spacing.md }}>
                {newMatches.map((m) => (
                  <Pressable key={m.id} onPress={() => onOpenChat(m)} style={styles.newMatch}>
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

          {/* Threads */}
          <AppText variant="label" color={colors.inkSoft} style={styles.threadsLabel}>
            Messages
          </AppText>
          {conversations.map((c) => (
            <Pressable key={c.id} onPress={() => onOpenChat(c)} style={styles.thread}>
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
