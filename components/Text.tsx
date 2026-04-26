// Text.tsx — typed text primitives that hide font-name boilerplate.
// Use <Display>, <H1>, <H2>, <Body>, <Label>, <Caption>, <Eyebrow> instead of <Text>
// to keep the type system consistent across screens.

import React from 'react';
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';
import { colors, typography } from '../theme';

type Variant =
  | 'display'
  | 'displayItalic'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyMedium'
  | 'bodySmall'
  | 'label'        // eyebrow / mono label
  | 'caption';

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export function AppText({
  variant = 'body',
  color = colors.ink,
  italic = false,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <RNText
      {...rest}
      style={[
        variantStyles[variant],
        italic && variant.startsWith('display') ? { fontFamily: typography.serifItalic } : null,
        { color },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const variantStyles: Record<Variant, TextStyle> = StyleSheet.create({
  display: {
    fontFamily: typography.serif,
    fontSize: typography.display.fontSize,
    lineHeight: typography.display.lineHeight,
    letterSpacing: typography.display.letterSpacing,
  },
  displayItalic: {
    fontFamily: typography.serifItalic,
    fontStyle: 'italic',
    fontSize: typography.display.fontSize,
    lineHeight: typography.display.lineHeight,
    letterSpacing: typography.display.letterSpacing,
  },
  h1: {
    fontFamily: typography.serif,
    fontSize: typography.h1.fontSize,
    lineHeight: typography.h1.lineHeight,
    letterSpacing: typography.h1.letterSpacing,
  },
  h2: {
    fontFamily: typography.serif,
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    letterSpacing: typography.h2.letterSpacing,
  },
  h3: {
    fontFamily: typography.sansBold,
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    letterSpacing: typography.h3.letterSpacing,
  },
  body: {
    fontFamily: typography.sans,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  bodyMedium: {
    fontFamily: typography.sansMedium,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  bodySmall: {
    fontFamily: typography.sans,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
  },
  label: {
    fontFamily: typography.mono,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: typography.sans,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
});
