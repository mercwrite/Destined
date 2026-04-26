// Chip.tsx — interest tag, hobby pill, etc.

import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './Text';
import { colors, radii, spacing } from '../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Chip({ label, selected = false, onPress, size = 'md', style }: ChipProps) {
  const Container: any = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        selected ? styles.selected : styles.unselected,
        pressed ? { opacity: 0.85 } : null,
        style,
      ]}
    >
      <AppText
        variant="bodySmall"
        color={selected ? colors.accentDeep : colors.ink}
        style={{ fontWeight: '500' }}
      >
        {label}
      </AppText>
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  sm: { paddingVertical: 6, paddingHorizontal: 12 },
  md: { paddingVertical: 8, paddingHorizontal: 14 },
  selected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
  unselected: {
    backgroundColor: colors.surface,
    borderColor: colors.rule,
  },
});
