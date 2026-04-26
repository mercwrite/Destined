import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/app/_layout';
import type { ProfileCardData } from '@/components/ProfileCard';
import type { ProfilePhoto } from '@/components/PhotoGridItem';

// ── Constants ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 20;
const REFILL_THRESHOLD = 5;
const EXCLUSION_DAYS = 30;

// ── Types ─────────────────────────────────────────────────────────────────────

type SwipeDirection = 'left' | 'right';

export type SwipeQueueResult = {
  currentProfile: ProfileCardData | null;
  nextProfiles: ProfileCardData[];
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
  matchedProfile: ProfileCardData | null;
  recordSwipe: (direction: SwipeDirection) => Promise<void>;
  clearMatch: () => void;
  retry: () => void;
};

// ── Raw DB row type returned from profiles query ──────────────────────────────

type RawProfileRow = {
  id: string;
  name: string | null;
  date_of_birth: string | null;
  bio: string | null;
  location_city: string | null;
  gender: string | null;
  destination: string | null;
  hobbies: string[] | null;
  relationship_type: string | null;
  profile_photos: ProfilePhoto[];
};

// ── Helper: map raw row to ProfileCardData ────────────────────────────────────

function toProfileCardData(row: RawProfileRow): ProfileCardData {
  const photos = (row.profile_photos ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order);
  return {
    id: row.id,
    name: row.name,
    date_of_birth: row.date_of_birth,
    bio: row.bio,
    location_city: row.location_city,
    gender: row.gender,
    destination: row.destination,
    hobbies: row.hobbies,
    relationship_type: row.relationship_type,
    photos,
  };
}

// ── Helper: Fisher-Yates shuffle ──────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Helper: compute DOB bounds from preferred age range ───────────────────────

