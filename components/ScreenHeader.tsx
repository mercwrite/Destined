// ScreenHeader.tsx — eyebrow label + serif heading shared across screens.

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './Text';
import { colors, spacing } from '../theme';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  trailing?: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({ eyebrow, title, trailing, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <AppText variant="label" color={colors.inkSoft} style={{ marginBottom: 4 }}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="h1" color={colors.ink}>
          {title}
        </AppText>
      </View>
      {trailing ? <View style={{ marginLeft: spacing.md }}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.edge,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
