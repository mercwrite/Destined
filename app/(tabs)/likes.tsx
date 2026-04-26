import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { useAuth } from "@/app/_layout";
import { supabase } from "@/utils/supabase";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/Text";
import { colors, radii, shadows, spacing } from "@/theme";

type LikerProfile = {
  id: string;
  name: string | null;
  date_of_birth: string | null;
  destination: string | null;
  photo_url: string | null;
};

function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function LikesScreen() {
  const { session } = useAuth();
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) { setLoading(false); return; }

    supabase
      .from("swipes")
      .select("swiper_id, profiles!swipes_swiper_id_fkey(id, name, date_of_birth, destination, profile_photos(url, display_order))")
      .eq("swiped_id", userId)
      .eq("direction", "right")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          const mapped: LikerProfile[] = (data as any[]).map((row) => {
            const p = row.profiles;
            const photos = (p?.profile_photos ?? []).sort((a: any, b: any) => a.display_order - b.display_order);
            return {
              id: p?.id ?? row.swiper_id,
              name: p?.name ?? null,
              date_of_birth: p?.date_of_birth ?? null,
              destination: p?.destination ?? null,
              photo_url: photos[0]?.url ?? null,
            };
          });
          setLikers(mapped);
        }
        setLoading(false);
      });
  }, [session?.user?.id]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader eyebrow="People who like you" title="Likes" />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : likers.length === 0 ? (
          <View style={styles.centered}>
            <AppText style={{ fontSize: 40 }}>♡</AppText>
            <AppText variant="h3" color={colors.ink} align="center" style={{ marginTop: spacing.md }}>
              No likes yet
            </AppText>
            <AppText variant="body" color={colors.inkSoft} align="center" style={{ marginTop: spacing.sm, maxWidth: 260 }}>
              Keep swiping — people who like you will appear here.
            </AppText>
          </View>
        ) : (
          <FlatList
            data={likers}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: spacing.sm }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => {
              const age = computeAge(item.date_of_birth);
              return (
                <Pressable style={[styles.card, shadows.md]}>
                  {item.photo_url ? (
                    <Image source={{ uri: item.photo_url }} style={styles.photo} resizeMode="cover" />
                  ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]}>
                      <AppText style={{ fontSize: 40, color: colors.inkFaint }}>?</AppText>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <AppText variant="bodyMedium" color={colors.ink} numberOfLines={1}>
                      {item.name ?? "Someone"}{age !== null ? `, ${age}` : ""}
                    </AppText>
                    {item.destination ? (
                      <AppText variant="caption" color={colors.accent} numberOfLines={1}>
                        ✈ {item.destination}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xxxl,
  },
  grid: {
    paddingHorizontal: spacing.edge,
    paddingBottom: spacing.xxl,
  },
  card: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  photo: {
    width: "100%",
    aspectRatio: 0.85,
  },
  photoPlaceholder: {
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    padding: spacing.sm,
    gap: 2,
  },
});
