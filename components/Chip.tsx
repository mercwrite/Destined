// Chip.tsx — interest tag, hobby pill, etc.

import React, { useState } from 'react';
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
  const [pressed, setPressed] = useState(false);

  const chipStyle = [
    styles.base,
    size === 'sm' ? styles.sm : styles.md,
    selected ? styles.selected : styles.unselected,
    pressed ? styles.pressed : null,
    style,
  ];

  if (!onPress) {
    return (
      <View style={chipStyle}>
        <AppText variant="bodySmall" color={selected ? colors.accentDeep : colors.ink} style={styles.label}>
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={chipStyle}
    >
      <AppText variant="bodySmall" color={selected ? colors.accentDeep : colors.ink} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
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
  pressed: { opacity: 0.85 },
  label: { fontWeight: '500' },
});
