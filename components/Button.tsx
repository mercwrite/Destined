// Button.tsx — primary, secondary, ghost variants with Aurora-soft elevation.

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '../theme';
import { AppText } from './Text';

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
  const [pressed, setPressed] = useState(false);
  const palette = paletteFor(variant);

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.base,
        variantStyles[variant],
        variant === 'primary' ? shadows.accent : null,
        fullWidth ? styles.fullWidth : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
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
      return { fg: colors.white };
    case 'secondary':
      return { fg: colors.accentDeep };
    case 'ghost':
      return { fg: colors.ink };
    case 'dark':
      return { fg: colors.bg };
  }
}

// StyleSheet.create registers these as numeric IDs, which NativeWind passes
// through correctly — unlike inline objects inside Pressable style functions.
const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.accentSoft },
  ghost: { backgroundColor: 'transparent', borderColor: colors.ruleStrong, borderWidth: 1 },
  dark: { backgroundColor: colors.ink },
});

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  disabled: { opacity: 0.5 },
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
