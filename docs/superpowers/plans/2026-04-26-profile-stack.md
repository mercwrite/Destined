# Profile Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Swipe tab — a gesture-driven profile card stack where users like or reject candidates, matches are detected, and photo analytics are updated.

**Architecture:** A `useSwipeQueue` hook owns all data logic (fetch, queue, DB writes, match detection). `SwipeCard` wraps the existing `ProfileCard` with pan gestures and LIKE/NOPE overlays. `SwipeStack` renders the top 3 cards for depth. `MatchModal` is shown on mutual like. `swipe.tsx` composes everything with action buttons below the stack.

**Tech Stack:** React Native 0.81, Expo SDK 54, Supabase JS v2, react-native-gesture-handler ~2.28, react-native-reanimated ~4.1, expo-haptics ~15.0, jest-expo, @testing-library/react-native

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| Supabase (MCP) | Migration | `swipes` + `matches` tables with RLS |
| `hooks/useSwipeQueue.ts` | Create | Queue state, fetching, DB writes, match detection |
| `components/SwipeCard.tsx` | Create | Pan gesture + LIKE/NOPE overlays + fly-off animation |
| `components/SwipeStack.tsx` | Create | Top-3 depth-stacked renderer |
| `components/MatchModal.tsx` | Create | Full-screen match overlay |
| `app/(tabs)/swipe.tsx` | Rewrite | Screen composition: stack + buttons + states |
| `__tests__/useSwipeQueue.test.ts` | Create | Hook unit tests |
| `__tests__/MatchModal.test.tsx` | Create | Modal render tests |
| `package.json` | Modify | Add jest-expo test config |

---

## Task 1: Database Migration — swipes + matches tables

**Files:**
- Supabase MCP: `mcp__plugin_supabase_supabase__apply_migration`

- [ ] **Step 1: Apply the migration via Supabase MCP**

Use the `apply_migration` MCP tool with the name `"add_swipes_and_matches"` and the following SQL:

```sql
-- swipes table
CREATE TABLE public.swipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  swiped_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('left', 'right')),
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT swipes_pair_unique UNIQUE (swiper_id, swiped_id)
);

CREATE INDEX swipes_swiper_created_idx ON public.swipes (swiper_id, created_at);

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own swipes"
  ON public.swipes FOR INSERT
  WITH CHECK (auth.uid() = swiper_id);

CREATE POLICY "Users read own swipes"
  ON public.swipes FOR SELECT
  USING (auth.uid() = swiper_id);

-- matches table
CREATE TABLE public.matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT matches_pair_unique UNIQUE (user1_id, user2_id),
  CONSTRAINT matches_canonical_order CHECK (user1_id < user2_id)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users insert matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
```

- [ ] **Step 2: Verify tables exist**

Use the `list_tables` MCP tool and confirm `swipes` and `matches` appear.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add swipes and matches tables with RLS"
```

---

## Task 2: Set Up Test Infrastructure

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `__tests__/smoke.test.ts`

- [ ] **Step 1: Install test packages**

```bash
npx expo install jest-expo @testing-library/react-native
```

- [ ] **Step 2: Add jest config to `package.json`**

Add this `"jest"` block inside `package.json` (at the top level, alongside `"scripts"`):

```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind)"
  ],
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1"
  },
  "setupFilesAfterFramework": []
}
```

- [ ] **Step 3: Write a smoke test to confirm setup**

Create `__tests__/smoke.test.ts`:

```typescript
describe('test infrastructure', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run smoke test**

```bash
npx jest __tests__/smoke.test.ts
```

Expected output:
```
PASS __tests__/smoke.test.ts
  test infrastructure
    ✓ runs
```

- [ ] **Step 5: Commit**

```bash
git add package.json __tests__/smoke.test.ts
git commit -m "chore: add jest-expo test infrastructure"
```

---

## Task 3: `hooks/useSwipeQueue.ts`

**Files:**
- Create: `hooks/useSwipeQueue.ts`
- Create: `__tests__/useSwipeQueue.test.ts`

### Step 1 — Write the failing tests

- [ ] **Step 1: Create `__tests__/useSwipeQueue.test.ts`**

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSwipeQueue } from '@/hooks/useSwipeQueue';

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn().mockResolvedValue({ error: null });
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });

