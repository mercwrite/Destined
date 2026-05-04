import { AppText } from "@/components/Text";
import { colors } from "@/theme";
import { Image, StyleSheet, View } from "react-native";
export default function WebHeader() {
  return (
    <View style={styles.header}>
      <Image
        source={require("../assets/images/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <AppText style={{ fontSize: 26, color: colors.ink, lineHeight: 30 }}>Destined</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0",
    gap: 12,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4291db",
    letterSpacing: 0.5,
  },
});
