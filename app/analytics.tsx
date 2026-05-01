import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { AppText } from '@/components/Text';
import LineChart from '@/components/LineChart';
import { usePhotoAnalytics } from '@/hooks/usePhotoAnalytics';
import { useLikesOverTime } from '@/hooks/useLikesOverTime';
import { colors, radii, shadows, spacing } from '@/theme';

const RANK_COLORS: Record<number, string> = {
  1: '#E8A44A',
  2: '#9B9B9B',
  3: '#B8734A',
};

function getRankColor(rank: number): string {
  return RANK_COLORS[rank] ?? colors.inkFaint;
}

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<'photos' | 'likes'>('photos');
  const [chartWidth, setChartWidth] = useState(0);
  const photoAnalytics = usePhotoAnalytics();
  const likesData = useLikesOverTime();
  const router = useRouter();

  const contentStyle = Platform.OS === 'web' ? styles.contentWeb : null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.headerRow, contentStyle]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
            <AppText variant="bodySmall" color={colors.accent}>Back</AppText>
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <AppText variant="h2" color={colors.ink}>Analytics</AppText>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={[styles.tabBar, contentStyle]}>
          <Pressable
            style={[styles.tabItem, activeTab === 'photos' && styles.tabItemActive]}
            onPress={() => setActiveTab('photos')}
          >
            <AppText
              variant="bodySmall"
              color={activeTab === 'photos' ? colors.accent : colors.inkSoft}
            >
              Photos
            </AppText>
          </Pressable>
          <Pressable
            style={[styles.tabItem, activeTab === 'likes' && styles.tabItemActive]}
            onPress={() => setActiveTab('likes')}
          >
            <AppText
              variant="bodySmall"
              color={activeTab === 'likes' ? colors.accent : colors.inkSoft}
            >
              Likes Over Time
            </AppText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'photos' ? (
            <PhotosTab analytics={photoAnalytics} />
          ) : (
            <LikesTab likesData={likesData} chartWidth={chartWidth} setChartWidth={setChartWidth} />
          )}
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

type PhotosTabProps = { analytics: ReturnType<typeof usePhotoAnalytics> };

function PhotosTab({ analytics }: PhotosTabProps) {
  if (analytics.loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (analytics.error) {
    return (
      <View style={styles.errorBanner}>
        <AppText variant="bodySmall" color={colors.danger}>{analytics.error}</AppText>
      </View>
    );
  }

  return (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <AppText variant="h2" color={colors.accent}>{analytics.totalLikes}</AppText>
          <AppText variant="label" color={colors.inkSoft}>Total Likes</AppText>
        </View>
        <View style={styles.statCard}>
          <AppText variant="h2" color={colors.ink}>{analytics.totalImpressions}</AppText>
          <AppText variant="label" color={colors.inkSoft}>Impressions</AppText>
        </View>
        <View style={styles.statCard}>
          <AppText variant="h2" color={colors.success}>
            {analytics.overallLikeRate.toFixed(0)}%
          </AppText>
          <AppText variant="label" color={colors.inkSoft}>Like Rate</AppText>
        </View>
      </View>

      {analytics.photos.length === 0 ? (
        <AppText variant="body" color={colors.inkFaint} align="center">
          Upload photos to see analytics
        </AppText>
      ) : (
        analytics.photos.map((photo, index) => {
          const rank = index + 1;
          return (
            <View key={photo.id} style={styles.photoRow}>
              <AppText variant="h3" color={getRankColor(rank)}>#{rank}</AppText>
              <Image
                source={{ uri: photo.url }}
                style={styles.thumbnail}
                contentFit="cover"
              />
              <View style={styles.photoInfo}>
                <View style={styles.likeBarBg}>
                  <View style={[styles.likeBarFill, { width: `${photo.popularityPct.toFixed(1)}%` as any }]} />
                </View>
                <View style={styles.statsInline}>
                  <AppText variant="caption" color={colors.inkSoft}>👁 {photo.impressions}</AppText>
                  <AppText variant="caption" color={colors.success}>♥ {photo.swipe_right}</AppText>
                  <AppText variant="caption" color={colors.danger}>✕ {photo.swipe_left}</AppText>
                </View>
              </View>
              <AppText variant="bodyMedium" color={colors.accent} style={styles.popularityPct}>
                {photo.popularityPct.toFixed(1)}%
              </AppText>
            </View>
          );
        })
      )}
    </>
  );
}

type LikesTabProps = {
  likesData: ReturnType<typeof useLikesOverTime>;
  chartWidth: number;
  setChartWidth: (w: number) => void;
};

function LikesTab({ likesData, chartWidth, setChartWidth }: LikesTabProps) {
  if (likesData.loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (likesData.error) {
    return (
      <View style={styles.errorBanner}>
        <AppText variant="bodySmall" color={colors.danger}>{likesData.error}</AppText>
      </View>
    );
  }

  const { periodChange } = likesData;
  const periodChangeColor =
    periodChange === null ? colors.inkSoft : periodChange >= 0 ? colors.success : colors.danger;
  const periodChangeText =
    periodChange === null
      ? '—'
      : `${periodChange >= 0 ? '+' : ''}${periodChange.toFixed(1)}%`;

  if (likesData.buckets.length === 0) {
    return (
      <AppText variant="body" color={colors.inkFaint} align="center">
        No likes received yet
      </AppText>
    );
  }

  return (
    <>
      <View
        style={styles.chartCard}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - spacing.md * 2)}
      >
        <AppText variant="label" color={colors.inkSoft} style={styles.chartLabel}>
          Likes over time (2-week buckets)
        </AppText>
        {chartWidth > 0 && (
          <LineChart
            data={likesData.buckets.map((b) => ({ label: b.label, value: b.count }))}
            width={chartWidth}
            height={180}
            color={colors.accent}
          />
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <AppText variant="h2" color={colors.accent}>{likesData.totalLikes}</AppText>
          <AppText variant="label" color={colors.inkSoft}>Total Likes Received</AppText>
        </View>
        <View style={styles.statCard}>
          <AppText variant="h2" color={periodChangeColor}>{periodChangeText}</AppText>
          <AppText variant="label" color={colors.inkSoft}>vs Previous Period</AppText>
        </View>
      </View>

      <AppText variant="caption" color={colors.inkFaint} align="center" style={styles.hintText}>
        Hold any point to see the exact count
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.edge,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    backgroundColor: colors.bg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    marginBottom: -1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.edge,
    gap: spacing.md,
  },
  contentWeb: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  errorBanner: {
    backgroundColor: '#fff0f0',
    borderRadius: radii.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  thumbnail: {
    width: 44,
    height: 58,
    borderRadius: radii.xs,
  },
  photoInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  likeBarBg: {
    height: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: 2,
  },
  likeBarFill: {
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  statsInline: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  popularityPct: {
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  chartLabel: {
    marginBottom: spacing.sm,
  },
  hintText: {
    marginTop: spacing.sm,
  },
});