const mockFrom = jest.fn((table: string) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  single: mockSingle,
  then: undefined,
}));

jest.mock('@/utils/supabase', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

// ── Auth mock ─────────────────────────────────────────────────────────────────

jest.mock('@/app/_layout', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-abc' } },
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeProfile = (id: string) => ({
  id,
  name: 'Test',
  date_of_birth: '2000-01-01',
  bio: null,
  location_city: null,
  gender: 'female',
  destination: null,
  hobbies: null,
  relationship_type: null,
  profile_photos: [
    { id: 'photo-1', profile_id: id, url: 'http://x.com/a.jpg',
      display_order: 0, impressions: 0, swipe_left: 0, swipe_right: 0 },
  ],
});

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSwipeQueue', () => {
  it('starts loading then shows first profile', async () => {
    mockFrom.mockImplementation((table) => {
      const base = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      if (table === 'swipes') {
        return { ...base, limit: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === 'user_settings') {
        return {
          ...base,
          single: jest.fn().mockResolvedValue({
            data: { preferred_genders: [], preferred_age_min: 18, preferred_age_max: 99 },
            error: null,
          }),
        };
      }
      if (table === 'profiles') {
        return {
          ...base,
          limit: jest.fn().mockResolvedValue({
            data: [makeProfile('p-1'), makeProfile('p-2')],
            error: null,
          }),
        };
      }
      return { ...base, limit: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useSwipeQueue());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentProfile?.id).toBe('p-1');
    expect(result.current.isEmpty).toBe(false);
  });

  it('recordSwipe left advances the queue and inserts a left swipe', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table) => {
      const base = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      if (table === 'user_settings') {
        return {
          ...base,
          single: jest.fn().mockResolvedValue({
            data: { preferred_genders: [], preferred_age_min: 18, preferred_age_max: 99 },
            error: null,
          }),
        };
      }
      if (table === 'profiles') {
        return {
          ...base,
          limit: jest.fn().mockResolvedValue({
            data: [makeProfile('p-1'), makeProfile('p-2')],
            error: null,
          }),
        };
      }
      if (table === 'swipes') {
        return {
          ...base,
          insert: insertMock,
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'profile_photos') {
        return { ...base, update: updateMock };
      }
      return { ...base, limit: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useSwipeQueue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordSwipe('left');
    });

    expect(result.current.currentProfile?.id).toBe('p-2');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ swiper_id: 'user-abc', swiped_id: 'p-1', direction: 'left' })
    );
  });

  it('recordSwipe right sets matchedProfile when reciprocal like exists', async () => {
    const insertSwipeMock = jest.fn().mockResolvedValue({ error: null });
    const insertMatchMock = jest.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table) => {
      const base = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      if (table === 'user_settings') {
        return {
          ...base,
          single: jest.fn().mockResolvedValue({
            data: { preferred_genders: [], preferred_age_min: 18, preferred_age_max: 99 },
            error: null,
          }),
        };
      }
      if (table === 'profiles') {
        return {
          ...base,
          limit: jest.fn().mockResolvedValue({
            data: [makeProfile('p-1')],
            error: null,
          }),
        };
      }
      if (table === 'swipes') {
        return {
          ...base,
          insert: insertSwipeMock,
          // reciprocal like exists
          single: jest.fn().mockResolvedValue({ data: { id: 'swipe-x' }, error: null }),
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'matches') {
        return { ...base, insert: insertMatchMock };
      }
      if (table === 'profile_photos') {
        return { ...base, update: jest.fn().mockResolvedValue({ error: null }) };
      }
      return { ...base, limit: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useSwipeQueue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordSwipe('right');
    });

    expect(result.current.matchedProfile).not.toBeNull();
    expect(insertMatchMock).toHaveBeenCalled();
  });

  it('clearMatch resets matchedProfile', async () => {
    // Simplified: just verify clearMatch resets the field
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
    }));

    const { result } = renderHook(() => useSwipeQueue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.clearMatch());
    expect(result.current.matchedProfile).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/useSwipeQueue.test.ts
