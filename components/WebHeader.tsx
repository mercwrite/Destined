import { Image, StyleSheet, Text, View } from "react-native";

export default function WebHeader() {
  return (
    <View style={styles.header}>
      <Image
        source={require("../assets/images/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Destined</Text>
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
    color: "#E91E63",
    letterSpacing: 0.5,
  },
});
