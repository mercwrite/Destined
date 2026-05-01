import {
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/app/_layout";
import { supabase } from "@/utils/supabase";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/Text";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { colors, radii, spacing } from "@/theme";

type SettingItem = {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
};

type DiscoverySettings = {
  preferred_distance_km: number;
  preferred_age_min: number;
  preferred_age_max: number;
  preferred_genders: string[];
  discoverable: boolean;
};

type NotificationSettings = {
  notify_messages: boolean;
  notify_matches: boolean;
};

type BlockedUser = {
  blockId: string;
  blockedId: string;
  name: string;
  photo: string;
};

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other"];

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  // ── Discovery preferences ──────────────────────────────────────────────────
  const [discoveryVisible, setDiscoveryVisible] = useState(false);
  const [discoverySettings, setDiscoverySettings] = useState<DiscoverySettings | null>(null);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false);
  const [isSavingDiscovery, setIsSavingDiscovery] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoverySaved, setDiscoverySaved] = useState(false);

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsSaved, setNotificationsSaved] = useState(false);

  // ── Blocked users ──────────────────────────────────────────────────────────
  const [blockedVisible, setBlockedVisible] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);
  const [blockedError, setBlockedError] = useState<string | null>(null);

  // ── Load discovery preferences ─────────────────────────────────────────────
  useEffect(() => {
    if (!discoveryVisible || !userId) return;

    async function loadDiscoveryPreferences() {
      setIsLoadingDiscovery(true);
      setDiscoveryError(null);
      setDiscoverySaved(false);

      const { data, error } = await supabase
        .from("user_settings")
        .select("preferred_distance_km, preferred_age_min, preferred_age_max, preferred_genders, discoverable")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setDiscoveryError(error.message ?? "Unable to load discovery preferences.");
        setDiscoverySettings(null);
      } else if (data) {
        setDiscoverySettings({
          preferred_distance_km: data.preferred_distance_km ?? 25,
          preferred_age_min: data.preferred_age_min ?? 18,
          preferred_age_max: data.preferred_age_max ?? 99,
          preferred_genders: data.preferred_genders ?? [],
          discoverable: data.discoverable ?? true,
        });
      } else {
        // No user_settings exists, use defaults
        setDiscoverySettings({
          preferred_distance_km: 25,
          preferred_age_min: 18,
          preferred_age_max: 99,
          preferred_genders: [],
          discoverable: true,
        });
      }

      setIsLoadingDiscovery(false);
    }

    loadDiscoveryPreferences();
  }, [discoveryVisible, userId]);

  // ── Load notification preferences ─────────────────────────────────────────
  useEffect(() => {
    if (!notificationsVisible || !userId) return;

    async function loadNotificationPreferences() {
      setIsLoadingNotifications(true);
      setNotificationsError(null);
      setNotificationsSaved(false);

      const { data, error } = await supabase
        .from("user_settings")
        .select("notify_messages, notify_matches")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setNotificationsError(error.message ?? "Unable to load notification preferences.");
        setNotificationSettings(null);
      } else if (data) {
        setNotificationSettings({
          notify_messages: data.notify_messages ?? true,
          notify_matches: data.notify_matches ?? true,
        });
      } else {
        // No user_settings exists, use defaults
        setNotificationSettings({
          notify_messages: true,
          notify_matches: true,
        });
      }

      setIsLoadingNotifications(false);
    }

    loadNotificationPreferences();
  }, [notificationsVisible, userId]);

  // ── Load blocked users ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!blockedVisible || !userId) return;

    async function loadBlockedUsers() {
      setIsLoadingBlocked(true);
      setBlockedError(null);

      const { data, error } = await supabase
        .from("blocked_users")
        .select(`
          id,
          blocked_id,
          blocked_profile:profiles!blocked_users_blocked_id_fkey(id, name, profile_photos(url, display_order))
        `)
        .eq("blocker_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        setBlockedError(error.message ?? "Unable to load blocked users.");
      } else {
        setBlockedUsers(
          (data ?? []).map((b: any) => {
            const photos = (b.blocked_profile?.profile_photos ?? [])
              .slice()
              .sort((a: any, z: any) => a.display_order - z.display_order);
            return {
              blockId: b.id,
              blockedId: b.blocked_id,
              name: b.blocked_profile?.name ?? "Unknown user",
              photo: photos[0]?.url ?? "",
            };
          })
        );
      }

      setIsLoadingBlocked(false);
    }

    loadBlockedUsers();
  }, [blockedVisible, userId]);

  // ── Save discovery preferences ─────────────────────────────────────────────
  async function handleSaveDiscoveryPreferences() {
    if (!userId || !discoverySettings) return;

    setIsSavingDiscovery(true);
    setDiscoveryError(null);

    const { error } = await supabase
      .from("user_settings")
      .upsert({
        id: userId,
        preferred_distance_km: discoverySettings.preferred_distance_km,
        preferred_age_min: discoverySettings.preferred_age_min,
        preferred_age_max: discoverySettings.preferred_age_max,
        preferred_genders: discoverySettings.preferred_genders,
        discoverable: discoverySettings.discoverable,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    setIsSavingDiscovery(false);

    if (error) {
      setDiscoveryError(error.message ?? "Unable to save preferences.");
      setDiscoverySaved(false);
    } else {
      setDiscoverySaved(true);
    }
  }

  function handleToggleGender(gender: string) {
    setDiscoverySettings((current) => {
      if (!current) return current;
      const hasGender = current.preferred_genders.includes(gender);
      return {
        ...current,
        preferred_genders: hasGender
          ? current.preferred_genders.filter((item) => item !== gender)
          : [...current.preferred_genders, gender],
      };
    });
  }

  function handleCloseDiscovery() {
    setDiscoveryVisible(false);
    setDiscoveryError(null);
    setDiscoverySaved(false);
  }

  // ── Save notification preferences ─────────────────────────────────────────
  async function handleSaveNotificationPreferences() {
    if (!userId || !notificationSettings) return;

    setIsSavingNotifications(true);
    setNotificationsError(null);

    const { error } = await supabase
      .from("user_settings")
      .upsert({
        id: userId,
        notify_messages: notificationSettings.notify_messages,
        notify_matches: notificationSettings.notify_matches,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    setIsSavingNotifications(false);

    if (error) {
      setNotificationsError(error.message ?? "Unable to save preferences.");
      setNotificationsSaved(false);
    } else {
      setNotificationsSaved(true);
    }
  }

  function handleCloseNotifications() {
    setNotificationsVisible(false);
    setNotificationsError(null);
    setNotificationsSaved(false);
  }

  // ── Unblock a user ─────────────────────────────────────────────────────────
  async function handleUnblock(blockId: string) {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("id", blockId);
    if (!error) {
      setBlockedUsers((prev) => prev.filter((b) => b.blockId !== blockId));
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  async function handleChangePassword() {
    const email = session?.user?.email;
    if (!email) {
      if (Platform.OS === "web") {
        window.alert("Unable to determine your email address.");
      } else {
        Alert.alert("Error", "Unable to determine your email address.");
      }
      return;
    }

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `We'll send a password reset link to ${email}. Continue?`
      );
      if (confirmed) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
          window.alert(`Error: ${error.message ?? "Unable to send reset link."}`);
        } else {
          window.alert(`Reset link sent to ${email}. Check your inbox.`);
        }
      }
    } else {
      Alert.alert("Send reset link?", `We'll send a password reset link to ${email}.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
              Alert.alert("Error", error.message ?? "Unable to send reset link.");
            } else {
              Alert.alert(
                "Reset link sent",
                `Check your inbox at ${email} for the password reset link.`
              );
            }
          },
        },
      ]);
    }
  }

  // ── Sign out ───────────────────────────────────────────────────────────────
  async function handleSignOut() {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        await supabase.auth.signOut();
      }
    } else {
      Alert.alert("Sign out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]);
    }
  }

  // ── Disable account ────────────────────────────────────────────────────────
  async function handleDisableAccount() {
    if (!userId) return;

    const doDisable = async () => {
      await supabase
        .from("user_settings")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", userId);
      await supabase.auth.signOut();
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Disable your account? Your profile will be hidden from discovery. You can reactivate by logging back in."
        )
      ) {
        await doDisable();
      }
    } else {
      Alert.alert(
        "Disable account",
        "Your profile will be hidden from discovery. You can reactivate by logging back in.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Disable", style: "destructive", onPress: doDisable },
        ]
      );
    }
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (!userId) return;

    const doDelete = async () => {
      const { error } = await supabase.rpc("delete_account");
      if (error) {
        if (Platform.OS === "web") {
          window.alert(`Error: ${error.message}`);
        } else {
          Alert.alert("Error", error.message);
        }
      }
      // Auth state clears automatically via onAuthStateChange → redirects to welcome
    };

    if (Platform.OS === "web") {
      if (window.confirm("Delete your account? This cannot be undone.")) {
        if (
          window.confirm(
            "Are you absolutely sure? All your profile data, matches, and messages will be permanently deleted."
          )
        ) {
          await doDelete();
        }
      }
    } else {
      Alert.alert(
        "Delete account",
        "This will permanently delete your account and all associated data. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete account",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Are you sure?",
                "All your profile data, photos, matches, and messages will be permanently deleted.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Yes, delete everything",
                    style: "destructive",
                    onPress: doDelete,
                  },
                ]
              );
            },
          },
        ]
      );
    }
  }

  // ── Settings lists ─────────────────────────────────────────────────────────
  const accountItems: SettingItem[] = [
    { label: "Email", value: session?.user?.email ?? "—" },
    { label: "Change password", onPress: () => handleChangePassword() },
  ];

  const prefsItems: SettingItem[] = [
    { label: "Discovery preferences", onPress: () => setDiscoveryVisible(true) },
    { label: "Notifications", onPress: () => setNotificationsVisible(true) },
    { label: "Blocked users", onPress: () => setBlockedVisible(true) },
  ];

  const dangerItems: SettingItem[] = [
    { label: "Disable account", onPress: handleDisableAccount, danger: true },
    { label: "Delete account", onPress: handleDeleteAccount, danger: true },
    { label: "Sign out", onPress: handleSignOut, danger: true },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader eyebrow="Your account" title="Settings" />

        {/* ── Discovery preferences modal ──────────────────────────────────── */}
        <Modal
          visible={discoveryVisible}
          animationType="slide"
          transparent
          onRequestClose={handleCloseDiscovery}
        >
          <View style={styles.modalBackdrop}>
            <Card variant="plain" style={styles.modalCard} padding="lg">
              <View style={styles.modalHeader}>
                <AppText variant="h3" color={colors.ink} style={{ flex: 1 }}>
                  Discovery preferences
                </AppText>
                <TouchableOpacity onPress={handleCloseDiscovery} activeOpacity={0.7}>
                  <AppText variant="body" color={colors.accent}>Close</AppText>
                </TouchableOpacity>
              </View>

              {isLoadingDiscovery ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <AppText variant="bodySmall" color={colors.inkSoft} style={styles.modalStatus}>
                    Loading preferences...
                  </AppText>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Discoverable toggle */}
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" color={colors.ink}>
                        Show me in discovery
                      </AppText>
                      <AppText variant="bodySmall" color={colors.inkSoft} style={{ marginTop: spacing.sm }}>
                        When off, your profile won't appear in other users' stacks
                      </AppText>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        setDiscoverySettings((current) =>
                          current ? { ...current, discoverable: !current.discoverable } : current
                        )
                      }
                      activeOpacity={0.7}
                      style={[
                        styles.toggle,
                        discoverySettings?.discoverable ? styles.toggleOn : styles.toggleOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          discoverySettings?.discoverable ? styles.toggleThumbOn : styles.toggleThumbOff,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.toggleDivider} />

                  <View style={styles.inputGroup}>
                    <AppText variant="label" color={colors.inkSoft} style={styles.inputLabel}>
                      Distance (km)
                    </AppText>
                    <TextInput
                      value={discoverySettings?.preferred_distance_km.toString() ?? ""}
                      onChangeText={(value) =>
                        setDiscoverySettings((current) =>
                          current
                            ? { ...current, preferred_distance_km: parseInt(value, 10) || 0 }
                            : current
                        )
                      }
                      keyboardType="number-pad"
                      style={styles.modalInput}
                      placeholder="Distance"
                      placeholderTextColor={colors.inkFaint}
                    />
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldColumn}>
                      <AppText variant="label" color={colors.inkSoft} style={styles.inputLabel}>
                        Min age
                      </AppText>
                      <TextInput
                        value={discoverySettings?.preferred_age_min.toString() ?? ""}
                        onChangeText={(value) =>
                          setDiscoverySettings((current) =>
                            current
                              ? { ...current, preferred_age_min: parseInt(value, 10) || 0 }
                              : current
                          )
                        }
                        keyboardType="number-pad"
                        style={styles.modalInput}
                        placeholder="Min"
                        placeholderTextColor={colors.inkFaint}
                      />
                    </View>
                    <View style={[styles.fieldColumn, styles.fieldColumnRight]}>
                      <AppText variant="label" color={colors.inkSoft} style={styles.inputLabel}>
                        Max age
                      </AppText>
                      <TextInput
                        value={discoverySettings?.preferred_age_max.toString() ?? ""}
                        onChangeText={(value) =>
                          setDiscoverySettings((current) =>
                            current
                              ? { ...current, preferred_age_max: parseInt(value, 10) || 0 }
                              : current
                          )
                        }
                        keyboardType="number-pad"
                        style={styles.modalInput}
                        placeholder="Max"
                        placeholderTextColor={colors.inkFaint}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="label" color={colors.inkSoft} style={styles.inputLabel}>
                      Gender preferences
                    </AppText>
                    <View style={styles.chipRow}>
                      {GENDER_OPTIONS.map((gender) => {
                        const selected = discoverySettings?.preferred_genders.includes(gender);
                        return (
                          <TouchableOpacity
                            key={gender}
                            onPress={() => handleToggleGender(gender)}
                            activeOpacity={0.7}
                            style={[
                              styles.genderChip,
                              selected ? styles.genderChipSelected : styles.genderChipUnselected,
                            ]}
                          >
                            <AppText
                              variant="body"
                              color={selected ? colors.white : colors.ink}
                            >
                              {gender}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {discoveryError ? (
                    <AppText variant="bodySmall" color={colors.danger} style={styles.modalStatus}>
                      {discoveryError}
                    </AppText>
                  ) : null}
                  {discoverySaved ? (
                    <AppText variant="bodySmall" color={colors.success} style={styles.modalStatus}>
                      Saved successfully.
                    </AppText>
                  ) : null}

                  <View style={styles.modalActions}>
                    <Button
                      label="Save preferences"
                      loading={isSavingDiscovery}
                      onPress={handleSaveDiscoveryPreferences}
                      disabled={!discoverySettings || isSavingDiscovery}
                    />
                  </View>
                </ScrollView>
              )}
            </Card>
          </View>
        </Modal>

        {/* ── Notifications modal ──────────────────────────────────────────── */}
        <Modal
          visible={notificationsVisible}
          animationType="slide"
          transparent
          onRequestClose={handleCloseNotifications}
        >
          <View style={styles.modalBackdrop}>
            <Card variant="plain" style={styles.modalCard} padding="lg">
              <View style={styles.modalHeader}>
                <AppText variant="h3" color={colors.ink} style={{ flex: 1 }}>
                  Notifications
                </AppText>
                <TouchableOpacity onPress={handleCloseNotifications} activeOpacity={0.7}>
                  <AppText variant="body" color={colors.accent}>Close</AppText>
                </TouchableOpacity>
              </View>

              {isLoadingNotifications ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <AppText variant="bodySmall" color={colors.inkSoft} style={styles.modalStatus}>
                    Loading preferences...
                  </AppText>
                </View>
              ) : (
                <View>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" color={colors.ink}>Messages</AppText>
                      <AppText variant="bodySmall" color={colors.inkSoft} style={{ marginTop: spacing.sm }}>
                        Get notified about new messages
                      </AppText>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        setNotificationSettings((current) =>
                          current
                            ? { ...current, notify_messages: !current.notify_messages }
                            : current
                        )
                      }
                      activeOpacity={0.7}
                      style={[
                        styles.toggle,
                        notificationSettings?.notify_messages ? styles.toggleOn : styles.toggleOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          notificationSettings?.notify_messages ? styles.toggleThumbOn : styles.toggleThumbOff,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.toggleDivider} />

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" color={colors.ink}>Matches</AppText>
                      <AppText variant="bodySmall" color={colors.inkSoft} style={{ marginTop: spacing.sm }}>
                        Get notified about new matches
                      </AppText>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        setNotificationSettings((current) =>
                          current
                            ? { ...current, notify_matches: !current.notify_matches }
                            : current
                        )
                      }
                      activeOpacity={0.7}
                      style={[
                        styles.toggle,
                        notificationSettings?.notify_matches ? styles.toggleOn : styles.toggleOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          notificationSettings?.notify_matches ? styles.toggleThumbOn : styles.toggleThumbOff,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  {notificationsError ? (
                    <AppText variant="bodySmall" color={colors.danger} style={styles.modalStatus}>
                      {notificationsError}
                    </AppText>
                  ) : null}
                  {notificationsSaved ? (
                    <AppText variant="bodySmall" color={colors.success} style={styles.modalStatus}>
                      Saved successfully.
                    </AppText>
                  ) : null}

                  <View style={styles.modalActions}>
                    <Button
                      label="Save preferences"
                      loading={isSavingNotifications}
                      onPress={handleSaveNotificationPreferences}
                      disabled={!notificationSettings || isSavingNotifications}
                    />
                  </View>
                </View>
              )}
            </Card>
          </View>
        </Modal>

        {/* ── Blocked users modal ──────────────────────────────────────────── */}
        <Modal
          visible={blockedVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setBlockedVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Card variant="plain" style={styles.modalCard} padding="lg">
              <View style={styles.modalHeader}>
                <AppText variant="h3" color={colors.ink} style={{ flex: 1 }}>
                  Blocked users
                </AppText>
                <TouchableOpacity onPress={() => setBlockedVisible(false)} activeOpacity={0.7}>
                  <AppText variant="body" color={colors.accent}>Close</AppText>
                </TouchableOpacity>
              </View>

              {isLoadingBlocked ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              ) : blockedError ? (
                <AppText variant="bodySmall" color={colors.danger} style={styles.modalStatus}>
                  {blockedError}
                </AppText>
              ) : blockedUsers.length === 0 ? (
                <View style={styles.modalLoading}>
                  <AppText variant="body" color={colors.inkSoft} align="center">
                    You haven't blocked anyone.
                  </AppText>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
                  {blockedUsers.map((user, i) => (
                    <View key={user.blockId}>
                      <View style={styles.blockedRow}>
                        {user.photo ? (
                          <Image source={{ uri: user.photo }} style={styles.blockedAvatar} />
                        ) : (
                          <View style={[styles.blockedAvatar, styles.blockedAvatarPlaceholder]}>
                            <AppText style={{ fontSize: 14, color: colors.inkFaint }}>?</AppText>
                          </View>
                        )}
                        <AppText variant="bodyMedium" color={colors.ink} style={{ flex: 1 }}>
                          {user.name}
                        </AppText>
                        <TouchableOpacity
                          onPress={() => handleUnblock(user.blockId)}
                          activeOpacity={0.7}
                          style={styles.unblockBtn}
                        >
                          <AppText variant="bodySmall" color={colors.accent}>Unblock</AppText>
                        </TouchableOpacity>
                      </View>
                      {i < blockedUsers.length - 1 ? (
                        <View style={styles.blockedDivider} />
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              )}
            </Card>
          </View>
        </Modal>

        {/* ── Settings content ─────────────────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="label" color={colors.inkSoft} style={styles.sectionLabel}>
            Account
          </AppText>
          <Card variant="plain" padding={0} style={styles.card}>
            {accountItems.map((item, i) => (
              <SettingRow key={item.label} item={item} last={i === accountItems.length - 1} />
            ))}
          </Card>

          <AppText variant="label" color={colors.inkSoft} style={styles.sectionLabel}>
            Preferences
          </AppText>
          <Card variant="plain" padding={0} style={styles.card}>
            {prefsItems.map((item, i) => (
              <SettingRow key={item.label} item={item} last={i === prefsItems.length - 1} />
            ))}
          </Card>

          <AppText variant="label" color={colors.inkSoft} style={styles.sectionLabel}>
            Danger zone
          </AppText>
          <Card variant="plain" padding={0} style={styles.card}>
            {dangerItems.map((item, i) => (
              <SettingRow key={item.label} item={item} last={i === dangerItems.length - 1} />
            ))}
          </Card>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SettingRow({ item, last }: { item: SettingItem; last: boolean }) {
  const Inner = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <AppText
        variant="body"
        color={item.danger ? colors.danger : colors.ink}
        style={{ flex: 1 }}
      >
        {item.label}
      </AppText>
      {item.value ? (
        <AppText variant="body" color={colors.inkFaint}>{item.value}</AppText>
      ) : item.onPress ? (
        <AppText style={{ fontSize: 16, color: colors.inkFaint }}>›</AppText>
      ) : null}
    </View>
  );

  if (item.onPress) {
    return (
      <TouchableOpacity onPress={item.onPress} activeOpacity={0.7}>
        {Inner}
      </TouchableOpacity>
    );
  }
  return Inner;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.edge,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  sectionLabel: { marginBottom: spacing.sm, marginTop: spacing.lg },
  card: { borderRadius: radii.lg, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.edge,
  },
  modalCard: {
    width: "100%",
    maxWidth: 540,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalLoading: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  fieldColumn: {
    flex: 1,
  },
  fieldColumnRight: {
    marginLeft: spacing.lg,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.sm,
  },
  genderChip: {
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  genderChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  genderChipUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.ruleStrong,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: colors.rule,
    marginVertical: spacing.md,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: radii.full,
    padding: 2,
    justifyContent: "center",
    paddingHorizontal: 3,
    flexShrink: 0,
  },
  toggleOn: {
    backgroundColor: colors.accent,
  },
  toggleOff: {
    backgroundColor: colors.rule,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.white,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  toggleThumbOff: {
    alignSelf: "flex-start",
  },
  modalStatus: {
    marginTop: spacing.sm,
  },
  modalActions: {
    marginTop: spacing.lg,
  },
  // Blocked users
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  blockedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  blockedAvatarPlaceholder: {
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  unblockBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  blockedDivider: {
    height: 1,
    backgroundColor: colors.rule,
    marginLeft: 44 + spacing.md,
  },
});
