import { Alert, ActivityIndicator, Modal, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
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

  async function handleSignOut() {
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

  const accountItems: SettingItem[] = [
    { label: "Email", value: session?.user?.email ?? "—" },
    { label: "Change password", onPress: () => router.push("/(auth)/forgot-password") },
  ];

  const prefsItems: SettingItem[] = [
    { label: "Discovery preferences", onPress: () => setDiscoveryVisible(true) },
    { label: "Notifications", onPress: () => {} },
    { label: "Privacy", onPress: () => {} },
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
              item={{ label: "Sign out", onPress: handleSignOut, danger: true }}
              last
            />
          </Card>
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
  modalStatus: {
    marginTop: spacing.sm,
  },
  modalActions: {
    marginTop: spacing.lg,
  },
});
