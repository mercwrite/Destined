import { Tabs, Slot, usePathname, useRouter } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WebHeader from "@/components/WebHeader";

type TabConfig = {
  name: string;
  href: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

const TAB_CONFIG: TabConfig[] = [
  { name: "swipe", href: "/(tabs)/swipe", title: "Swipe", icon: "flame-outline", iconFocused: "flame" },
  { name: "likes", href: "/(tabs)/likes", title: "Likes", icon: "heart-outline", iconFocused: "heart" },
  { name: "matches", href: "/(tabs)/matches", title: "Matches", icon: "chatbubbles-outline", iconFocused: "chatbubbles" },
  { name: "profile", href: "/(tabs)/profile", title: "Profile", icon: "person-outline", iconFocused: "person" },
  { name: "settings", href: "/(tabs)/settings", title: "Settings", icon: "settings-outline", iconFocused: "settings-sharp" },
];

const ACTIVE_COLOR = "#4291db";
const INACTIVE_COLOR = "#a09a92";

function WebTabsLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const activeSegment = pathname.split("/")[1] || "swipe";

  return (
    <View style={styles.webContainer}>
      <WebHeader />
      <View style={styles.webTabBar}>
        {TAB_CONFIG.map((tab) => {
          const isActive = activeSegment === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.webTabItem, isActive && styles.webTabItemActive]}
              onPress={() => router.navigate(tab.href as never)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={isActive ? tab.iconFocused : tab.icon}
                size={18}
                color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
              <Text style={[styles.webTabLabel, isActive && styles.webTabLabelActive]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.webContent}>
        <Slot />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  if (Platform.OS === "web") {
    return <WebTabsLayout />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: styles.mobileTabBar,
        tabBarLabelStyle: styles.mobileTabLabel,
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Web layout
  webContainer: {
    flex: 1,
    backgroundColor: "#f7f5f0",
  },
  webTabBar: {
    flexDirection: "row",
    backgroundColor: "#f7f5f0",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26, 22, 18, 0.08)",
    paddingHorizontal: 8,
  },
  webTabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -StyleSheet.hairlineWidth,
  },
  webTabItemActive: {
    borderBottomColor: ACTIVE_COLOR,
  },
  webTabLabel: {
    fontSize: 14,
    color: INACTIVE_COLOR,
    fontWeight: "500",
  },
  webTabLabelActive: {
    color: ACTIVE_COLOR,
    fontWeight: "600",
  },
  webContent: {
    flex: 1,
  },
  // Mobile tab bar
  mobileTabBar: {
    backgroundColor: "#f7f5f0",
    borderTopWidth: 1,
    borderTopColor: "rgba(26, 22, 18, 0.08)",
    paddingTop: 4,
  },
  mobileTabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
});
