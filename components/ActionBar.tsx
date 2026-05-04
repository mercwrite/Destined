// ActionBar.tsx — undo / nope / like / star buttons under the swipe card.

import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, shadows } from '../theme';
import { AppText } from './Text';

interface ActionBarProps {
  onUndo?: () => void;
  onNope?: () => void;
  onLike?: () => void;
  onStar?: () => void;
}

export function ActionBar({ onUndo, onNope, onLike, onStar }: ActionBarProps) {
  return (
    <View style={styles.row}>
      <ActionBtn glyph="↺" onPress={onUndo} size="sm" tint={colors.warning} />
      <ActionBtn glyph="✕" onPress={onNope} size="lg" tint={colors.danger} />
      <ActionBtn glyph="♥" onPress={onLike} size="lg" primary />
      <ActionBtn glyph="★" onPress={onStar} size="sm" tint={colors.accent} />
    </View>
  );
}

interface BtnProps {
  glyph: string;
  onPress?: () => void;
  size: 'sm' | 'lg';
  tint?: string;
  primary?: boolean;
}

function ActionBtn({ glyph, onPress, size, tint, primary }: BtnProps) {
  const dim = size === 'lg' ? 64 : 48;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: primary ? colors.accent : colors.surface,
        },
        primary ? shadows.accent : shadows.sm,
        pressed ? { transform: [{ scale: 0.92 }] } : null,
      ]}
    >
      <AppText
        style={{
          fontSize: size === 'lg' ? 26 : 20,
          lineHeight: size === 'lg' ? 30 : 24,
          color: primary ? colors.white : (tint ?? colors.ink),
          fontWeight: '600',
        }}
      >
        {glyph}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: Platform.OS === 'web' ? 18 : 14,
    paddingHorizontal: 20,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
