# Profile Stack — Design Spec
**Date:** 2026-04-26
**Feature:** Swipe tab — profile card stack with like/reject, match detection, photo analytics
**Requirements:** FR-STACK-001 through FR-STACK-008

---

## 1. Summary

Users are presented with a scrollable stack of profile cards in the Swipe tab. They can swipe left (reject) or swipe right (like) — or tap action buttons below the card. When two users mutually like each other a full-screen match modal appears. Photo analytics are updated on every swipe. Previously-swiped profiles are excluded for 30 days before being eligible to reappear.

---

## 2. Database Schema

### New table: `swipes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto-generated |
| `swiper_id` | uuid FK | → profiles(id) ON DELETE CASCADE |
| `swiped_id` | uuid FK | → profiles(id) ON DELETE CASCADE |
| `direction` | text | `'left'` or `'right'` |
| `created_at` | timestamptz | auto-set |

- Unique constraint: `(swiper_id, swiped_id)` — one swipe per pair
- Index: `(swiper_id, created_at)` — fast exclusion queries
- RLS: users can only insert/read rows where `swiper_id = auth.uid()`

### New table: `matches`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto-generated |
| `user1_id` | uuid FK | → profiles(id) ON DELETE CASCADE |
| `user2_id` | uuid FK | → profiles(id) ON DELETE CASCADE |
| `created_at` | timestamptz | auto-set |

- `user1_id` is always the lexicographically smaller UUID string (i.e. `min(a,b)`) to prevent duplicate rows for the same pair
- Unique constraint: `(user1_id, user2_id)`
- RLS: users can read rows where they are `user1_id` OR `user2_id`

### Existing table: `profile_photos` (updated on each swipe)
Columns `swipe_left`, `swipe_right`, and `impressions` already exist. On each swipe, the swiped user's `display_order = 0` photo is incremented accordingly.

---

## 3. Profile Selection Algorithm

Runs client-side via Supabase JS SDK. Fetches a batch of 20 profiles:

**Filters applied:**
1. `is_active = true` and `is_discoverable = true`
2. Exclude the current user's own profile
3. Exclude profiles swiped within the last 30 days (FR-STACK-008)
4. Match `preferred_genders` from `user_settings` (skipped if array is empty)
5. Match `preferred_age_min` / `preferred_age_max` from `user_settings`

**Ordering:** `RANDOM()` — no ranking at this stage.

**Batch size:** 20 profiles per fetch. Queue refills automatically when ≤ 5 remain.

**Distance filtering:** Deferred. `location_lat`/`location_lng` exist on profiles but PostGIS is not installed. City name is shown on the card as informational only.

---

## 4. Front-end Components

### `hooks/useSwipeQueue.ts`
Owns all queue state. Responsibilities:
- Fetch initial batch of 20 on mount
- Expose `currentProfile`, `nextProfiles` (for stack depth rendering), `isLoading`, `isEmpty`
- `recordSwipe(direction: 'left' | 'right')`: advances the queue, writes swipe to DB, updates photo analytics, checks for match
- Background refill when queue drops to ≤ 5

### `components/SwipeCard.tsx`
Wraps `ProfileCard` with gesture interaction:
- `Pan` gesture from `react-native-gesture-handler` drives `useSharedValue` for x/y + derived rotation
- LIKE (green) / NOPE (red) label overlays fade in as card moves past 30px horizontal threshold
- Release past 120px → card flies off screen, calls `onSwipe('left' | 'right')`
- Release below threshold → spring back to center with `withSpring`
- Props: `profile`, `onSwipe`, `isTop` (only top card receives gestures)

### `components/SwipeStack.tsx`
Renders top 3 profiles stacked with depth illusion:
- Card 1 (top): full size, receives gestures
- Card 2: 96% scale, 8px down offset
- Card 3: 92% scale, 16px down offset
- Re-renders when queue advances

### `components/MatchModal.tsx`
Full-screen animated overlay on mutual like:
- Fades in with scale animation (`withSpring`)
- Shows both users' top photos side-by-side in circles
- "It's a Match!" heading
- **Send a Message** button → `router.push('/(tabs)/matches')`
- **Keep Swiping** button → dismisses modal, swiping continues

### `app/(tabs)/swipe.tsx` (rewrite)
Composes the screen:
- Uses `useSwipeQueue`
- Renders `SwipeStack` + ✕ / ♥ action buttons below
- ✕ and ♥ buttons write to a `programmaticSwipe` shared value on `SwipeCard` (via `useImperativeHandle` ref) to trigger the fly-off animation, then call `recordSwipe`
- Shows `MatchModal` when `matchedProfile` is set
- Loading state: spinner while initial fetch runs
- Empty state: "You've seen everyone nearby. Check back later." + refresh button

---

## 5. Data Flow

### Swipe right (like) or ♥ tap
1. Card animates off-screen right
2. `recordSwipe('right')` fires (optimistic — UI already advanced)
3. In parallel:
   - INSERT into `swipes` (`direction = 'right'`)
   - UPDATE `profile_photos` — increment `swipe_right` + `impressions` on swiped user's top photo
4. Query: check for reciprocal like (`swipes` where `swiper_id = swiped_id AND swiped_id = current_user_id AND direction = 'right'`)
5. If reciprocal exists → INSERT into `matches` (canonical UUID order) → show `MatchModal`
6. If queue ≤ 5 → background fetch of next 20

### Swipe left (reject) or ✕ tap
1. Card animates off-screen left
2. `recordSwipe('left')` fires
3. INSERT into `swipes` (`direction = 'left'`)
4. UPDATE `profile_photos` — increment `swipe_left` + `impressions` on swiped user's top photo
5. No match check needed

---

## 6. Error Handling

| Scenario | Behavior |
|---|---|
| Initial fetch fails | Retry once; if still failing, show inline error banner with "Try again" button |
| Swipe write fails | Log silently — UI already advanced (optimistic). No retry for MVP. |
| Match INSERT conflict (duplicate) | Swallow error — match row already exists, which is correct |
| Queue empty | Show "You've seen everyone nearby" empty state with refresh button |

---

## 7. UI Decisions

| Decision | Choice |
|---|---|
| Swipe input | Gesture + action buttons (✕ / ♥) below the card |
| Match notification | Full-screen modal overlay |
| Algorithm | Filter-only (no ranking) |
| Exclusion window | 30 days |
| Batch size | 20 profiles |
| Distance filter | Deferred to future milestone |

---

## 8. Files Created / Modified

| File | Action |
|---|---|
| `app/(tabs)/swipe.tsx` | Rewrite — full swipe screen |
| `components/SwipeCard.tsx` | Create — gesture-wrapped profile card |
| `components/SwipeStack.tsx` | Create — depth-stacked card renderer |
| `components/MatchModal.tsx` | Create — match overlay |
| `hooks/useSwipeQueue.ts` | Create — queue state + DB writes |
| Supabase (via MCP) | Migration — `swipes` + `matches` tables with RLS |

**Read-only references:**
- `components/ProfileCard.tsx` — the card being wrapped
- `utils/supabase.ts` — client import
- `app/_layout.tsx` — `useAuth` pattern

---

## 9. Out of Scope (this milestone)

- Distance-based filtering (requires PostGIS)
- Super likes
- Undo last swipe
- Push notifications for matches (FR-NC-002) — separate task
- Configurable exclusion period in Settings UI — hardcoded at 30 days for now