```

Expected: `FAIL` — `Cannot find module '@/hooks/useSwipeQueue'`

### Step 3 — Implement the hook

- [ ] **Step 3: Create `hooks/useSwipeQueue.ts`**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/_layout';
import { supabase } from '@/utils/supabase';
import type { ProfileCardData } from '@/components/ProfileCard';
import type { ProfilePhoto } from '@/components/PhotoGridItem';

const BATCH_SIZE = 20;
const REFILL_THRESHOLD = 5;
const EXCLUSION_DAYS = 30;

type UserSettings = {
  preferred_genders: string[];
  preferred_age_min: number;
  preferred_age_max: number;
};

export type SwipeQueueResult = {
  currentProfile: ProfileCardData | null;
  nextProfiles: ProfileCardData[];
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
  matchedProfile: ProfileCardData | null;
  recordSwipe: (direction: 'left' | 'right') => Promise<void>;
  clearMatch: () => void;
  retry: () => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toProfileCardData(row: any): ProfileCardData {
  const rawPhotos: ProfilePhoto[] = (row.profile_photos ?? [])
    .slice()
    .sort((a: ProfilePhoto, b: ProfilePhoto) => a.display_order - b.display_order);
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
    photos: rawPhotos,
  };
}

export function useSwipeQueue(): SwipeQueueResult {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [queue, setQueue] = useState<ProfileCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<ProfileCardData | null>(null);

  const isFetchingRef = useRef(false);
  const settingsRef = useRef<UserSettings>({
    preferred_genders: [],
    preferred_age_min: 18,
    preferred_age_max: 99,
  });

  const fetchSettings = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('user_settings')
      .select('preferred_genders, preferred_age_min, preferred_age_max')
      .eq('id', userId)
      .single();
    if (data) settingsRef.current = data as UserSettings;
  }, [userId]);

  const fetchProfiles = useCallback(async (): Promise<ProfileCardData[]> => {
    if (!userId || isFetchingRef.current) return [];
    isFetchingRef.current = true;

    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - EXCLUSION_DAYS);

      const { data: swipedRows } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', userId)
        .gte('created_at', cutoff.toISOString())
        .limit(10000);

      const excludedIds = [userId, ...(swipedRows ?? []).map((r: any) => r.swiped_id)];

      const settings = settingsRef.current;
      const maxDob = new Date();
      maxDob.setFullYear(maxDob.getFullYear() - settings.preferred_age_min);
      const minDob = new Date();
      minDob.setFullYear(minDob.getFullYear() - settings.preferred_age_max);

      let query = supabase
        .from('profiles')
        .select(
          'id, name, date_of_birth, bio, location_city, gender, destination, hobbies, relationship_type, profile_photos (id, profile_id, url, display_order, impressions, swipe_left, swipe_right)'
        )
        .eq('is_active', true)
        .eq('is_discoverable', true)
        .gte('date_of_birth', minDob.toISOString().split('T')[0])
        .lte('date_of_birth', maxDob.toISOString().split('T')[0])
        .limit(BATCH_SIZE * 2);

      if (excludedIds.length > 0) {
        query = (query as any).not('id', 'in', `(${excludedIds.join(',')})`);
      }

      if (settings.preferred_genders.length > 0) {
        query = (query as any).in('gender', settings.preferred_genders);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      return shuffle(((data as any[]) ?? []).map(toProfileCardData)).slice(0, BATCH_SIZE);
    } finally {
      isFetchingRef.current = false;
    }
  }, [userId]);

  const initialLoad = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchSettings();
      const profiles = await fetchProfiles();
      setQueue(profiles);
    } catch {
      setError('Could not load profiles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchSettings, fetchProfiles]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  // Background refill
  useEffect(() => {
    if (!isLoading && queue.length <= REFILL_THRESHOLD && queue.length > 0) {
      fetchProfiles().then((more) => {
        if (more.length > 0) {
          setQueue((prev) => [...prev, ...more]);
        }
      });
    }
  }, [queue.length, isLoading, fetchProfiles]);

  const recordSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      const profile = queue[0];
      if (!profile || !userId) return;

      setQueue((prev) => prev.slice(1));

      const { error: swipeError } = await supabase
        .from('swipes')
        .insert({ swiper_id: userId, swiped_id: profile.id, direction });

      if (swipeError) {
        console.error('Swipe write failed:', swipeError.message);
        return;
      }

      const topPhoto = profile.photos[0];
      if (topPhoto) {
        await supabase
          .from('profile_photos')
          .update({
            impressions: topPhoto.impressions + 1,
            ...(direction === 'right'
              ? { swipe_right: topPhoto.swipe_right + 1 }
              : { swipe_left: topPhoto.swipe_left + 1 }),
          })
          .eq('id', topPhoto.id);
      }

      if (direction === 'right') {
        const { data: reciprocal } = await supabase
          .from('swipes')
          .select('id')
          .eq('swiper_id', profile.id)
          .eq('swiped_id', userId)
          .eq('direction', 'right')
          .single();

        if (reciprocal) {
          const user1Id = userId < profile.id ? userId : profile.id;
          const user2Id = userId < profile.id ? profile.id : userId;
          const { error: matchError } = await supabase
            .from('matches')
            .insert({ user1_id: user1Id, user2_id: user2Id });

          if (!matchError || matchError.code === '23505') {
            setMatchedProfile(profile);
          }
        }
      }
    },
    [queue, userId]
  );

  const clearMatch = useCallback(() => setMatchedProfile(null), []);
  const retry = useCallback(() => initialLoad(), [initialLoad]);

  return {
    currentProfile: queue[0] ?? null,
    nextProfiles: queue.slice(1, 3),
    isLoading,
    isEmpty: !isLoading && queue.length === 0,
    error,
    matchedProfile,
    recordSwipe,
    clearMatch,
    retry,
  };
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/useSwipeQueue.test.ts
```