function ageBounds(minAge: number, maxAge: number): { minDob: string; maxDob: string } {
  const now = new Date();
  const maxDob = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate())
    .toISOString()
    .split('T')[0];
  const minDobDate = new Date(now);
  minDobDate.setFullYear(now.getFullYear() - maxAge - 1);
  minDobDate.setDate(minDobDate.getDate() + 1);
  const minDob = minDobDate.toISOString().split('T')[0];
  return { minDob, maxDob };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSwipeQueue(): SwipeQueueResult {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [queue, setQueue] = useState<ProfileCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<ProfileCardData | null>(null);

  // Track whether a background refill is in progress to avoid double-fetching
  const isRefilling = useRef(false);
  // Keep a stable ref to initialLoad so retry can call it
  const initialLoadRef = useRef<() => Promise<void>>();

  // ── fetchSettings ───────────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    if (!userId) return { preferred_genders: [] as string[], preferred_age_min: 18, preferred_age_max: 99 };

    const { data, error: err } = await supabase
      .from('user_settings')
      .select('preferred_genders, preferred_age_min, preferred_age_max')
      .eq('id', userId)
      .single();

    if (err || !data) {
      return { preferred_genders: [] as string[], preferred_age_min: 18, preferred_age_max: 99 };
    }

    return {
      preferred_genders: (data.preferred_genders as string[]) ?? [],
      preferred_age_min: (data.preferred_age_min as number) ?? 18,
      preferred_age_max: (data.preferred_age_max as number) ?? 99,
    };
  }, [userId]);

  // ── fetchProfiles ───────────────────────────────────────────────────────────

  const fetchProfiles = useCallback(async (): Promise<ProfileCardData[]> => {
    if (!userId) return [];

    // 1. Fetch recent exclusion list (profiles swiped in last EXCLUSION_DAYS days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - EXCLUSION_DAYS);
    const cutoffIso = cutoffDate.toISOString();

    const { data: swipedRows } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', userId)
      .gte('created_at', cutoffIso)
      .limit(BATCH_SIZE * 10);

    const excludedIds: string[] = [userId];
    if (swipedRows && swipedRows.length > 0) {
      for (const row of swipedRows as { swiped_id: string }[]) {
        excludedIds.push(row.swiped_id);
      }
    }

    // 2. Fetch settings for filtering
    const settings = await fetchSettings();
    const { minDob, maxDob } = ageBounds(settings.preferred_age_min, settings.preferred_age_max);

    // 3. Build query
    let query = supabase
      .from('profiles')
      .select(
        'id, name, date_of_birth, bio, location_city, gender, destination, hobbies, relationship_type, profile_photos (id, profile_id, url, display_order, impressions, swipe_left, swipe_right)'
      )
      .eq('is_active', true)
      .eq('is_discoverable', true)
      .not('id', 'in', `(${excludedIds.join(',')})`)
      .gte('date_of_birth', minDob)
      .lte('date_of_birth', maxDob);

    if (settings.preferred_genders.length > 0) {
      query = query.in('gender', settings.preferred_genders);
    }

    const { data, error: err } = await query.limit(BATCH_SIZE * 2);

    if (err || !data) return [];

    const profiles = (data as RawProfileRow[]).map(toProfileCardData);
    // Only shuffle and truncate when we have more candidates than the batch size
    if (profiles.length > BATCH_SIZE) {
      return shuffle(profiles).slice(0, BATCH_SIZE);
    }
    return profiles;
  }, [userId, fetchSettings]);

  // ── initialLoad ─────────────────────────────────────────────────────────────

  const initialLoad = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profiles = await fetchProfiles();
      setQueue(profiles);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load profiles');
    } finally {
      setIsLoading(false);
    }
  }, [fetchProfiles]);

  // Keep ref stable so retry always calls latest version
  useEffect(() => {
    initialLoadRef.current = initialLoad;
  }, [initialLoad]);

  // ── Mount effect ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (userId) {
      initialLoad();
    } else {
      setIsLoading(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background refill ───────────────────────────────────────────────────────

  useEffect(() => {
    if (
      queue.length <= REFILL_THRESHOLD &&
      queue.length > 0 &&
      !isLoading &&
      !isRefilling.current
    ) {
      isRefilling.current = true;
      fetchProfiles()
        .then((profiles) => {
          setQueue((prev) => {
            // Deduplicate by id
            const existingIds = new Set(prev.map((p) => p.id));
            const fresh = profiles.filter((p) => !existingIds.has(p.id));
            return [...prev, ...fresh];
          });
        })
        .catch(() => {
          // Silently swallow refill errors — not critical
        })
        .finally(() => {
          isRefilling.current = false;
        });
    }
  }, [queue.length, isLoading, fetchProfiles]);

  // ── recordSwipe ─────────────────────────────────────────────────────────────

  const recordSwipe = useCallback(
    async (direction: SwipeDirection): Promise<void> => {
      if (!userId || queue.length === 0) return;

      // 1. Capture profile before advancing
      const profile = queue[0];

      // 2. Advance queue
      setQueue((prev) => prev.slice(1));

      // 3. Insert swipe record (fire and forget — don't block UX)
      supabase
        .from('swipes')
        .insert({ swiper_id: userId, swiped_id: profile.id, direction });

      // 4. Update top photo analytics
      const topPhoto = profile.photos[0];
      if (topPhoto) {
        const analyticsUpdate: Record<string, number> = {
          impressions: topPhoto.impressions + 1,
        };
        if (direction === 'right') {
          analyticsUpdate.swipe_right = topPhoto.swipe_right + 1;
        } else {
          analyticsUpdate.swipe_left = topPhoto.swipe_left + 1;
        }
        supabase
          .from('profile_photos')
          .update(analyticsUpdate)
          .eq('id', topPhoto.id)
          .then(({ error }: any) => { if (error) console.warn('Analytics update failed:', error.message); });
      }

      // 5. Check for match on right swipe
      if (direction === 'right') {
        const { data: matchId } = await supabase.rpc('check_and_create_match', {
          p_swiped_id: profile.id,
        });
        if (matchId) {
          setMatchedProfile(profile);
        }
      }
    },
    [userId, queue]
  );

  // ── clearMatch ──────────────────────────────────────────────────────────────

  const clearMatch = useCallback(() => {
    setMatchedProfile(null);
  }, []);

  // ── retry ───────────────────────────────────────────────────────────────────

  const retry = useCallback(() => {
    initialLoadRef.current?.();
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────────

  const currentProfile = queue[0] ?? null;
  const nextProfiles = queue.slice(1, 3);
  const isEmpty = !isLoading && queue.length === 0;

  return {
    currentProfile,
    nextProfiles,
    isLoading,
    isEmpty,
    error,
    matchedProfile,
    recordSwipe,
    clearMatch,
    retry,
  };
}
