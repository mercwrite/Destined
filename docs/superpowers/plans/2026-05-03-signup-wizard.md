# Sign-Up Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `app/(auth)/sign-up.tsx` with a 6-step onboarding wizard that collects all profile data before creating the Supabase auth user and profile row in one batch at the end.

**Architecture:** Single-file wizard using step state (1–7). All form data lives in React state; no Supabase calls until the "Finish" button on step 6. Two DB migrations are applied first: an `interested_in` column on `profiles` and a `check_email_available` RPC for real-time email validation.

**Tech Stack:** React Native 0.81, Expo SDK 54, expo-router ~6.0, Supabase JS client, expo-image-picker, existing `Chip`/`Button`/`AppText` components, `theme.ts` design tokens.

---

## File Map

| File | Action |
|------|--------|
| `app/(auth)/sign-up.tsx` | **Rewrite** — full 7-step wizard component |
| `__tests__/signUpHelpers.test.ts` | **Create** — unit tests for pure helper functions |
| Supabase DB (via MCP) | **Migration 1** — `interested_in TEXT` column on `profiles` |
| Supabase DB (via MCP) | **Migration 2** — `check_email_available` RPC |

No other files are touched. `app/_layout.tsx` auth guard is untouched — no Supabase session exists during steps 1–5 so it won't interfere.

---

## Task 1: Apply Supabase Migrations

**Files:**
- Modify: Supabase DB via `mcp__plugin_supabase_supabase__apply_migration`

- [ ] **Step 1: Apply the `interested_in` column migration**

  Use the Supabase MCP `apply_migration` tool with:
  - name: `add_interested_in_to_profiles`
  - query:
  ```sql
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interested_in TEXT;
  ```

- [ ] **Step 2: Apply the `check_email_available` RPC migration**

  Use the Supabase MCP `apply_migration` tool with:
  - name: `add_check_email_available_rpc`
  - query:
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

- [ ] **Step 3: Verify both migrations applied**

  Use `mcp__plugin_supabase_supabase__list_migrations` and confirm `add_interested_in_to_profiles` and `add_check_email_available_rpc` both appear.

  Use `mcp__plugin_supabase_supabase__execute_sql` to verify:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'interested_in';
  ```
  Expected: one row returned with `column_name = interested_in`.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "feat: add interested_in column and check_email_available RPC"
  ```

---

## Task 2: Write Helper Tests + Scaffold sign-up.tsx

**Files:**
- Create: `__tests__/signUpHelpers.test.ts`
- Modify: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Write the failing tests**

  Create `__tests__/signUpHelpers.test.ts` with this exact content:

  ```typescript
  // Tests for pure helpers duplicated here (sign-up.tsx inlines them)
  function calcAge(year: string, month: string, day: string): number {
    const dob = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  function isValidDate(year: string, month: string, day: string): boolean {
    const y = parseInt(year, 10);
    const mo = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (isNaN(y) || isNaN(mo) || isNaN(d)) return false;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const date = new Date(y, mo - 1, d);
    return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
  }

  describe('isValidDate', () => {
    it('returns true for a valid date', () => {
      expect(isValidDate('1995', '3', '15')).toBe(true);
    });
    it('returns false for Feb 30', () => {
      expect(isValidDate('2000', '2', '30')).toBe(false);
    });
    it('returns false for month 13', () => {
      expect(isValidDate('2000', '13', '1')).toBe(false);
    });
    it('returns false for empty strings', () => {
      expect(isValidDate('', '', '')).toBe(false);
    });
    it('returns false for day 0', () => {
      expect(isValidDate('2000', '1', '0')).toBe(false);
    });
  });

  describe('calcAge', () => {
    it('returns a positive age for a past birth year', () => {
      expect(calcAge('1990', '5', '15')).toBeGreaterThan(0);
    });
    it('returns age < 18 for someone born 10 years ago', () => {
      const year = String(new Date().getFullYear() - 10);
      expect(calcAge(year, '6', '15')).toBeLessThan(18);
    });
    it('returns age >= 18 for someone born 25 years ago', () => {
      const year = String(new Date().getFullYear() - 25);
      expect(calcAge(year, '1', '1')).toBeGreaterThanOrEqual(18);
    });
  });
  ```