Expected:
```
PASS __tests__/useSwipeQueue.test.ts
  useSwipeQueue
    ✓ starts loading then shows first profile
    ✓ recordSwipe left advances the queue and inserts a left swipe
    ✓ recordSwipe right sets matchedProfile when reciprocal like exists
    ✓ clearMatch resets matchedProfile
```

- [ ] **Step 5: Commit**

```bash
git add hooks/useSwipeQueue.ts __tests__/useSwipeQueue.test.ts
git commit -m "feat: add useSwipeQueue hook with fetch, swipe, and match detection"
```

---

## Task 4: `components/SwipeCard.tsx`

**Files:**
- Create: `components/SwipeCard.tsx`

This component wraps `ProfileCard` with a `Pan` gesture, LIKE/NOPE overlays, and a fly-off animation. It uses `forwardRef` + `useImperativeHandle` so the parent can trigger swipes programmatically (for the action buttons).

- [ ] **Step 1: Create `components/SwipeCard.tsx`**

```typescript
import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import ProfileCard from '@/components/ProfileCard';
import type { ProfileCardData } from '@/components/ProfileCard';

const SWIPE_THRESHOLD = 120;
const FLY_DURATION = 300;

export type SwipeCardRef = {
  swipeLeft: () => void;
  swipeRight: () => void;
};

type Props = {
  profile: ProfileCardData;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
  stackIndex: number;
};

const SwipeCard = forwardRef<SwipeCardRef, Props>(
  ({ profile, onSwipe, isTop, stackIndex }, ref) => {
    const { width: screenWidth } = useWindowDimensions();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    function flyOff(direction: 'left' | 'right') {
      'worklet';
      const target = direction === 'right' ? screenWidth * 1.5 : -screenWidth * 1.5;
      translateX.value = withTiming(target, { duration: FLY_DURATION }, () => {
        runOnJS(onSwipe)(direction);
      });
    }

    useImperativeHandle(ref, () => ({
      swipeLeft: () => flyOff('left'),
      swipeRight: () => flyOff('right'),
    }));

    const panGesture = Gesture.Pan()
      .enabled(isTop)
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY * 0.3;
      })
      .onEnd((e) => {
        if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
          flyOff(e.translationX > 0 ? 'right' : 'left');
        } else {
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      });

    const stackScale = 1 - stackIndex * 0.04;
    const stackOffsetY = stackIndex * 10;

    const cardStyle = useAnimatedStyle(() => {
      const rotate = interpolate(
        translateX.value,
        [-screenWidth / 2, 0, screenWidth / 2],
        [-12, 0, 12],
        Extrapolation.CLAMP
      );
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: isTop ? translateY.value : stackOffsetY },
          { rotate: isTop ? `${rotate}deg` : '0deg' },
          { scale: isTop ? 1 : stackScale },
        ],
      };
    });

    const likeOpacity = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [30, 100], [0, 1], Extrapolation.CLAMP),
    }));

    const nopeOpacity = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [-30, -100], [0, 1], Extrapolation.CLAMP),
    }));

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
          <ProfileCard profile={profile} />

          {/* LIKE overlay */}
          <Animated.View
            style={[styles.label, styles.likeLabel, likeOpacity]}
            pointerEvents="none"
          >
            <Animated.Text style={styles.likeLabelText}>LIKE</Animated.Text>
          </Animated.View>

          {/* NOPE overlay */}
          <Animated.View
            style={[styles.label, styles.nopeLabel, nopeOpacity]}
            pointerEvents="none"
          >
            <Animated.Text style={styles.nopeLabelText}>NOPE</Animated.Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  }
);

SwipeCard.displayName = 'SwipeCard';
export default SwipeCard;

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    top: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: 8,
  },
  likeLabel: {
    left: 20,
    borderColor: '#4ade80',
    transform: [{ rotate: '-15deg' }],
  },
  likeLabelText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 2,
  },
  nopeLabel: {
    right: 20,
    borderColor: '#FF4458',
    transform: [{ rotate: '15deg' }],
  },
  nopeLabelText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF4458',
    letterSpacing: 2,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `SwipeCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/SwipeCard.tsx
