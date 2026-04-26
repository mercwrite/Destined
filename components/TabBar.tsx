// TabBar.tsx — bottom navigation bar (Discover / Likes / Trips / Me).
// Use with React Navigation's tabBar prop.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from './Text';
import { colors, spacing } from '../theme';

export type TabId = 'discover' | 'likes' | 'trips' | 'me';

interface TabBarProps {
  active: TabId;
  onChange: (id: TabId) => void;
  insetBottom?: number;
}

const TABS: { id: TabId; label: string; glyph: string }[] = [
  { id: 'discover', label: 'Discover', glyph: '◇' },
  { id: 'likes', label: 'Likes', glyph: '♡' },
  { id: 'trips', label: 'Trips', glyph: '✈' },
  { id: 'me', label: 'Me', glyph: '◉' },
];

export function TabBar({ active, onChange, insetBottom = 24 }: TabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: insetBottom + 6 }]}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={styles.tab}
          >
            <AppText
              style={{
                fontSize: 18,
                color: isActive ? colors.accent : colors.inkFaint,
                marginBottom: 3,
              }}
            >
              {tab.glyph}
            </AppText>
            <AppText
              variant="caption"
              color={isActive ? colors.accent : colors.inkFaint}
              style={{ fontWeight: isActive ? '600' : '400', fontSize: 11 }}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});
