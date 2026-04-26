// MatchModal.tsx — celebration overlay when both users like each other.
// Standard celebration per spec — clean, not too dramatic.

import React from 'react';
import { View, Modal, Image, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '../components/Text';
import { Button } from '../components/Button';
import { colors, spacing, radii, gradients, shadows } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSendMessage?: () => void;
  onKeepSwiping?: () => void;
  myPhoto: string;
  theirPhoto: string;
  theirName: string;
  sharedDestination: string;
}

export function MatchModal({
  visible, onClose, onSendMessage, onKeepSwiping,
  myPhoto, theirPhoto, theirName, sharedDestination,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <LinearGradient
        colors={gradients.sunrise}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.root}>
        <AppText variant="label" color={colors.accent} style={{ marginBottom: spacing.md }}>
          ✦ It's a match
        </AppText>

        <AppText variant="display" color={colors.ink} align="center">
          You're both{'\n'}
          <AppText variant="display" color={colors.accent} italic>
            going to {sharedDestination}.
          </AppText>
        </AppText>

        <View style={styles.photoRow}>
          <Image source={{ uri: myPhoto }} style={[styles.photo, styles.photoLeft, shadows.md]} />
          <Image source={{ uri: theirPhoto }} style={[styles.photo, styles.photoRight, shadows.md]} />
          <View style={styles.heart}>
            <AppText style={{ fontSize: 28, color: colors.white }}>♥</AppText>
          </View>
        </View>

        <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginBottom: spacing.xxl, maxWidth: 300 }}>
          Plan the trip together. Start with a message.
        </AppText>

        <View style={styles.actions}>
          <Button label={`Message ${theirName}`} variant="primary" onPress={onSendMessage} />
          <View style={{ height: spacing.sm }} />
          <Button label="Keep swiping" variant="ghost" onPress={onKeepSwiping} />
        </View>

        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <AppText style={{ fontSize: 18, color: colors.inkSoft }}>✕</AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

const PHOTO_SIZE = 140;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.edge,
  },
  photoRow: {
    flexDirection: 'row',
    marginVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radii.lg,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  photoLeft: { transform: [{ rotate: '-6deg' }, { translateX: 16 }] },
  photoRight: { transform: [{ rotate: '6deg' }, { translateX: -16 }] },
  heart: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.accent,
  },
  actions: { width: '100%', maxWidth: 320 },
  closeBtn: {
    position: 'absolute',
    top: spacing.xxxl, right: spacing.lg,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
});
