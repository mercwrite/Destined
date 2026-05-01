import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/app/_layout";

export type LikesBucket = {
  label: string;
  count: number;
  startDate: Date;
};

export type LikesOverTimeResult = {
  buckets: LikesBucket[];
  totalLikes: number;
  periodChange: number | null;
  loading: boolean;
  error: string | null;
};

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function formatLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function useLikesOverTime(): LikesOverTimeResult {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [result, setResult] = useState<LikesOverTimeResult>({
    buckets: [],
    totalLikes: 0,
    periodChange: null,
    loading: userId !== null,
    error: null,
  });

  useEffect(() => {
    if (!userId) {
      setResult({ buckets: [], totalLikes: 0, periodChange: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    async function fetchLikes() {
      setResult((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase
        .from("swipes")
        .select("created_at")
        .eq("swiped_id", userId)
        .eq("direction", "right")
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        setResult({ buckets: [], totalLikes: 0, periodChange: null, loading: false, error: error.message });
        return;
      }

      if (!data || data.length === 0) {
        setResult({ buckets: [], totalLikes: 0, periodChange: null, loading: false, error: null });
        return;
      }

      const timestamps = data.map((row) => new Date(row.created_at).getTime());
      const earliest = timestamps[0];
      const now = Date.now();

      const buckets: LikesBucket[] = [];
      let bucketStart = earliest;

      while (bucketStart <= now) {
        const bucketEnd = bucketStart + TWO_WEEKS_MS;
        const count = timestamps.filter((t) => t >= bucketStart && t < bucketEnd).length;
        buckets.push({
          label: formatLabel(new Date(bucketStart)),
          count,
          startDate: new Date(bucketStart),
        });
        bucketStart = bucketEnd;
      }

      const totalLikes = data.length;

      let periodChange: number | null = null;
      if (buckets.length >= 2) {
        const last = buckets[buckets.length - 1];
        const prev = buckets[buckets.length - 2];
        if (prev.count !== 0) {
          periodChange = ((last.count - prev.count) / prev.count) * 100;
        }
      }

      setResult({ buckets, totalLikes, periodChange, loading: false, error: null });
    }

    fetchLikes();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return result;
}
