// ChatScreen.tsx — single conversation thread.
// The destination banner at the top reminds both users of the shared trip.

import React, { useState, useRef } from 'react';
import {
  View, Image, ScrollView, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { AppText } from '../components/Text';
import { colors, spacing, radii, typography, shadows } from '../theme';

export interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
}

interface Props {
  partnerName: string;
  partnerPhoto: string;
  destination: string;
  online?: boolean;
  messages: Message[];
  onBack?: () => void;
  onSend: (text: string) => void;
  onOpenProfile?: () => void;
}

export function ChatScreen({
  partnerName, partnerPhoto, destination, online,
  messages, onBack, onSend, onOpenProfile,
}: Props) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
            <AppText style={{ fontSize: 22, color: colors.ink }}>‹</AppText>
          </Pressable>
          <Pressable onPress={onOpenProfile} style={styles.headerCenter}>
            <Image source={{ uri: partnerPhoto }} style={styles.headerAvatar} />
            <View>
              <AppText variant="bodyMedium" color={colors.ink}>{partnerName}</AppText>
              <AppText variant="caption" color={online ? colors.success : colors.inkFaint}>
                {online ? 'Online now' : 'Active recently'}
              </AppText>
            </View>
          </Pressable>
          <Pressable hitSlop={12}>
            <AppText style={{ fontSize: 18, color: colors.inkSoft }}>⋯</AppText>
          </Pressable>
        </View>

        {/* Destination banner — the shared hook */}
        <View style={styles.destBanner}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color={colors.accentDeep}>You're both going to</AppText>
            <AppText variant="h3" color={colors.accentDeep} style={{ marginTop: 2 }}>
              ✈ {destination}
            </AppText>
          </View>
          <Pressable style={styles.planBtn}>
            <AppText variant="caption" color={colors.white} style={{ fontWeight: '600' }}>
              Plan trip
            </AppText>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={80}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.thread}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((m, i) => {
              const showTime = i === 0 || messages[i - 1].time !== m.time;
              return (
                <View key={m.id}>
                  {showTime ? (
                    <AppText variant="caption" color={colors.inkFaint} align="center" style={{ marginVertical: spacing.md }}>
                      {m.time}
                    </AppText>
                  ) : null}
                  <View style={[styles.bubbleRow, m.fromMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
                    <View style={[styles.bubble, m.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                      <AppText
                        variant="body"
                        color={m.fromMe ? colors.white : colors.ink}
                      >
                        {m.text}
                      </AppText>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Composer */}
          <View style={styles.composer}>
            <Pressable style={styles.composerIcon}>
              <AppText style={{ fontSize: 18, color: colors.inkSoft }}>+</AppText>
            </Pressable>
            <View style={styles.inputWrap}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={`Message ${partnerName}…`}
                placeholderTextColor={colors.inkFaint}
                style={styles.input}
                multiline
              />
            </View>
            <Pressable
              onPress={send}
              style={[styles.sendBtn, draft.trim() ? styles.sendBtnActive : null]}
            >
              <AppText style={{ fontSize: 16, color: draft.trim() ? colors.white : colors.inkFaint }}>↑</AppText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.edge,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    gap: spacing.md,
  },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  destBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    marginHorizontal: spacing.edge,
    marginVertical: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  planBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    ...shadows.sm,
  },
  thread: { padding: spacing.edge, paddingTop: 0, paddingBottom: spacing.lg },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleMe: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 6,
  },
  bubbleThem: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    backgroundColor: colors.surface,
  },
  composerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 36,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: colors.ink,
    fontFamily: typography.sans,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.accent,
    ...shadows.accent,
  },
});
