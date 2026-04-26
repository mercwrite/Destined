// SwipeScreen.tsx — destination-led card stack.

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { AppText } from '../components/Text';
import { ScreenHeader } from '../components/ScreenHeader';
import { SwipeCard, SwipeProfile } from '../components/SwipeCard';
import { ActionBar } from '../components/ActionBar';
import { TabBar, TabId } from '../components/TabBar';
import { colors, spacing, radii } from '../theme';

interface Props {
  profiles: SwipeProfile[];
  activeTab: TabId;
  onChangeTab: (id: TabId) => void;
  onSwipeRight?: (p: SwipeProfile) => void;
  onSwipeLeft?: (p: SwipeProfile) => void;
  onOpenFilters?: () => void;
}

export function SwipeScreen({
  profiles,
  activeTab,
  onChangeTab,
  onSwipeRight,
  onSwipeLeft,
  onOpenFilters,
}: Props) {
  const [index, setIndex] = useState(0);
  const current = profiles[index];
  const next = profiles[index + 1];

  const advance = () => setIndex((i) => Math.min(i + 1, profiles.length - 1));

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader
          eyebrow="Today's stack"
          title="Discover"
          trailing={
            <Pressable onPress={onOpenFilters} style={styles.filterBtn}>
              <AppText style={{ fontSize: 16 }}>⚙</AppText>
            </Pressable>
          }
        />

        <View style={styles.stack}>
          {/* Back card peek */}
          {next ? (
            <View style={[styles.cardPeek]} pointerEvents="none">
              <SwipeCard profile={next as any} />
            </View>
          ) : null}
          {/* Front card */}
          {current ? <SwipeCard profile={current as any} /> : <EmptyState />}
        </View>

        <ActionBar
          onNope={() => { onSwipeLeft?.(current); advance(); }}
          onLike={() => { onSwipeRight?.(current); advance(); }}
          onUndo={() => setIndex((i) => Math.max(i - 1, 0))}
          onStar={() => { onSwipeRight?.(current); advance(); }}
        />
      </SafeAreaView>

      <TabBar active={activeTab} onChange={onChangeTab} />
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <AppText variant="h2" color={colors.ink} align="center">
        You're all caught up.
      </AppText>
      <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginTop: spacing.sm }}>
        New profiles arrive every morning.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  filterBtn: {
    width: 40, height: 40, borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.rule,
    alignItems: 'center', justifyContent: 'center',
  },
  stack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.edge,
  },
  cardPeek: {
    position: 'absolute',
    transform: [{ scale: 0.96 }, { translateY: 12 }],
    opacity: 0.5,
  },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
});
