# Sign-Up Wizard — Design Spec
**Date:** 2026-05-03  
**Status:** Approved

---

## Overview

Replace the existing `app/(auth)/sign-up.tsx` (simple email/password form) with a 6-step onboarding wizard. Tapping "Create account" on the welcome screen enters the wizard directly. No Supabase calls are made until the user completes step 6 — at that point the auth user is created, the profile row is updated, and photos are uploaded in one batch.

---

## Architecture

### File changes
| File | Action |
|------|--------|
| `app/(auth)/sign-up.tsx` | **Rewrite** — full wizard component |
| Supabase migration | **Add** `check_email_available` RPC |

No new files. No changes to `app/_layout.tsx` (auth guard untouched — no session exists during steps 1–5).

### State shape (all local to `sign-up.tsx`)

```typescript
// Wizard form data
name: string
dobMonth: string          // "MM"
dobDay: string            // "DD"
dobYear: string           // "YYYY"
email: string
password: string
photos: Array<{ uri: string; mimeType?: string; fileExt: string }>  // local URIs only
relationshipType: string
gender: string            // "Man" | "Woman"
interestedIn: string      // "Men" | "Women" | "Any"
destination: string       // skippable
bio: string               // skippable
hobbies: string[]         // skippable

// UI state
step: number              // 1–7 (7 = verify-email success screen)
emailAvailable: boolean | null  // null = not yet checked
submitting: boolean
error: string | null
hobbyInput: string        // controlled input for custom hobby entry
```

---

## Steps

### Step 1 — Account Details (required)
- **Header:** back chevron (→ `router.back()` to welcome), step label "1 / 6" top-right
- **Title:** "Let's get started"
- **Fields:**
  - Name — single `TextInput`
  - Date of birth — three side-by-side `TextInput`s: MM / DD / YYYY
  - Email — `TextInput` with `keyboardType="email-address"`, `autoCapitalize="none"`
  - Password — `TextInput` with `secureTextEntry`, minimum 6 characters
- **Inline email error:** red text "Email address is taken!" shown below email field when `emailAvailable === false`; field counts as invalid until a non-taken email is entered
- **Email check:** debounced 600 ms RPC call `check_email_available` as user types; only fires when email passes basic format check
- **Age gate:** helper `calcAge(year, month, day)` — user must be ≥ 18 to proceed
- **"Next" gated on:** name non-empty, valid calendar date, age ≥ 18, email format valid + `emailAvailable === true`, password ≥ 6 chars

### Step 2 — Photos (required)
- **Header:** back chevron, "2 / 6"
- **Title:** "Add your photos"
- **Subtitle:** "At least one required to continue"
- **UI:** 3×3 slot grid; empty slots open `ImagePicker`, occupied slots show photo with × to remove; local URIs stored in state (no upload yet)
- **"Next" gated on:** `photos.length >= 1`

### Step 3 — About You & Looking For (required)
- **Header:** back chevron, "3 / 6"
- **Sections (top to bottom):**
  1. **"I am a…"** — `Chip` selector: Man / Woman (single-select)
  2. **"Interested in…"** — `Chip` selector: Men / Women / Any (single-select)
  3. **"Looking for…"** — `Chip` selector: Short-term / Long-term / Casual / Open (single-select)
- **"Next" gated on:** all three selections made (`gender`, `interestedIn`, `relationshipType` all non-empty)

### Step 4 — Destination (skippable)
- **Header:** back chevron, "Skip" top-right (advances to step 5, preserving any typed value in state), "4 / 6"
- **Title:** "Where do you want to go?"
- **UI:** single `TextInput`
- **"Next" always enabled**

### Step 5 — Bio (skippable)
- **Header:** back chevron, "Skip" top-right (advances to step 6, preserving any typed value), "5 / 6"
- **Title:** "Tell us about yourself"
- **UI:** multiline `TextInput`, `maxLength={300}`, character counter (`{bio.length}/300`)
- **"Next" always enabled**

