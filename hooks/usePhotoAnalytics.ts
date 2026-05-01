import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/app/_layout';
import type { ProfilePhoto } from '@/components/PhotoGridItem';

export type PhotoAnalytic = ProfilePhoto & {
  popularityPct: number;
  likeRate: number;
};

export type PhotoAnalyticsResult = {
  photos: PhotoAnalytic[];
  totalLikes: number;
  totalImpressions: number;
  overallLikeRate: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function usePhotoAnalytics(): PhotoAnalyticsResult {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [photos, setPhotos] = useState<PhotoAnalytic[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setPhotos([]);
      setTotalLikes(0);
      setTotalImpressions(0);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchPhotos() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profile_photos')
        .select('id, profile_id, url, display_order, impressions, swipe_left, swipe_right')
        .eq('profile_id', userId)
        .order('display_order');

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as ProfilePhoto[];

      const sumLikes = rows.reduce((acc, p) => acc + p.swipe_right, 0);
      const sumImpressions = rows.reduce((acc, p) => acc + p.impressions, 0);

      const analytics: PhotoAnalytic[] = rows
        .map((p) => ({
          ...p,
          popularityPct: sumLikes > 0 ? (p.swipe_right / sumLikes) * 100 : 0,
          likeRate: p.impressions > 0 ? (p.swipe_right / p.impressions) * 100 : 0,
        }))
        .sort((a, b) => b.swipe_right - a.swipe_right);

      setPhotos(analytics);
      setTotalLikes(sumLikes);
      setTotalImpressions(sumImpressions);
      setLoading(false);
    }

    fetchPhotos();

    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  function reload() {
    setTick((t) => t + 1);
  }

  const overallLikeRate =
    totalImpressions > 0 ? (totalLikes / totalImpressions) * 100 : 0;

  return {
    photos,
    totalLikes,
    totalImpressions,
    overallLikeRate,
    loading,
    error,
    reload,
  };
}
