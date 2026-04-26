// WelcomeScreen.tsx — auth landing.
// Hero photo with type lockup and CTA stack.

import React from 'react';
import { View, Image, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '../components/Text';
import { Button } from '../components/Button';
import { colors, spacing, gradients } from '../theme';

interface Props {
  onCreateAccount?: () => void;
  onSignIn?: () => void;
}

export function WelcomeScreen({ onCreateAccount, onSignIn }: Props) {
  return (
    <View style={styles.root}>
      {/* Hero photo */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80' }}
        style={styles.hero}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', colors.bg]}
        locations={[0.3, 1]}
        style={styles.heroFade}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <AppText variant="label" color={colors.white}>Issue 04 · Spring</AppText>
          <AppText variant="label" color={colors.white}>Destined.</AppText>
        </View>

        <View style={styles.bottom}>
          <AppText variant="label" color={colors.accent} style={{ marginBottom: spacing.md }}>
            — Where to next?
          </AppText>
          <AppText variant="display" color={colors.ink}>
            Date by{'\n'}
            <AppText variant="display" color={colors.accent} italic>
              destination.
            </AppText>
          </AppText>
          <AppText
            variant="body"
            color={colors.inkSoft}
            style={{ marginTop: spacing.lg, marginBottom: spacing.xxl, maxWidth: 300 }}
          >
            Meet someone who wants to go where you want to go. Plan the trip together.
          </AppText>

          <Button label="Create account" variant="dark" onPress={onCreateAccount} />
          <View style={{ height: spacing.md }} />
          <View style={styles.signInRow}>
            <AppText variant="body" color={colors.inkSoft}>Already a member? </AppText>
            <AppText
              variant="bodyMedium"
              color={colors.ink}
              style={{ textDecorationLine: 'underline' }}
              onPress={onSignIn}
            >
              Sign in
            </AppText>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { ...StyleSheet.absoluteFillObject, height: '62%', resizeMode: 'cover' },
  heroFade: { position: 'absolute', left: 0, right: 0, top: 0, height: '62%' },
  safe: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.edge,
    paddingTop: spacing.md,
  },
  bottom: { padding: spacing.edge, paddingBottom: spacing.xxl },
  signInRow: { flexDirection: 'row', justifyContent: 'center' },
});
