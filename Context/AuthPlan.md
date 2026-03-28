# Authentication Plan — Destined

## Functional Requirements Covered
FR-AUTH-001 through FR-AUTH-006 (Section 3.1 of FUNCREQ.md)

---

## 1. Supabase Database Schema

Supabase manages `auth.users` automatically for credentials (FR-BE-004).
Three tables are added to the `public` schema:

### `profiles`
Stores public profile data linked to the auth user (FR-PROF-001, FR-BE-001).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | FK → auth.users(id) ON DELETE CASCADE |
| name | text | Display name |
| date_of_birth | date | Used to calculate age |
| gender | text | User's gender |
| location_city | text | Approximate city/town |
| location_lat | float8 | GPS latitude |
| location_lng | float8 | GPS longitude |
| destination | text | Desired destination/activity |
| bio | text | Profile bio |
| hobbies | text[] | Array of hobbies/interests |
| relationship_type | text | e.g. short-term, long-term, monogamy |
| is_active | boolean | Default true — for deactivation (FR-SET-002) |
| is_discoverable | boolean | Default true — for stack visibility (FR-SET-004) |
| created_at | timestamptz | Auto-set |
| updated_at | timestamptz | Auto-set |

RLS: users can only read/write their own row.
A `handle_new_user` trigger auto-inserts a row on sign-up.

### `profile_photos`
Per-photo analytics (FR-PROF-001 analytics, FR-BE-003).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| profile_id | uuid FK | → profiles(id) ON DELETE CASCADE |
| url | text | Storage URL |
| display_order | int | Sort order |
| impressions | int | Total views |
| swipe_left | int | Reject count |
| swipe_right | int | Like count |
| created_at | timestamptz | Auto-set |

RLS: owner can manage; all authenticated users can read (for profile cards).

### `user_settings`
Preferences and notification/2FA flags (FR-SET-003, FR-SET-006, FR-SET-007, FR-BE-005).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | FK → auth.users(id) ON DELETE CASCADE |
| preferred_distance_km | int | Default 50 |
| preferred_genders | text[] | Default empty array |
| preferred_age_min | int | Default 18 |
| preferred_age_max | int | Default 99 |
| notify_messages | boolean | Default true |
| notify_matches | boolean | Default true |
| two_fa_enabled | boolean | Default false (FR-AUTH-004 / FR-SET-007) |
| created_at | timestamptz | Auto-set |
| updated_at | timestamptz | Auto-set |

RLS: users can only read/write their own row.
Auto-inserted by the same `handle_new_user` trigger as profiles.

---

## 2. Routing Structure

```
app/
├── _layout.tsx              # MODIFY: session listener + auth guard redirect
├── index.tsx                # MODIFY: redirect based on session
└── (auth)/
    ├── _layout.tsx          # NEW: Stack layout, no header
    ├── welcome.tsx          # NEW: Landing — "Sign In" / "Sign Up" buttons
    ├── sign-in.tsx          # NEW: Email + password form
    ├── sign-up.tsx          # NEW: Email + password + confirm form
    └── forgot-password.tsx  # NEW: Send reset link by email
```

---

## 3. Auth Guard (`app/_layout.tsx`)

- Listen to `supabase.auth.onAuthStateChange` in a `useEffect`.
- Show loading state while session is resolving.
- No session → `router.replace('/(auth)/welcome')`
- Session exists → `router.replace('/(tabs)/swipe')`
- Exposes an `AuthContext` so any screen can trigger sign-out.

---

## 4. Auth Screens

### `welcome.tsx`
- Destined logo + tagline
- **Sign Up** → `/(auth)/sign-up`
- **Log In** → `/(auth)/sign-in`

### `sign-up.tsx` (FR-AUTH-001, FR-AUTH-006)
- Fields: Email, Password, Confirm Password
- `supabase.auth.signUp({ email, password })`
- On success: prompt user to check their email to confirm (FR-AUTH-006)

### `sign-in.tsx` (FR-AUTH-002, FR-AUTH-003)
- Fields: Email, Password
- "Forgot password?" link
- `supabase.auth.signInWithPassword({ email, password })`
- Session persistence handled by `persistSession: true` in `utils/supabase.ts` (FR-AUTH-003)

### `forgot-password.tsx` (FR-AUTH-005)
- Field: Email
- `supabase.auth.resetPasswordForEmail(email)`
- On success: "Check your email for a reset link"

---

## 5. 2FA (FR-AUTH-004)
Supabase MFA (`supabase.auth.mfa.*`) supports TOTP. Device-fingerprint detection is deferred. The `two_fa_enabled` field in `user_settings` reserves the toggle; full 2FA setup is a separate task (FR-SET-007).

---

## 6. Files to Create / Modify

| File | Action |
|------|--------|
| `app/_layout.tsx` | Modify — auth guard + session listener |
| `app/index.tsx` | Modify — session-aware redirect |
| `app/(auth)/_layout.tsx` | Create |
| `app/(auth)/welcome.tsx` | Create |
| `app/(auth)/sign-in.tsx` | Create |
| `app/(auth)/sign-up.tsx` | Create |
| `app/(auth)/forgot-password.tsx` | Create |
| Supabase (via MCP) | Apply migrations for all three tables |

---

## 7. Verification

1. Confirm tables exist via `list_tables` MCP call.
2. Sign up with new email → confirm email → verify auto-created `profiles` and `user_settings` rows.
3. Sign in → verify redirect to `/(tabs)/swipe`.
4. Reopen app → verify session persists (no auth screen).
5. Submit forgot-password → verify reset email received.
6. Sign out → verify redirect to welcome screen.