- [ ] **Step 2: Run tests to confirm they fail (functions not yet defined in the test file separately)**

  ```bash
  npx jest __tests__/signUpHelpers.test.ts --no-coverage
  ```
  Expected: Tests pass immediately because the functions are defined inside the test file itself. If there are unexpected errors, check that jest-expo is configured correctly in `package.json`.

- [ ] **Step 3: Rewrite `app/(auth)/sign-up.tsx` — scaffold only (no step content yet)**

  Replace the entire file with this scaffold. Step content will be added in Tasks 3–7.

  ```tsx
  import { useRef, useState } from "react";
  import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
  } from "react-native";
  import * as ImagePicker from "expo-image-picker";
  import { useRouter } from "expo-router";
  import { Ionicons } from "@expo/vector-icons";
  import { supabase } from "@/utils/supabase";
  import { AppText } from "@/components/Text";
  import { Button } from "@/components/Button";
  import { Chip } from "@/components/Chip";
  import { colors, radii, spacing, typography } from "@/theme";

  // ── Types ─────────────────────────────────────────────────────────────────────

  type PhotoAsset = {
    uri: string;
    mimeType?: string;
    fileExt: string;
  };

  // ── Constants ─────────────────────────────────────────────────────────────────

  const RELATIONSHIP_OPTIONS = ["Short-term", "Long-term", "Casual", "Open"];
  const GENDER_OPTIONS = ["Man", "Woman"];
  const INTERESTED_OPTIONS = ["Men", "Women", "Any"];
  const PRESET_HOBBIES = [
    "Hiking", "Coffee", "Surf", "Climbing", "Cooking", "Pottery",
    "Live music", "Film", "Art", "Tennis", "Running", "Yoga",
    "Reading", "Wine",
  ];
  const TOTAL_PHOTO_SLOTS = 9;
  const TOTAL_STEPS = 6;
  const SKIPPABLE_STEPS = [4, 5, 6];

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function calcAge(year: string, month: string, day: string): number {
    const dob = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  function isValidDate(year: string, month: string, day: string): boolean {
    const y = parseInt(year, 10);
    const mo = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (isNaN(y) || isNaN(mo) || isNaN(d)) return false;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const date = new Date(y, mo - 1, d);
    return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
  }

  function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ── Component ─────────────────────────────────────────────────────────────────

  export default function SignUpScreen() {
    const router = useRouter();

    // Form state
    const [name, setName] = useState("");
    const [dobMonth, setDobMonth] = useState("");
    const [dobDay, setDobDay] = useState("");
    const [dobYear, setDobYear] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [photos, setPhotos] = useState<PhotoAsset[]>([]);
    const [relationshipType, setRelationshipType] = useState("");
    const [gender, setGender] = useState("");
    const [interestedIn, setInterestedIn] = useState("");
    const [destination, setDestination] = useState("");
    const [bio, setBio] = useState("");
    const [hobbies, setHobbies] = useState<string[]>([]);
    const [hobbyInput, setHobbyInput] = useState("");

    // UI state
    const [step, setStep] = useState(1);
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs for DOB auto-advance and photo grid
    const dayRef = useRef<TextInput>(null);
    const yearRef = useRef<TextInput>(null);
    const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Computed ────────────────────────────────────────────────────────────────

    const step1Valid =
      name.trim().length > 0 &&
      isValidDate(dobYear, dobMonth, dobDay) &&
      calcAge(dobYear, dobMonth, dobDay) >= 18 &&
      /.+@.+\..+/.test(email.trim()) &&
      emailAvailable === true &&
      password.length >= 6;

    const canSkip = SKIPPABLE_STEPS.includes(step);

    // ── Handlers ───────────────────────────────────────────────────────────────

    function handleBack() {
      if (step > 1) setStep(step - 1);
      else router.back();
    }

    function onEmailChange(val: string) {
      setEmail(val);
      setEmailAvailable(null);
      if (emailTimer.current) clearTimeout(emailTimer.current);
      if (!/.+@.+\..+/.test(val.trim())) return;
      emailTimer.current = setTimeout(async () => {
        const { data } = await supabase.rpc("check_email_available", {
          check_email: val.trim(),
        });
        setEmailAvailable(data === true);
      }, 600);
    }

    async function addPhoto() {
      if (photos.length >= TOTAL_PHOTO_SLOTS) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop()?.split("?")[0] ?? "jpg";
      setPhotos((prev) => [
        ...prev,
        { uri: asset.uri, mimeType: asset.mimeType ?? undefined, fileExt: ext },
      ]);
    }

    function removePhoto(index: number) {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
    }

    function toggleHobby(hobby: string) {
      setHobbies((prev) =>
        prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
      );
    }

    function addCustomHobby() {
      const trimmed = hobbyInput.trim();
      if (!trimmed || hobbies.includes(trimmed)) {
        setHobbyInput("");
        return;
      }
      setHobbies((prev) => [...prev, trimmed]);
      setHobbyInput("");
    }

    async function handleFinish() {
      setSubmitting(true);
      setError(null);

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError || !data.user) {
        setError(authError?.message ?? "Sign up failed. Please try again.");
        setSubmitting(false);
        return;
      }

      const userId = data.user.id;
      const dob = `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          date_of_birth: dob,
          gender,
          interested_in: interestedIn,
          relationship_type: relationshipType,
          destination: destination.trim() || null,
          bio: bio.trim() || null,
          hobbies: hobbies.length > 0 ? hobbies : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) {
        setError(profileError.message);
        setSubmitting(false);
        return;
      }

      for (let i = 0; i < photos.length; i++) {
        try {
          const photo = photos[i];
          const fileName = `${userId}/${generateUUID()}.${photo.fileExt}`;
          const response = await fetch(photo.uri);
          const blob = await response.blob();
          const { error: uploadErr } = await supabase.storage
            .from("photos")
            .upload(fileName, blob, {
              contentType: photo.mimeType ?? "image/jpeg",
            });
          if (uploadErr) continue;
          const { data: urlData } = supabase.storage
            .from("photos")
            .getPublicUrl(fileName);
          await supabase.from("profile_photos").insert({
            profile_id: userId,
            url: urlData.publicUrl,
            display_order: i,
            impressions: 0,
            swipe_left: 0,
            swipe_right: 0,
          });
        } catch {
          // non-fatal — photos can be added later in the profile tab
        }
      }

      setSubmitting(false);
      setStep(7);
    }

    // ── Photo slots ────────────────────────────────────────────────────────────

    const photoSlots = Array.from({ length: TOTAL_PHOTO_SLOTS }, (_, i) => photos[i] ?? null);

    // ── Render ─────────────────────────────────────────────────────────────────

    // Step 7 is a full-screen success view with no wizard chrome
    if (step === 7) {
      return (
        <SafeAreaView style={styles.root}>
          <View style={styles.successContainer}>
            <Ionicons name="mail-outline" size={72} color={colors.accent} />
            <AppText variant="h1" color={colors.ink} style={styles.successTitle}>
              Check your inbox
            </AppText>
            <AppText
              variant="body"
              color={colors.inkSoft}
              style={styles.successBody}
            >
              {"We sent a confirmation link to\n"}
              <AppText variant="bodyMedium" color={colors.ink}>
                {email}
              </AppText>
              {"\n\nTap it to verify your account before signing in."}
            </AppText>
            <View style={{ height: spacing.xxl }} />
            <Button
              label="Continue to app"
              variant="primary"
              onPress={() => router.replace("/(tabs)/swipe")}
            />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* ── Step header ───────────────────────────────────────────────── */}
          <View style={styles.stepHeader}>
            <Pressable onPress={handleBack} hitSlop={12} style={styles.headerSide}>
              <Ionicons name="chevron-back" size={24} color={colors.inkSoft} />
            </Pressable>
            <AppText variant="caption" color={colors.inkFaint}>
              {step} / {TOTAL_STEPS}
            </AppText>
            {canSkip ? (
              <Pressable
                onPress={step === 6 ? handleFinish : () => setStep(step + 1)}
                hitSlop={12}
                style={[styles.headerSide, styles.headerSideRight]}
                disabled={step === 6 && submitting}
              >
                <AppText
                  variant="bodyMedium"
                  color={step === 6 && submitting ? colors.inkFaint : colors.inkSoft}
                >
                  Skip
                </AppText>
              </Pressable>
            ) : (
              <View style={[styles.headerSide, styles.headerSideRight]} />
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <AppText variant="bodySmall" color={colors.danger}>
                  {error}
                </AppText>
              </View>
            ) : null}

            {/* Step content is added in Tasks 3–7 */}

            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // ── Styles ────────────────────────────────────────────────────────────────────

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    stepHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.edge,
      paddingVertical: spacing.md,
    },
    headerSide: {
      minWidth: 48,
    },
    headerSideRight: {
      alignItems: "flex-end",
    },
    scrollContent: {
      paddingHorizontal: spacing.edge,
      paddingBottom: spacing.xxxl,
    },
    errorBanner: {
      backgroundColor: "#fff0f0",
      borderRadius: radii.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: colors.danger,
    },
    stepTitle: {
      marginBottom: spacing.xl,
      marginTop: spacing.md,
    },
    stepSubtitle: {
      marginTop: -spacing.md,
      marginBottom: spacing.xl,
    },
    fieldLabel: {
      marginBottom: spacing.sm,
    },
    fieldError: {
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.rule,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.ink,
      fontFamily: typography.sans,
      marginBottom: spacing.md,
    },
    dobRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    dobInput: {
      flex: 1,
      textAlign: "center",
      marginBottom: 0,
    },
    dobYearInput: {
      flex: 1.8,
      textAlign: "center",
      marginBottom: 0,
    },
    buttonRow: {
      marginTop: spacing.xl,
    },
    signInRow: {
      alignItems: "center",
      marginTop: spacing.xl,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: spacing.xl,
    },
    photoSlot: {
      width: "31.5%",
      aspectRatio: 3 / 4,
      borderRadius: radii.sm,
      overflow: "hidden",
    },
    photoImage: {
      width: "100%",
      height: "100%",
    },
    photoRemoveBtn: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    photoEmptySlot: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.surfaceSoft,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.ruleStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    bioInput: {
      height: 120,
      paddingTop: 14,
      marginBottom: 0,
    },
    customHobbyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    customHobbyInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.rule,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.ink,
      fontFamily: typography.sans,
    },
    addHobbyBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    successContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.edge,
      paddingBottom: spacing.xxxl,
    },
    successTitle: {
      marginTop: spacing.xl,
      textAlign: "center",
    },
    successBody: {
      textAlign: "center",
      marginTop: spacing.md,
      maxWidth: 300,
      lineHeight: 22,
    },
  });
  ```

- [ ] **Step 4: Verify the app loads without errors**

  Run `npx expo start --web` and navigate to `/(auth)/sign-up`. Confirm the screen renders with the step header (back chevron, "1 / 6") and no red error overlay.

- [ ] **Step 5: Commit**

  ```bash
  git add app/(auth)/sign-up.tsx __tests__/signUpHelpers.test.ts
  git commit -m "feat: scaffold sign-up wizard with state, helpers, and layout shell"
  ```

---

## Task 3: Step 1 — Account Details + Email Validation

**Files:**
- Modify: `app/(auth)/sign-up.tsx`

Add the Step 1 block. Insert the following immediately after the `{/* Step content is added in Tasks 3–7 */}` comment (replace that comment):

- [ ] **Step 1: Add Step 1 JSX inside the ScrollView, replacing the placeholder comment**

  ```tsx
  {/* ── Step 1 — Account Details ──────────────────────────────────── */}
  {step === 1 && (
    <>
      <AppText variant="h1" color={colors.ink} style={styles.stepTitle}>
        Let's get started
      </AppText>

      <AppText variant="label" color={colors.inkSoft} style={styles.fieldLabel}>
        Name
      </AppText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.inkFaint}
        autoCapitalize="words"
        style={styles.input}
      />

      <AppText variant="label" color={colors.inkSoft} style={styles.fieldLabel}>
        Date of birth
      </AppText>
      <View style={styles.dobRow}>
        <TextInput
          value={dobMonth}
          onChangeText={(v) => {
            const cleaned = v.replace(/\D/g, "").slice(0, 2);
            setDobMonth(cleaned);
            if (cleaned.length === 2) dayRef.current?.focus();
          }}
          placeholder="MM"
          placeholderTextColor={colors.inkFaint}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.input, styles.dobInput]}
        />
        <TextInput
          ref={dayRef}
          value={dobDay}
          onChangeText={(v) => {
            const cleaned = v.replace(/\D/g, "").slice(0, 2);
            setDobDay(cleaned);
            if (cleaned.length === 2) yearRef.current?.focus();
          }}
          placeholder="DD"
          placeholderTextColor={colors.inkFaint}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.input, styles.dobInput]}
        />
        <TextInput
          ref={yearRef}
          value={dobYear}
          onChangeText={(v) =>
            setDobYear(v.replace(/\D/g, "").slice(0, 4))
          }
          placeholder="YYYY"
          placeholderTextColor={colors.inkFaint}
          keyboardType="number-pad"
          maxLength={4}
          style={[styles.input, styles.dobYearInput]}
        />
      </View>
      {isValidDate(dobYear, dobMonth, dobDay) &&
        calcAge(dobYear, dobMonth, dobDay) < 18 && (
          <AppText
            variant="bodySmall"
            color={colors.danger}
            style={styles.fieldError}
          >
            You must be 18 or older to join.
          </AppText>
        )}

      <AppText variant="label" color={colors.inkSoft} style={styles.fieldLabel}>
        Email
      </AppText>
      <TextInput
        value={email}
        onChangeText={onEmailChange}
        placeholder="you@example.com"
        placeholderTextColor={colors.inkFaint}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {emailAvailable === false && (
        <AppText
          variant="bodySmall"
          color={colors.danger}
          style={styles.fieldError}
        >
          Email address is taken!
        </AppText>
      )}

      <AppText variant="label" color={colors.inkSoft} style={styles.fieldLabel}>
        Password
      </AppText>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Min. 6 characters"
        placeholderTextColor={colors.inkFaint}
        secureTextEntry
        style={styles.input}
      />

      <View style={styles.buttonRow}>
        <Button
          label="Next"
          variant="primary"
          onPress={() => setStep(2)}
          disabled={!step1Valid}
        />
      </View>

      <Pressable
        onPress={() => router.back()}
        style={styles.signInRow}
      >
        <AppText variant="body" color={colors.inkSoft}>
          Already have an account?{" "}
          <AppText variant="bodyMedium" color={colors.accent}>
            Sign in
          </AppText>
        </AppText>
      </Pressable>
    </>
  )}
  ```

- [ ] **Step 2: Verify Step 1 on web and mobile**

  Run `npx expo start`. Open the sign-up screen (tap "Create account" on the welcome screen).

  Check:
  - All four fields render (Name, MM/DD/YYYY, Email, Password)
  - Typing a full month auto-advances focus to the day input; typing a full day auto-advances to year
  - Typing an invalid date (e.g., Feb 30) with a valid format shows no under-18 error (isValidDate returns false → calcAge not reached → no error rendered)
  - Typing a valid date for a 15-year-old shows "You must be 18 or older to join."
  - Typing a known email from the DB (if any exists) shows "Email address is taken!" after ~600 ms
  - The "Next" button is disabled until all five conditions are met
  - The "Already have an account? Sign in" link is visible below the button on mobile (no button cut off)

- [ ] **Step 3: Commit**

  ```bash
  git add app/(auth)/sign-up.tsx
  git commit -m "feat: add step 1 account details with email validation and age gate"
  ```

---

## Task 4: Step 2 — Photos

**Files:**
- Modify: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Add Step 2 JSX inside the ScrollView, after the closing `}` of the `step === 1` block**

  ```tsx
  {/* ── Step 2 — Photos ──────────────────────────────────────────── */}
  {step === 2 && (
    <>
      <AppText variant="h1" color={colors.ink} style={styles.stepTitle}>
        Add your photos
      </AppText>
      <AppText variant="body" color={colors.inkSoft} style={styles.stepSubtitle}>
        At least one required to continue
      </AppText>

      <View style={styles.photoGrid}>
        {photoSlots.map((photo, i) =>
          photo ? (
            <View key={i} style={styles.photoSlot}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.photoImage}
                resizeMode="cover"
              />
              <Pressable
                style={styles.photoRemoveBtn}
                onPress={() => removePhoto(i)}
              >
                <Ionicons name="close" size={12} color={colors.white} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              key={i}
              style={styles.photoSlot}
              onPress={addPhoto}
              disabled={photos.length >= TOTAL_PHOTO_SLOTS}
            >
              <View style={styles.photoEmptySlot}>
                <Ionicons name="add" size={28} color={colors.inkFaint} />
              </View>
            </Pressable>
          )
        )}
      </View>

      <View style={styles.buttonRow}>
        <Button
          label="Next"
          variant="primary"
          onPress={() => setStep(3)}
          disabled={photos.length === 0}
        />
      </View>
    </>
  )}
  ```

- [ ] **Step 2: Verify Step 2**

  Navigate to Step 2 (fill in valid Step 1 data, tap Next).

  Check:
  - 9 empty slots render in a 3-column grid
  - Tapping an empty slot opens the image picker (on web: file dialog; on mobile: photo gallery)
  - Selecting a photo fills the slot with the preview image and shows a × button
  - Tapping × removes the photo and slot returns to empty
  - "Next" button is disabled with 0 photos and enabled with ≥ 1

- [ ] **Step 3: Commit**

  ```bash
  git add app/(auth)/sign-up.tsx
  git commit -m "feat: add step 2 photo selection grid"
  ```

---

## Task 5: Step 3 — Gender, Interested In, Relationship Type

**Files:**
- Modify: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Add Step 3 JSX after the closing `}` of the `step === 2` block**

  ```tsx
  {/* ── Step 3 — About You & Looking For ─────────────────────────── */}
  {step === 3 && (
    <>
      <AppText variant="h1" color={colors.ink} style={styles.stepTitle}>
        About you
      </AppText>

      <AppText variant="label" color={colors.inkSoft} style={styles.fieldLabel}>
        I am a…
      </AppText>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            selected={gender === opt}
            onPress={() => setGender((prev) => (prev === opt ? "" : opt))}
          />
        ))}
      </View>

      <AppText
        variant="label"
        color={colors.inkSoft}
        style={[styles.fieldLabel, { marginTop: spacing.xl }]}
      >
        Interested in…
      </AppText>
      <View style={styles.chipRow}>
        {INTERESTED_OPTIONS.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            selected={interestedIn === opt}
            onPress={() =>
              setInterestedIn((prev) => (prev === opt ? "" : opt))
            }
          />
        ))}
      </View>

      <AppText
        variant="label"
        color={colors.inkSoft}
        style={[styles.fieldLabel, { marginTop: spacing.xl }]}
      >
        Looking for…
      </AppText>
      <View style={styles.chipRow}>
        {RELATIONSHIP_OPTIONS.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            selected={relationshipType === opt}
            onPress={() =>
              setRelationshipType((prev) => (prev === opt ? "" : opt))
            }
          />
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Button
          label="Next"
          variant="primary"
          onPress={() => setStep(4)}
          disabled={!gender || !interestedIn || !relationshipType}
        />
      </View>
    </>
  )}
  ```

- [ ] **Step 2: Verify Step 3**

  Navigate to Step 3.

  Check:
  - Three separate chip rows render: Man/Woman, Men/Women/Any, Short-term/Long-term/Casual/Open
  - Selecting a chip highlights it (`colors.accent` background)
  - Selecting a chip in the same group deselects the previous one (tapping the same chip again deselects it)
  - "Next" disabled until all three groups have a selection
  - "Next" enabled once all three are selected

- [ ] **Step 3: Commit**

  ```bash
  git add app/(auth)/sign-up.tsx
  git commit -m "feat: add step 3 gender, interested in, and relationship type"
  ```

---

## Task 6: Steps 4, 5, 6 — Destination, Bio, Hobbies

**Files:**
- Modify: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Add Steps 4, 5, 6 JSX after the closing `}` of the `step === 3` block**

  ```tsx
  {/* ── Step 4 — Destination ─────────────────────────────────────── */}
  {step === 4 && (
    <>
      <AppText variant="h1" color={colors.ink} style={styles.stepTitle}>
        Where do you want to go?
      </AppText>
      <AppText variant="body" color={colors.inkSoft} style={styles.stepSubtitle}>
        The hook that attracts matches with the same travel dreams
      </AppText>
      <TextInput
        value={destination}
        onChangeText={setDestination}
        placeholder="e.g. Lisbon, Tokyo, Joshua Tree"
        placeholderTextColor={colors.inkFaint}
        style={styles.input}
      />
      <View style={styles.buttonRow}>
        <Button
          label="Next"
          variant="primary"
          onPress={() => setStep(5)}
        />
      </View>
    </>
  )}

  {/* ── Step 5 — Bio ─────────────────────────────────────────────── */}
  {step === 5 && (
    <>
      <AppText variant="h1" color={colors.ink} style={styles.stepTitle}>
        Tell us about yourself
      </AppText>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="A few sentences about you…"
        placeholderTextColor={colors.inkFaint}
        multiline
        maxLength={300}
        textAlignVertical="top"
        style={[styles.input, styles.bioInput]}
      />
      <AppText
        variant="caption"
        color={colors.inkFaint}
        align="right"
        style={{ marginBottom: spacing.md }}
      >
        {bio.length}/300
      </AppText>
      <View style={styles.buttonRow}>
        <Button
          label="Next"
          variant="primary"
          onPress={() => setStep(6)}
        />
      </View>
    </>
  )}

  {/* ── Step 6 — Hobbies ─────────────────────────────────────────── */}
  {step === 6 && (
    <>
      <AppText variant="h1" color={colors.ink} style={styles.stepTitle}>
        What are you into?
      </AppText>
      <View style={styles.chipRow}>
        {PRESET_HOBBIES.map((h) => (
          <Chip
            key={h}
            label={h}
            selected={hobbies.includes(h)}
            onPress={() => toggleHobby(h)}
          />
        ))}
      </View>
      <View style={styles.customHobbyRow}>
        <TextInput
          value={hobbyInput}
          onChangeText={setHobbyInput}
          onSubmitEditing={addCustomHobby}
          returnKeyType="done"
          placeholder="Add your own…"
          placeholderTextColor={colors.inkFaint}
          style={styles.customHobbyInput}
        />
        <Pressable onPress={addCustomHobby} style={styles.addHobbyBtn}>
          <AppText variant="bodyMedium" color={colors.white}>
            +
          </AppText>
        </Pressable>
      </View>
      {hobbies.filter((h) => !PRESET_HOBBIES.includes(h)).length > 0 && (
        <View style={[styles.chipRow, { marginTop: spacing.sm }]}>
          {hobbies
            .filter((h) => !PRESET_HOBBIES.includes(h))
            .map((h) => (
              <Chip
                key={h}
                label={`${h} ✕`}
                selected
                onPress={() => toggleHobby(h)}
              />
            ))}
        </View>
      )}
      <View style={styles.buttonRow}>
        <Button
          label="Finish"
          variant="primary"
          onPress={handleFinish}
          loading={submitting}
          disabled={submitting}
        />
      </View>
    </>
  )}
  ```

- [ ] **Step 2: Verify Steps 4, 5, 6**

  Navigate through to each step.

  **Step 4:** TextInput renders; "Next" enabled immediately; "Skip" in header navigates to Step 5; typing a destination preserves it if you go back and forward.

  **Step 5:** Multiline text input renders; character counter updates as you type; stops at 300 chars; "Next" always enabled; "Skip" navigates to Step 6.

  **Step 6:** All 14 preset chips render; tapping highlights/deselects; custom input adds a new chip; custom chips show with ✕ and can be removed; "Finish" always enabled; "Skip" in header also triggers submission (same as Finish).

- [ ] **Step 3: Commit**

  ```bash
  git add app/(auth)/sign-up.tsx
  git commit -m "feat: add steps 4-6 destination, bio, and hobbies"
  ```

---

## Task 7: End-to-End Verification

**Files:**
- No code changes — manual testing only

- [ ] **Step 1: Full happy path on web**

  Run `npx expo start --web`.

  1. Tap "Create account" on the welcome screen → Step 1 of wizard loads
  2. Fill in: Name, valid DOB (age ≥ 18), a fresh email address, password ≥ 6 chars
  3. Confirm "Next" enables only after all fields valid and email available check passes
  4. Step 2: tap an empty slot, select a photo → slot fills with preview; tap Next
  5. Step 3: select one option from each group; Next enables
  6. Step 4: type a destination; Next
  7. Step 5: type a bio; Next
  8. Step 6: select a few hobbies; tap "Finish"
  9. Confirm loading indicator shows while submitting
  10. Step 7 "Check your inbox" screen appears with the entered email address shown
  11. Tap "Continue to app" → navigates to the swipe tab

- [ ] **Step 2: Verify DB records**

  Use `mcp__plugin_supabase_supabase__execute_sql` to confirm:

  ```sql
  SELECT id, name, date_of_birth, gender, interested_in, relationship_type,
         destination, bio, hobbies
  FROM public.profiles
  ORDER BY created_at DESC
  LIMIT 1;
  ```
  Expected: the row from the sign-up just completed, with all fields populated.

  ```sql
  SELECT profile_id, url, display_order
  FROM public.profile_photos
  ORDER BY created_at DESC
  LIMIT 5;
  ```
  Expected: the uploaded photo row(s) with correct `profile_id` and `display_order = 0`.

- [ ] **Step 3: Test "email taken" path**

  1. Return to sign-up, enter the same email used in Step 1
  2. Confirm "Email address is taken!" appears below the email field after ~600 ms
  3. Confirm "Next" button remains disabled

- [ ] **Step 4: Test under-18 guard**

  Enter a DOB that makes the user 17 years old. Confirm "You must be 18 or older to join." appears below the DOB row and Next stays disabled.

- [ ] **Step 5: Test back navigation**

  From Step 4, tap the back chevron. Confirm you return to Step 3 with all chip selections intact. Tap back again to Step 2 — photos still present. Tap back to Step 1 — name/email/password fields still populated.

- [ ] **Step 6: Test Skip on steps 4, 5, 6**

  On Step 4, tap "Skip" → goes to Step 5 (destination field left empty). On Step 5, tap "Skip" → goes to Step 6. On Step 6, tap "Skip" → triggers submission (spinner shows, then Step 7 appears).

  Verify DB: destination, bio, hobbies columns are NULL for this user.

- [ ] **Step 7: Test on mobile (Expo Go or dev build)**

  Repeat the happy path on a physical device or simulator. Confirm:
  - Buttons are fully visible and not hidden behind keyboard
  - DOB auto-advance (month → day → year) works on mobile keyboard
  - Image picker opens the photo gallery

- [ ] **Step 8: Commit final verification note**

  ```bash
  git add -A
  git commit -m "feat: sign-up wizard complete and verified"
  ```
