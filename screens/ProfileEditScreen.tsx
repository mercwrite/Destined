// ProfileEditScreen.tsx — edit own profile.

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, Pressable, TextInput, SafeAreaView } from 'react-native';
import { AppText } from '../components/Text';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { colors, spacing, radii, typography } from '../theme';

export interface MyProfile {
  name: string;
  age: number;
  location: string;
  destination: string;
  destinationVibe: string;
  bio: string;
  interests: string[];
  photos: string[];                 // up to 6
  lookingFor: 'long' | 'short' | 'casual' | 'unsure';
}

const ALL_INTERESTS = [
  'Hiking', 'Coffee', 'Surf', 'Climbing', 'Cooking', 'Pottery', 'Live music',
  'Film', 'Art', 'Tennis', 'Running', 'Yoga', 'Reading', 'Wine',
];

interface Props {
  profile: MyProfile;
  onSave: (next: MyProfile) => void;
  onClose?: () => void;
}

export function ProfileEditScreen({ profile, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<MyProfile>(profile);

  const update = <K extends keyof MyProfile>(key: K, value: MyProfile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const toggleInterest = (interest: string) => {
    setDraft((d) => ({
      ...d,
      interests: d.interests.includes(interest)
        ? d.interests.filter((i) => i !== interest)
        : [...d.interests, interest],
    }));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header bar */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <AppText variant="bodyMedium" color={colors.inkSoft}>Cancel</AppText>
          </Pressable>
          <AppText variant="h3" color={colors.ink}>Edit profile</AppText>
          <Pressable onPress={() => onSave(draft)} hitSlop={12}>
            <AppText variant="bodyMedium" color={colors.accent}>Save</AppText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.edge, paddingBottom: 80 }}>
          {/* Photos */}
          <AppText variant="label" color={colors.inkSoft} style={styles.section}>Photos</AppText>
          <View style={styles.photoGrid}>
            {Array.from({ length: 6 }).map((_, i) => {
              const uri = draft.photos[i];
              return (
                <Pressable key={i} style={styles.photoSlot}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.photo} />
                  ) : (
                    <View style={[styles.photo, styles.photoEmpty]}>
                      <AppText style={{ fontSize: 24, color: colors.accent }}>+</AppText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Destination — featured */}
          <AppText variant="label" color={colors.accent} style={[styles.section, { marginTop: spacing.xl }]}>
            ✦ Destination — your hook
          </AppText>
          <Card variant="warm" padding="lg" style={{ marginTop: spacing.sm }}>
            <AppText variant="caption" color={colors.inkSoft}>Where do you want to go?</AppText>
            <TextInput
              value={draft.destination}
              onChangeText={(v) => update('destination', v)}
              placeholder="e.g. Lisbon, Tokyo, Joshua Tree"
              placeholderTextColor={colors.inkFaint}
              style={[styles.bigInput, { fontFamily: typography.serif }]}
            />
            <View style={{ height: 1, backgroundColor: colors.rule, marginVertical: spacing.md }} />
            <AppText variant="caption" color={colors.inkSoft}>The vibe</AppText>
            <TextInput
              value={draft.destinationVibe}
              onChangeText={(v) => update('destinationVibe', v)}
              placeholder="long weekend · slow & local · honeymoon scout"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
            />
          </Card>

          {/* Basics */}
          <AppText variant="label" color={colors.inkSoft} style={[styles.section, { marginTop: spacing.xl }]}>
            About you
          </AppText>
          <Card variant="plain" padding="lg" style={{ marginTop: spacing.sm }}>
            <Field label="Name">
              <TextInput value={draft.name} onChangeText={(v) => update('name', v)} style={styles.input} />
            </Field>
            <Divider />
            <Field label="Location">
              <TextInput
                value={draft.location}
                onChangeText={(v) => update('location', v)}
                style={styles.input}
              />
            </Field>
            <Divider />
            <Field label="Bio">
              <TextInput
                value={draft.bio}
                onChangeText={(v) => update('bio', v)}
                multiline
                numberOfLines={4}
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="A few sentences about you"
                placeholderTextColor={colors.inkFaint}
              />
            </Field>
          </Card>

          {/* Interests */}
          <AppText variant="label" color={colors.inkSoft} style={[styles.section, { marginTop: spacing.xl }]}>
            Interests
          </AppText>
          <View style={styles.chipWrap}>
            {ALL_INTERESTS.map((i) => (
              <Chip
                key={i}
                label={i}
                selected={draft.interests.includes(i)}
                onPress={() => toggleInterest(i)}
              />
            ))}
          </View>

          {/* Looking for */}
          <AppText variant="label" color={colors.inkSoft} style={[styles.section, { marginTop: spacing.xl }]}>
            Looking for
          </AppText>
          <View style={styles.chipWrap}>
            {(['long', 'short', 'casual', 'unsure'] as const).map((v) => (
              <Chip
                key={v}
                label={
                  v === 'long' ? 'Long-term' :
                  v === 'short' ? 'Short-term' :
                  v === 'casual' ? 'Casual' : 'Figuring it out'
                }
                selected={draft.lookingFor === v}
                onPress={() => update('lookingFor', v)}
              />
            ))}
          </View>

          <View style={{ height: spacing.xxl }} />
          <Button label="Save changes" variant="primary" onPress={() => onSave(draft)} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <AppText variant="caption" color={colors.inkSoft} style={{ marginBottom: 4 }}>{label}</AppText>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.rule, marginVertical: spacing.md }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.edge,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  section: { marginBottom: spacing.sm },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 0.8,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoEmpty: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.accent,
  },
  bigInput: {
    fontSize: 24,
    color: colors.ink,
    paddingVertical: 4,
    marginTop: 4,
  },
  input: {
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 6,
    fontFamily: typography.sans,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
