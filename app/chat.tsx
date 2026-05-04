import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText } from '@/components/Text';
import ProfileCard, { type ProfileCardData } from '@/components/ProfileCard';
import { useAuth } from '@/app/_layout';
import { supabase } from '@/utils/supabase';
import { useMessages } from '@/hooks/useMessages';
import { colors, radii, shadows, spacing, typography } from '@/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const PHOTO_SELECT = 'id, profile_id, url, display_order, impressions, swipe_left, swipe_right';

type SearchParams = {
  matchId?: string;
  partnerId?: string;
  partnerName?: string;
  partnerPhoto?: string;
  destination?: string;
  online?: string;
  starred?: string;
  isUser1?: string;
};

export default function ChatScreen() {
  const params = useLocalSearchParams<SearchParams>();
  const router = useRouter();
  const matchId = params.matchId ?? '';
  const partnerId = params.partnerId ?? '';
  const partnerName = params.partnerName ?? 'Your match';
  const partnerPhoto = params.partnerPhoto ?? '';
  const destination = params.destination ?? '';
  const online = params.online === 'true';
  const isUser1 = params.isUser1 === 'true';

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const [profilePreview, setProfilePreview] = useState<ProfileCardData | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [starred, setStarred] = useState(params.starred === 'true');
  const [menuVisible, setMenuVisible] = useState(false);

  const { session } = useAuth();
  const currentUserId = session?.user?.id;

  const { messages, loading, error, loadMessages, sendMessage, subscribeToMessages } = useMessages();

  useEffect(() => {
    if (!matchId) return;
    loadMessages(matchId);
    subscribeToMessages(matchId);
  }, [matchId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !matchId) return;
    try {
      await sendMessage(matchId, text);
      setDraft('');
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch {
      // error state handled by useMessages
    }
  };

  const handleAvatarPress = async () => {
    if (!partnerId) return;
    if (profilePreview) { setShowProfile(true); return; }
    setProfileLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select(`id, name, date_of_birth, bio, location_city, gender, destination, hobbies, relationship_type, profile_photos(${PHOTO_SELECT})`)
      .eq('id', partnerId)
      .single();
    if (data) {
      const photos = ((data as any).profile_photos ?? [])
        .slice()
        .sort((a: any, b: any) => a.display_order - b.display_order);
      setProfilePreview({ ...(data as any), photos });
    }
    setProfileLoading(false);
    setShowProfile(true);
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web') return;
    const native = e.nativeEvent as any;
    if (native.key === 'Enter' && !native.shiftKey) {
      e.preventDefault?.();
      send();
    }
  };

  const handleStar = async () => {
    setMenuVisible(false);
    const newStarred = !starred;
    const column = isUser1 ? 'starred_by_user1' : 'starred_by_user2';
    const { error: err } = await supabase
      .from('matches')
      .update({ [column]: newStarred })
      .eq('id', matchId);
    if (!err) setStarred(newStarred);
  };

  const doUnmatch = async () => {
    await supabase.from('matches').delete().eq('id', matchId);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/matches');
  };

  const handleUnmatch = () => {
    setMenuVisible(false);
    if (Platform.OS === 'web') {
      if ((window as any).confirm(`Unmatch with ${partnerName}? This will permanently delete your conversation.`)) {
        doUnmatch();
      }
    } else {
      Alert.alert(
        'Unmatch',
        `Unmatch with ${partnerName}? This will permanently delete your conversation.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unmatch', style: 'destructive', onPress: doUnmatch },
        ]
      );
    }
  };

  const doBlock = async () => {
    if (!currentUserId) return;
    await supabase.from('blocked_users').insert({
      blocker_id: currentUserId,
      blocked_id: partnerId,
    });
    await supabase.from('matches').delete().eq('id', matchId);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/matches');
  };

  const handleBlock = () => {
    setMenuVisible(false);
    if (Platform.OS === 'web') {
      if ((window as any).confirm(`Block and unmatch ${partnerName}? They won't be able to message you.`)) {
        doBlock();
      }
    } else {
      Alert.alert(
        `Block ${partnerName}?`,
        "They won't be able to message you and will be removed from your matches.",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: doBlock },
        ]
      );
    }
  };

  const chatMessages = messages.map((m) => ({
    id: m.id,
    text: m.content,
    fromMe: m.sender_id === currentUserId,
    time: new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }));

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/matches'))}
            hitSlop={12}
            style={styles.back}
          >
            <AppText style={{ fontSize: 26, color: colors.ink, lineHeight: 30 }}>‹</AppText>
          </Pressable>
          <View style={styles.headerCenter}>
            <Pressable
              onPress={handleAvatarPress}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
              hitSlop={8}
            >
              {partnerPhoto ? (
                <Image source={{ uri: partnerPhoto }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                  <AppText style={{ fontSize: 16, color: colors.inkFaint }}>?</AppText>
                </View>
              )}
            </Pressable>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {starred ? <AppText style={{ fontSize: 11, color: colors.accent }}>★</AppText> : null}
                <AppText variant="bodyMedium" color={colors.ink}>{partnerName}</AppText>
              </View>
              <AppText variant="caption" color={online ? colors.success : colors.inkFaint}>
                {online ? 'Online now' : 'Active recently'}
              </AppText>
            </View>
          </View>
          <Pressable onPress={() => setMenuVisible(true)} hitSlop={12} style={styles.menuBtn}>
            <AppText style={{ fontSize: 20, color: colors.inkSoft }}>⋯</AppText>
          </Pressable>
        </View>

        {/* Destination banner */}
        {destination ? (
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
        ) : null}

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
            {loading ? (
              <AppText variant="caption" color={colors.inkSoft} align="center" style={{ marginVertical: spacing.md }}>
                Loading messages…
              </AppText>
            ) : null}
            {error ? (
              <AppText variant="caption" color={colors.danger} align="center" style={{ marginVertical: spacing.md }}>
                {error}
              </AppText>
            ) : null}
            {!loading && chatMessages.length === 0 ? (
              <AppText variant="caption" color={colors.inkFaint} align="center" style={{ marginVertical: spacing.xl }}>
                Say hello and start planning your trip 👋
              </AppText>
            ) : null}
            {chatMessages.map((m, i) => {
              const showTime = i === 0 || chatMessages[i - 1].time !== m.time;
              return (
                <View key={m.id}>
                  {showTime ? (
                    <AppText
                      variant="caption"
                      color={colors.inkFaint}
                      align="center"
                      style={{ marginVertical: spacing.md }}
                    >
                      {m.time}
                    </AppText>
                  ) : null}
                  <View style={[styles.bubbleRow, m.fromMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
                    <View style={[styles.bubble, m.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                      <AppText variant="body" color={m.fromMe ? colors.white : colors.ink}>
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
            <View style={styles.inputWrap}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={`Message ${partnerName}…`}
                placeholderTextColor={colors.inkFaint}
                style={styles.input}
                multiline
                onKeyPress={handleKeyPress}
              />
            </View>
            <Pressable
              onPress={send}
              disabled={!draft.trim()}
              style={[styles.sendBtn, draft.trim() ? styles.sendBtnActive : styles.sendBtnDisabled]}
            >
              <AppText style={{ fontSize: 16, color: draft.trim() ? colors.white : colors.inkFaint }}>↑</AppText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Profile preview modal */}
      {showProfile && profilePreview ? (
        <Modal
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setShowProfile(false)}
        >
          <View style={styles.previewBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowProfile(false)} />
            <View style={styles.previewSheet}>
              <View style={styles.previewHandle} />
              <View style={styles.previewCard}>
                <ProfileCard profile={profilePreview} />
              </View>
              <Pressable style={styles.previewClose} onPress={() => setShowProfile(false)}>
                <AppText variant="bodyMedium" color={colors.inkSoft}>Close</AppText>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Three-dots action menu */}
      {menuVisible ? (
        <Modal
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
            <View
              style={[
                styles.menuSheet,
                Platform.OS === 'web' ? styles.menuSheetWeb : styles.menuSheetMobile,
              ]}
            >
              <View style={styles.menuHandle} />

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  Platform.OS !== 'web' && { paddingVertical: 22 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleStar}
              >
                <AppText style={[styles.menuItemStar, Platform.OS !== 'web' && { fontSize: 20, lineHeight: 24 }]}>
                  {starred ? '★' : '☆'}
                </AppText>
                <AppText variant="body" color={colors.ink} style={Platform.OS !== 'web' && { fontSize: 17 }}>
                  {starred ? 'Unstar conversation' : 'Star conversation'}
                </AppText>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  Platform.OS !== 'web' && { paddingVertical: 22 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleUnmatch}
              >
                <AppText variant="body" color={colors.danger} style={Platform.OS !== 'web' && { fontSize: 17 }}>
                  Unmatch
                </AppText>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  Platform.OS !== 'web' && { paddingVertical: 22 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleBlock}
              >
                <AppText variant="body" color={colors.danger} style={Platform.OS !== 'web' && { fontSize: 17 }}>
                  Block {partnerName}
                </AppText>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  Platform.OS !== 'web' && { paddingVertical: 22 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setMenuVisible(false)}
              >
                <AppText variant="bodyMedium" color={colors.inkSoft} align="center" style={Platform.OS !== 'web' && { fontSize: 17 }}>
                  Cancel
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}
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
  avatarPlaceholder: {
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
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
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: colors.accent, ...shadows.accent },
  sendBtnDisabled: { backgroundColor: colors.surfaceSoft, opacity: 0.5 },
  // Profile preview modal
  previewBackdrop: {
    flex: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewSheet: {
    height: SCREEN_H * 0.88,
    width: Platform.OS === 'web' ? 400 : undefined,
    backgroundColor: colors.bg,
    borderRadius: Platform.OS === 'web' ? radii.xl : undefined,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
  },
  previewHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ruleStrong,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  previewCard: {
    flex: 1,
    marginHorizontal: spacing.edge,
    marginBottom: spacing.md,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  previewClose: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  // Action menu modal
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  menuSheetMobile: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xxl,
  },
  menuSheetWeb: {
    width: 320,
  },
  menuHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ruleStrong,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'web' ? spacing.lg : spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  menuItemStar: {
    fontSize: Platform.OS === 'web' ? 16 : 20,
    lineHeight: Platform.OS === 'web' ? 20 : 24,
    color: colors.accent,
  },
  menuItemText: {
    fontSize: Platform.OS === 'web' ? 15 : 17,
    lineHeight: Platform.OS === 'web' ? 22 : 24,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.rule,
    marginHorizontal: spacing.md,
  },
});
