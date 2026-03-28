import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SwipeScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="flame" size={48} color="#E91E63" />
      <Text style={styles.title}>Swipe</Text>
      <Text style={styles.subtitle}>Profile cards will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFAFA",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 14,
    color: "#9E9E9E",
  },
});
