// Button.tsx — primary, secondary, ghost variants with Aurora-soft elevation.

import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { AppText } from './Text';
import { colors, radii, spacing, shadows } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';

interface ButtonProps {
  label: string;
  variant?: Variant;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  onPress,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  iconLeft,
  iconRight,
}: ButtonProps) {
  const palette = paletteFor(variant);

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: palette.borderWidth },
        variant === 'primary' ? shadows.accent : null,
        fullWidth ? { alignSelf: 'stretch' } : null,
        pressed && !disabled ? { transform: [{ scale: 0.98 }], opacity: 0.92 } : null,
        disabled ? { opacity: 0.5 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {iconLeft ? <View style={{ marginRight: spacing.sm }}>{iconLeft}</View> : null}
          <AppText variant="bodyMedium" color={palette.fg} style={styles.label}>
            {label}
          </AppText>
          {iconRight ? <View style={{ marginLeft: spacing.sm }}>{iconRight}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

function paletteFor(variant: Variant) {
  switch (variant) {
    case 'primary':
      return { bg: colors.accent, fg: colors.white, border: colors.accent, borderWidth: 0 };
    case 'secondary':
      return { bg: colors.accentSoft, fg: colors.accentDeep, border: colors.accentSoft, borderWidth: 0 };
    case 'ghost':
      return { bg: 'transparent', fg: colors.ink, border: colors.ruleStrong, borderWidth: 1 };
    case 'dark':
      return { bg: colors.ink, fg: colors.bg, border: colors.ink, borderWidth: 0 };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