git commit -m "feat: add SwipeCard with pan gesture, LIKE/NOPE overlays, and fly-off animation"
```

---

## Task 5: `components/SwipeStack.tsx`

**Files:**
- Create: `components/SwipeStack.tsx`

Renders the top 3 profiles from the queue as a depth stack. Cards 2 and 3 are scaled and offset to give a "deck" effect. Only the top card receives gesture and a ref.

- [ ] **Step 1: Create `components/SwipeStack.tsx`**

```typescript
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import SwipeCard, { SwipeCardRef } from '@/components/SwipeCard';
import type { ProfileCardData } from '@/components/ProfileCard';

type Props = {
  profiles: ProfileCardData[];
  onSwipe: (direction: 'left' | 'right') => void;
  cardRef: React.RefObject<SwipeCardRef>;
};

export default function SwipeStack({ profiles, onSwipe, cardRef }: Props) {
  const displayed = profiles.slice(0, 3);

  return (
    <View style={styles.container}>
      {[...displayed].reverse().map((profile, reversedIndex) => {
        const stackIndex = displayed.length - 1 - reversedIndex;
        const isTop = stackIndex === 0;
        return (
          <SwipeCard
            key={profile.id}
            ref={isTop ? cardRef : undefined}
            profile={profile}
            onSwipe={onSwipe}
            isTop={isTop}
            stackIndex={stackIndex}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/SwipeStack.tsx
git commit -m "feat: add SwipeStack depth renderer for profile card queue"
```

---

## Task 6: `components/MatchModal.tsx`

**Files:**
- Create: `components/MatchModal.tsx`
- Create: `__tests__/MatchModal.test.tsx`

- [ ] **Step 1: Write `__tests__/MatchModal.test.tsx`**

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MatchModal from '@/components/MatchModal';

const makeProfile = (id: string, name: string) => ({
  id,
  name,
  date_of_birth: '2000-01-01',
  bio: null,
  location_city: null,
  gender: null,
  destination: null,
  hobbies: null,
  relationship_type: null,
  photos: [],
});

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('MatchModal', () => {
  it('renders both users names', () => {
    render(
      <MatchModal
        matchedProfile={makeProfile('p-2', 'Sarah')}
        currentUserProfile={makeProfile('p-1', 'Alex')}
        onKeepSwiping={jest.fn()}
      />
    );
    expect(screen.getByText("It's a Match!")).toBeTruthy();
    expect(screen.getByText('You and Sarah liked each other')).toBeTruthy();
  });

  it('calls onKeepSwiping when button is pressed', () => {
    const onKeepSwiping = jest.fn();
    render(
      <MatchModal
        matchedProfile={makeProfile('p-2', 'Sarah')}
        currentUserProfile={makeProfile('p-1', 'Alex')}
        onKeepSwiping={onKeepSwiping}
      />
    );
    fireEvent.press(screen.getByText('Keep Swiping'));
    expect(onKeepSwiping).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx jest __tests__/MatchModal.test.tsx
```

Expected: `FAIL` — `Cannot find module '@/components/MatchModal'`

- [ ] **Step 3: Create `components/MatchModal.tsx`**

```typescript
import { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ProfileCardData } from '@/components/ProfileCard';

type Props = {
  matchedProfile: ProfileCardData;
  currentUserProfile: ProfileCardData | null;
  onKeepSwiping: () => void;
};

export default function MatchModal({ matchedProfile, currentUserProfile, onKeepSwiping }: Props) {
  const router = useRouter();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 16, stiffness: 180 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const myPhoto = currentUserProfile?.photos[0]?.url ?? null;
  const theirPhoto = matchedProfile.photos[0]?.url ?? null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, containerStyle]}>
        <Animated.View style={[styles.content, contentStyle]}>
          <Text style={styles.heading}>It's a Match!</Text>
          <Text style={styles.subheading}>
            You and {matchedProfile.name ?? 'someone'} liked each other
          </Text>

          <View style={styles.avatarRow}>
            <AvatarCircle uri={myPhoto} />
            <View style={styles.heartBadge}>
              <Ionicons name="heart" size={24} color="#fff" />
            </View>
            <AvatarCircle uri={theirPhoto} />
          </View>

          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => {
              onKeepSwiping();
              router.push('/(tabs)/matches' as never);
            }}
          >
            <Text style={styles.messageButtonText}>Send a Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keepSwipingButton} onPress={onKeepSwiping}>
            <Text style={styles.keepSwipingText}>Keep Swiping</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function AvatarCircle({ uri }: { uri: string | null }) {
  return (
    <View style={styles.avatarCircle}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} contentFit="cover" />
      ) : (
        <Ionicons name="person" size={48} color="#C0C0C0" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(66,145,219,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  heading: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 40,
    textAlign: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 48,
    gap: 0,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  heartBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    marginHorizontal: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  messageButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4291db',
  },
  keepSwipingButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  keepSwipingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/MatchModal.test.tsx
```

Expected:
```
PASS __tests__/MatchModal.test.tsx
  MatchModal
    ✓ renders both users names
    ✓ calls onKeepSwiping when button is pressed
```

- [ ] **Step 5: Commit**

```bash
git add components/MatchModal.tsx __tests__/MatchModal.test.tsx
git commit -m "feat: add MatchModal full-screen match overlay"
```

---

## Task 7: Rewrite `app/(tabs)/swipe.tsx`

**Files:**
- Modify: `app/(tabs)/swipe.tsx`

This is the screen that composes everything. It uses `useSwipeQueue` for data, renders `SwipeStack` in the center, action buttons below, and shows `MatchModal` when a match is detected. It also needs `currentUserProfile` to pass to `MatchModal` — fetched once from Supabase on mount.

- [ ] **Step 1: Rewrite `app/(tabs)/swipe.tsx`**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/app/_layout';
import { supabase } from '@/utils/supabase';
import { useSwipeQueue } from '@/hooks/useSwipeQueue';
import SwipeStack from '@/components/SwipeStack';
import MatchModal from '@/components/MatchModal';
import type { SwipeCardRef } from '@/components/SwipeCard';
import type { ProfileCardData } from '@/components/ProfileCard';

export default function SwipeScreen() {
  const { session } = useAuth();
  const {
    currentProfile,
    nextProfiles,
    isLoading,
    isEmpty,
    error,
    matchedProfile,
    recordSwipe,
    clearMatch,
    retry,
  } = useSwipeQueue();

  const topCardRef = useRef<SwipeCardRef>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileCardData | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    supabase
      .from('profiles')
      .select(
        'id, name, date_of_birth, bio, location_city, gender, destination, hobbies, relationship_type, profile_photos (id, profile_id, url, display_order, impressions, swipe_left, swipe_right)'
      )
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          const photos = ((data as any).profile_photos ?? [])
            .slice()
            .sort((a: any, b: any) => a.display_order - b.display_order);
          setCurrentUserProfile({ ...(data as any), photos });
        }
      });
  }, [session?.user?.id]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      await Haptics.impactAsync(
        direction === 'right'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
      await recordSwipe(direction);
    },
    [recordSwipe]
  );

  function handleButtonSwipe(direction: 'left' | 'right') {
    if (direction === 'left') {
      topCardRef.current?.swipeLeft();
    } else {
      topCardRef.current?.swipeRight();
    }
  }

  const allProfiles = currentProfile ? [currentProfile, ...nextProfiles] : [];

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4291db" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#9E9E9E" />
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptySubtitle}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.centered}>
        <Ionicons name="people-outline" size={52} color="#9E9E9E" />
        <Text style={styles.emptyTitle}>You've seen everyone nearby</Text>
        <Text style={styles.emptySubtitle}>Check back later for new profiles</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.stackArea}>
        <SwipeStack
          profiles={allProfiles}
          onSwipe={handleSwipe}
          cardRef={topCardRef}
        />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleButtonSwipe('left')}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={32} color="#FF4458" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleButtonSwipe('right')}
          activeOpacity={0.8}
        >
          <Ionicons name="heart" size={28} color="#4291db" />
        </TouchableOpacity>
      </View>

      {matchedProfile && (
        <MatchModal
          matchedProfile={matchedProfile}
          currentUserProfile={currentUserProfile}
          onKeepSwiping={clearMatch}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  stackArea: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingVertical: 20,
    paddingBottom: 32,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectButton: {
    borderWidth: 1.5,
    borderColor: '#FF4458',
  },
  likeButton: {
    borderWidth: 1.5,
    borderColor: '#4291db',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#4291db',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Step 4: Start the app and manually verify the golden path**

```bash
npx expo start
```

Verify the following:
1. Navigate to the Swipe tab — spinner shows briefly, then a profile card appears
2. Swipe the card right — card flies off, next card animates in from the back
3. Tap the ♥ button — card flies off right with haptic feedback
4. Tap the ✕ button — card flies off left with haptic feedback
5. Drag the card left partway, release below threshold — card snaps back to center
6. Drag far enough left — NOPE label appears, card flies off on release
7. Drag far enough right — LIKE label appears, card flies off on release
8. Tap the ⓘ on a card — info drawer opens with bio/hobbies (existing ProfileCard behavior)
9. When queue empties — "You've seen everyone nearby" empty state shows
10. Check Supabase dashboard: `swipes` table has rows, `profile_photos` impressions/swipe counts increment

- [ ] **Step 5: Verify match flow (if two test accounts available)**
1. Sign in as User A, swipe right on User B
2. Sign in as User B, swipe right on User A
3. Match modal appears on User B's device
4. "Send a Message" navigates to Matches tab

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/swipe.tsx
git commit -m "feat: implement profile stack swipe screen with gesture, buttons, and match modal"
```

---

## Spec Coverage Checklist

| Requirement | Covered by |
|---|---|
| FR-STACK-001: Profile stack sorted/filtered by preferences | `useSwipeQueue` fetch + filters |
| FR-STACK-002: Swipe left to reject | `SwipeCard` pan gesture + ✕ button |
| FR-STACK-003: Swipe right to like | `SwipeCard` pan gesture + ♥ button |
| FR-STACK-004: Front face shows photo, name, age, city, destination | Existing `ProfileCard` |
| FR-STACK-005: Expand card for bio, hobbies, photos, relationship type | Existing `ProfileCard` info drawer |
| FR-STACK-006: Next card shown after swipe | `useSwipeQueue.recordSwipe` advances queue |
| FR-STACK-007: Swiped profiles excluded from future stack | `swipes` table + exclusion query in `fetchProfiles` |
| FR-STACK-008: Configurable exclusion period (30 days) | `EXCLUSION_DAYS = 30` constant in `useSwipeQueue` |
| FR-PROF-002/003: Photo analytics updated on swipe | `profile_photos` update in `recordSwipe` |
| DB schema: swipes + matches tables | Task 1 migration |
