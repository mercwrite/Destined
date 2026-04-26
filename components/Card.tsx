// Card.tsx — soft Aurora-style card with optional warm tint.

import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, radii, shadows, spacing } from '../theme';

interface CardProps extends ViewProps {
  variant?: 'plain' | 'warm' | 'flat';
  padding?: keyof typeof spacing | number;
  children?: React.ReactNode;
}

export function Card({ variant = 'plain', padding = 'lg', children, style, ...rest }: CardProps) {
  const pad = typeof padding === 'number' ? padding : spacing[padding];
  return (
    <View
      {...rest}
      style={[
        styles.base,
        variant === 'plain' ? [styles.plain, shadows.sm] : null,
        variant === 'warm' ? [styles.warm, shadows.sm] : null,
        variant === 'flat' ? styles.flat : null,
        { padding: pad },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
  },
  plain: {
    backgroundColor: colors.surface,
  },
  warm: {
    backgroundColor: colors.surfaceWarm,
  },
  flat: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.rule,
  },
});
