import { Alert, SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/app/_layout";
import { supabase } from "@/utils/supabase";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/Text";
import { Card } from "@/components/Card";
import { colors, spacing, radii } from "@/theme";

type SettingItem = {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();

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

  const accountItems: SettingItem[] = [
    { label: "Email", value: session?.user?.email ?? "—" },
    { label: "Change password", onPress: () => router.push("/(auth)/forgot-password") },
  ];

  const prefsItems: SettingItem[] = [
    { label: "Discovery preferences", onPress: () => {} },
    { label: "Notifications", onPress: () => {} },
    { label: "Privacy", onPress: () => {} },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader eyebrow="Your account" title="Settings" />

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
});
