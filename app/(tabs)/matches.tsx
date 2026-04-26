import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/app/_layout";
import { supabase } from "@/utils/supabase";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/Text";
import { colors, radii, spacing } from "@/theme";

type MatchRow = {
  id: string;
  name: string | null;
  destination: string | null;
  photo_url: string | null;
  matched_at: string;
  online?: boolean;
};

export default function MatchesScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
        created_at,
        user1_id,
        user2_id,
        profiles!matches_user2_id_fkey(id, name, destination, profile_photos(url, display_order))
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error || !data) {
      setLoading(false);
      return;
    }

    const rows: MatchRow[] = (data as any[]).map((m) => {
      const isUser1 = m.user1_id === userId;
      // We need the OTHER user's profile — re-fetch if the join gave us the wrong side
      const p = m.profiles;
      const photos = (p?.profile_photos ?? []).sort((a: any, b: any) => a.display_order - b.display_order);
      return {
        id: m.id,
        name: p?.name ?? null,
        destination: p?.destination ?? null,
        photo_url: photos[0]?.url ?? null,
        matched_at: m.created_at,
      };
    });

    setMatches(rows);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader eyebrow="Your trips" title="Matches" />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : matches.length === 0 ? (
          <View style={styles.centered}>
            <AppText style={{ fontSize: 40 }}>✈</AppText>
            <AppText variant="h3" color={colors.ink} align="center" style={{ marginTop: spacing.md }}>
              No matches yet
            </AppText>
            <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginTop: spacing.sm, maxWidth: 260 }}>
              When you and someone both swipe right, they'll appear here.
            </AppText>
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <MatchRow match={item} />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function MatchRow({ match }: { match: MatchRow }) {
  const timeAgo = formatTime(match.matched_at);

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View style={styles.avatarWrap}>
        {match.photo_url ? (
          <Image source={{ uri: match.photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <AppText style={{ fontSize: 22, color: colors.inkFaint }}>?</AppText>
          </View>
        )}
        <View style={styles.matchBadge}>
          <AppText style={{ fontSize: 9, color: colors.white }}>✦</AppText>
        </View>
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <AppText variant="bodyMedium" color={colors.ink}>
            {match.name ?? "Your match"}
          </AppText>
          <AppText variant="caption" color={colors.inkFaint}>{timeAgo}</AppText>
        </View>
        {match.destination ? (
          <AppText variant="caption" color={colors.accent} style={{ marginTop: 2 }}>
            ✈ {match.destination}
          </AppText>
        ) : null}
        <AppText variant="bodySmall" color={colors.inkSoft} style={{ marginTop: 3 }}>
          Say hello and plan the trip 👋
        </AppText>
      </View>
    </Pressable>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxxl,
    gap: spacing.sm,
  },
  list: { paddingBottom: spacing.xxl },
  separator: {
    height: 1,
    backgroundColor: colors.rule,
    marginLeft: spacing.edge + 56 + spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.edge,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  matchBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
});