### Step 6 — Hobbies (skippable)
- **Header:** back chevron, "Skip" top-right (advances to submission, preserving any selected hobbies), "6 / 6"
- **Title:** "What are you into?"
- **UI:** preset `Chip` grid (same 14 options as `profile.tsx`) + custom hobby `TextInput` + add button; custom entries shown as removable chips
- **"Finish" always enabled;** shows `ActivityIndicator` + disabled while `submitting === true`

### Step 7 — Verify Email (success screen)
- **No back arrow**
- **Icon:** envelope (Ionicons `mail-outline`, large)
- **Title:** "Check your inbox"
- **Body:** "We sent a confirmation link to {email}. Tap it to verify your account before signing in."
- **Button:** "Continue to app" → `router.replace('/(tabs)/swipe')`

---

## Submission Logic (Step 6 "Finish")

```
1. setSubmitting(true), setError(null)
2. supabase.auth.signUp({ email, password })
   → on error: setError(msg), setSubmitting(false), return
   → get userId from data.user.id
3. Build ISO DOB: `${dobYear}-${dobMonth.padStart(2,'0')}-${dobDay.padStart(2,'0')}`
4. supabase.from("profiles").update({
     name, date_of_birth, relationship_type,
     gender, interested_in: interestedIn,
     destination: destination || null,
     bio: bio || null,
     hobbies: hobbies.length > 0 ? hobbies : null,
     updated_at: new Date().toISOString()
   }).eq("id", userId)
   → on error: setError(msg), setSubmitting(false), return
5. For each photo in photos[]:
   a. fetch(uri) → blob
   b. upload to photos/{userId}/{uuid}.{ext}
   c. supabase.storage.from("photos").getPublicUrl(path) → publicUrl
   d. supabase.from("profile_photos").insert({ profile_id, url, display_order: index, impressions:0, swipe_left:0, swipe_right:0 })
6. setStep(7)
```

Photo upload errors are non-fatal — log them but don't block the user from reaching step 7.

---

## Email Validation

### Client behaviour
- Fires on every keystroke in the email field, debounced 600 ms
- Only calls RPC if email passes basic format regex (`/.+@.+\..+/`)
- Sets `emailAvailable: true | false`
- `emailAvailable === false` → red "Email address is taken!" below the field; Next button disabled
- `emailAvailable === null` → no inline message (user hasn't typed a valid-format email yet)

### Supabase migrations

**Migration 1 — add `interested_in` column to `profiles`**

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interested_in TEXT;
```

**Migration 2 — `check_email_available` RPC**

```sql
CREATE OR REPLACE FUNCTION public.check_email_available(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(check_email)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO authenticated;
```

---

## Styling Conventions

Follows existing app design system (`theme.ts`):
- Background: `colors.bg` (`#f7f5f0`)
- Primary CTA: `colors.accent` (`#4291db`) — Next / Finish buttons
- Inputs: rounded (`radii.full` or `radii.md`), grey background (`colors.surfaceSoft`), white border (`colors.rule`)
- Typography: `<AppText>` variants only — no bare `<Text>`
- Error text: `colors.danger` (`#d96565`)
- Back chevron + Skip: `colors.inkSoft`
- Progress indicator: "X / 6" label, `colors.inkFaint`
- Wrap each step in `KeyboardAvoidingView` + `ScrollView` with `keyboardShouldPersistTaps="handled"` to ensure buttons visible on mobile

---

## Constraints & Edge Cases

- **Under-18 guard:** `calcAge` checks against today's date; if < 18, DOB fields show an inline error and Next stays disabled
- **Back navigation within wizard:** `step > 1` → `setStep(step - 1)`; step 1 back → `router.back()` to welcome
- **Photo removal:** tapping × on an occupied slot removes the URI from local state; no confirmation needed (nothing is in the DB yet)
- **Submission error recovery:** if signUp or profile update fails, user stays on step 6 with the error message; they can retry without re-entering data
- **Email already registered at submit time:** if `signUp` returns an "already registered" error despite passing the step-1 check (race condition), show the error on step 6 and let the user go back to step 1 via the back chevron
- **No phone number field** — deferred per user decision

---

## Out of Scope

- Phone number collection
- Gender field during onboarding (editable later in profile)
- Location city during onboarding (editable later in profile)
- 2FA setup
- Social sign-in (Google / Apple)
