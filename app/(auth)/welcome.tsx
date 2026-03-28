import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Destined</Text>
        <Text style={styles.tagline}>Find your perfect match</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/(auth)/sign-up")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/(auth)/sign-in")}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "space-between",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  brand: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#E91E63",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: "#9E9E9E",
    fontWeight: "400",
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#E91E63",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#1A1A1A",
    fontSize: 17,
    fontWeight: "600",
  },
});
