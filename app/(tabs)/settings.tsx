import { Alert, ActivityIndicator, Modal, Platform, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/app/_layout";
import { supabase } from "@/utils/supabase";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/Text";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { colors, spacing, radii } from "@/theme";

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
};

type NotificationSettings = {
  notify_messages: boolean;
  notify_matches: boolean;
};

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other"];

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [discoveryVisible, setDiscoveryVisible] = useState(false);
  const [discoverySettings, setDiscoverySettings] = useState<DiscoverySettings | null>(null);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false);
  const [isSavingDiscovery, setIsSavingDiscovery] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoverySaved, setDiscoverySaved] = useState(false);

  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsSaved, setNotificationsSaved] = useState(false);

  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [isDiscoverable, setIsDiscoverable] = useState<boolean | null>(null);
  const [isLoadingPrivacy, setIsLoadingPrivacy] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacySaved, setPrivacySaved] = useState(false);

  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState<string | null>(null);
  const [deactivationSuccess, setDeactivationSuccess] = useState(false);

  async function handleSignOut() {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (confirmed) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          window.alert(`Error signing out: ${error.message}`);
        } else {
          window.alert("You have been signed out.");
          router.replace("/(auth)/sign-in");
        }
      }
    } else {
      Alert.alert("Sign out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert("Error", error.message ?? "Unable to sign out.");
            } else {
              router.replace("/(auth)/sign-in");
            }
          },
        },
      ]);
    }
  }

  useEffect(() => {
    const userId = session?.user?.id;
    if (!discoveryVisible || !userId) return;

    async function loadDiscoveryPreferences() {
      setIsLoadingDiscovery(true);
      setDiscoveryError(null);
      setDiscoverySaved(false);

      const { data, error } = await supabase
        .from("user_settings")
        .select("preferred_distance_km, preferred_age_min, preferred_age_max, preferred_genders")
        .eq("id", userId)
        .single();

      if (error) {
        setDiscoveryError(error.message ?? "Unable to load discovery preferences.");
        setDiscoverySettings(null);
      } else if (data) {
        setDiscoverySettings({
          preferred_distance_km: data.preferred_distance_km ?? 25,
          preferred_age_min: data.preferred_age_min ?? 18,
          preferred_age_max: data.preferred_age_max ?? 99,
          preferred_genders: data.preferred_genders ?? [],
        });
      }

      setIsLoadingDiscovery(false);
    }

    loadDiscoveryPreferences();
  }, [discoveryVisible, session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!notificationsVisible || !userId) return;

    async function loadNotificationPreferences() {
      setIsLoadingNotifications(true);
      setNotificationsError(null);
      setNotificationsSaved(false);

      const { data, error } = await supabase
        .from("user_settings")
        .select("notify_messages, notify_matches")
        .eq("id", userId)
        .single();

      if (error) {
        setNotificationsError(error.message ?? "Unable to load notification preferences.");
        setNotificationSettings(null);
      } else if (data) {
        setNotificationSettings({
          notify_messages: data.notify_messages ?? true,
          notify_matches: data.notify_matches ?? true,
        });
      }

      setIsLoadingNotifications(false);
    }

    loadNotificationPreferences();
  }, [notificationsVisible, session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!privacyVisible || !userId) return;

    async function loadPrivacySettings() {
      setIsLoadingPrivacy(true);
      setPrivacyError(null);
      setPrivacySaved(false);

      const { data, error } = await supabase
        .from("profiles")
        .select("is_discoverable")
        .eq("id", userId)
        .single();

      if (error) {
        setPrivacyError(error.message ?? "Unable to load privacy settings.");
        setIsDiscoverable(null);
      } else {
        setIsDiscoverable(data?.is_discoverable ?? false);
      }

      setIsLoadingPrivacy(false);
    }

    loadPrivacySettings();
  }, [privacyVisible, session?.user?.id]);

  async function handleSaveDiscoveryPreferences() {
    const userId = session?.user?.id;
    if (!userId || !discoverySettings) return;

    setIsSavingDiscovery(true);
    setDiscoveryError(null);

    const { error } = await supabase
      .from("user_settings")
      .update({
        preferred_distance_km: discoverySettings.preferred_distance_km,
        preferred_age_min: discoverySettings.preferred_age_min,
        preferred_age_max: discoverySettings.preferred_age_max,
        preferred_genders: discoverySettings.preferred_genders,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

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

  async function handleSaveNotificationPreferences() {
    const userId = session?.user?.id;
    if (!userId || !notificationSettings) return;

    setIsSavingNotifications(true);
    setNotificationsError(null);

    const { error } = await supabase
      .from("user_settings")
      .update({
        notify_messages: notificationSettings.notify_messages,
        notify_matches: notificationSettings.notify_matches,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

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

  async function performDeactivateAccount() {
    const userId = session?.user?.id;
    if (!userId) return;

    setIsDeactivating(true);
    setDeactivationError(null);
    setDeactivationSuccess(false);

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false, is_discoverable: false })
      .eq("id", userId);

    setIsDeactivating(false);

    if (error) {
      setDeactivationError(error.message ?? "Unable to deactivate your account.");
      return;
    }

    setDeactivationSuccess(true);

    if (Platform.OS === "web") {
      window.alert("Your account has been deactivated. Signing out now.");
    } else {
      Alert.alert("Account deactivated", "Your account has been deactivated. Signing out now.");
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      const message = signOutError.message ?? "Unable to sign out after deactivation.";
      setDeactivationError(message);
      if (Platform.OS === "web") {
        window.alert(`Deactivation succeeded, but sign out failed: ${message}`);
      } else {
        Alert.alert("Sign out failed", message);
      }
      return;
    }

    router.replace("/(auth)/sign-in");
  }

  function handleDeactivateAccount() {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Deactivating your account will hide your profile and sign you out. Continue?"
      );
      if (confirmed) {
        performDeactivateAccount();
      }
    } else {
      Alert.alert(
        "Deactivate account",
        "Deactivating your account will hide your profile and sign you out.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Deactivate",
            style: "destructive",
            onPress: performDeactivateAccount,
          },
        ]
      );
    }
  }

  async function handleSavePrivacySettings() {
    const userId = session?.user?.id;
    if (!userId || isDiscoverable === null) return;

    setIsSavingPrivacy(true);
    setPrivacyError(null);

    const { error } = await supabase
      .from("profiles")
      .update({ is_discoverable: isDiscoverable })
      .eq("id", userId);

    setIsSavingPrivacy(false);

    if (error) {
      setPrivacyError(error.message ?? "Unable to save privacy settings.");
      setPrivacySaved(false);
    } else {
      setPrivacySaved(true);
    }
  }

  function handleClosePrivacy() {
    setPrivacyVisible(false);
    setPrivacyError(null);
    setPrivacySaved(false);
  }

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

  const accountItems: SettingItem[] = [
    { label: "Email", value: session?.user?.email ?? "—" },
    { label: "Change password", onPress: () => handleChangePassword() },
  ];

  const prefsItems: SettingItem[] = [
    { label: "Discovery preferences", onPress: () => setDiscoveryVisible(true) },
    { label: "Notifications", onPress: () => setNotificationsVisible(true) },
    { label: "Privacy", onPress: () => setPrivacyVisible(true) },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader eyebrow="Your account" title="Settings" />

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
                <View>
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
                </View>
              )}
            </Card>
          </View>
        </Modal>

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
                      <AppText variant="body" color={colors.ink}>
                        Messages
                      </AppText>
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
                      <AppText variant="body" color={colors.ink}>
                        Matches
                      </AppText>
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

        <Modal
          visible={privacyVisible}
          animationType="slide"
          transparent
          onRequestClose={handleClosePrivacy}
        >
          <View style={styles.modalBackdrop}>
            <Card variant="plain" style={styles.modalCard} padding="lg">
              <View style={styles.modalHeader}>
                <AppText variant="h3" color={colors.ink} style={{ flex: 1 }}>
                  Privacy
                </AppText>
                <TouchableOpacity onPress={handleClosePrivacy} activeOpacity={0.7}>
                  <AppText variant="body" color={colors.accent}>Close</AppText>
                </TouchableOpacity>
              </View>

              {isLoadingPrivacy ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <AppText variant="bodySmall" color={colors.inkSoft} style={styles.modalStatus}>
                    Loading privacy settings...
                  </AppText>
                </View>
              ) : (
                <View>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" color={colors.ink}>
                        Show my profile in discovery
                      </AppText>
                      <AppText variant="bodySmall" color={colors.inkSoft} style={{ marginTop: spacing.sm }}>
                        Allow others to find you in the swipe queue.
                      </AppText>
                    </View>
                    <TouchableOpacity
                      onPress={() => setIsDiscoverable((current) => (current === null ? true : !current))}
                      activeOpacity={0.7}
                      style={[
                        styles.toggle,
                        isDiscoverable ? styles.toggleOn : styles.toggleOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          isDiscoverable ? styles.toggleThumbOn : styles.toggleThumbOff,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  {privacyError ? (
                    <AppText variant="bodySmall" color={colors.danger} style={styles.modalStatus}>
                      {privacyError}
                    </AppText>
                  ) : null}
                  {privacySaved ? (
                    <AppText variant="bodySmall" color={colors.success} style={styles.modalStatus}>
                      Saved successfully.
                    </AppText>
                  ) : null}

                  <View style={styles.modalActions}>
                    <Button
                      label="Save privacy settings"
                      loading={isSavingPrivacy}
                      onPress={handleSavePrivacySettings}
                      disabled={isSavingPrivacy || isDiscoverable === null}
                    />
                  </View>
                </View>
              )}
            </Card>
          </View>
        </Modal>

        <View style={styles.content}>
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

          <Card variant="plain" padding={0} style={[styles.card, { marginTop: spacing.lg }]}>
            <SettingRow
              item={{ label: "Deactivate account", onPress: isDeactivating ? undefined : () => handleDeactivateAccount(), danger: true }}
              last={false}
            />
            <SettingRow
              item={{ label: "Sign out", onPress: () => handleSignOut(), danger: true }}
              last
            />
          </Card>
          {isDeactivating ? (
            <AppText variant="bodySmall" color={colors.inkSoft} style={styles.deactivationStatus}>
              Deactivating your account...
            </AppText>
          ) : deactivationError ? (
            <AppText variant="bodySmall" color={colors.danger} style={styles.deactivationStatus}>
              {deactivationError}
            </AppText>
          ) : deactivationSuccess ? (
            <AppText variant="bodySmall" color={colors.success} style={styles.deactivationStatus}>
              Account deactivated successfully. Signing out...
            </AppText>
          ) : null}
        </View>
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
  content: { paddingHorizontal: spacing.edge, paddingTop: spacing.sm },
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
  deactivationStatus: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.edge,
  },
  modalActions: {
    marginTop: spacing.lg,
  },
});
