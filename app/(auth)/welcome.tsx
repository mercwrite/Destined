import { Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AppText } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, spacing } from "@/theme";

export default function WelcomeScreen() {
  const router = useRouter();

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

      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <AppText variant="label" color={colors.white} style={{ opacity: 0.9 }}>
            Destined.
          </AppText>
        </View>

        <View style={styles.bottom}>
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
            variant="dark"
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { position: "absolute", top: 0, left: 0, right: 0, height: "62%", zIndex: 0 },
  heroFade: { position: "absolute", left: 0, right: 0, top: 0, height: "62%", zIndex: 0 },
  safe: { flex: 1, justifyContent: "space-between", zIndex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.edge,
    paddingTop: spacing.md,
  },
  bottom: { padding: spacing.edge, paddingBottom: spacing.xxl, backgroundColor: colors.bg },
  signInRow: { flexDirection: "row", justifyContent: "center" },
});
