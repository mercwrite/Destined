import { Button } from "@/components/Button";
import { AppText } from "@/components/Text";
import { colors, spacing } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80" }}
        style={styles.hero}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0)", colors.bg]}
        locations={[0.3, 1]}
        style={styles.heroFade}
      />

      {/* "Destined." label — top-right, respects status bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="label" color={colors.white} style={{ opacity: 0.9 }}>
          Destined.
        </AppText>
      </View>

      {/* Bottom content — absolutely anchored above nav bar / home indicator */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl }]}>
        <AppText variant="label" color={colors.accent} style={{ marginBottom: spacing.md }}>
          — Where to next?
        </AppText>

        <AppText variant="display" color={colors.ink}>
          {"Date by\n"}
          <AppText variant="displayItalic" color={colors.accent}>
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

        <Button
          label="Create account"
          variant="primary"
          onPress={() => router.push("/(auth)/sign-up")}
        />
        <View style={{ height: spacing.md }} />
        <View style={styles.signInRow}>
          <AppText variant="body" color={colors.inkSoft}>
            Already a member?{" "}
          </AppText>
          <AppText
            variant="bodyMedium"
            color={colors.ink}
            style={{ textDecorationLine: "underline" }}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            Sign in
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { position: "absolute", top: 0, left: 0, right: 0, height: "62%" },
  heroFade: { position: "absolute", left: 0, right: 0, top: 0, height: "62%" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.edge,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.edge,
    paddingTop: spacing.edge,
  },
  signInRow: { flexDirection: "row", justifyContent: "center" },
});
