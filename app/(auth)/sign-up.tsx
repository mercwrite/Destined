import { useEffect, useRef, useState } from "react";
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

  // Refs for DOB auto-advance
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (emailTimer.current) clearTimeout(emailTimer.current);
    };
  }, []);

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
      .upsert({
        id: userId,
        name: name.trim(),
        date_of_birth: dob,
        gender,
        interested_in: interestedIn,
        relationship_type: relationshipType,
        destination: destination.trim() || null,
        bio: bio.trim() || null,
        hobbies: hobbies.length > 0 ? hobbies : null,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      setError(profileError.message);
      setSubmitting(false);
      return;
    }

    let photoFailCount = 0;
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
        if (uploadErr) { photoFailCount++; continue; }
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
        photoFailCount++;
      }
    }

    setSubmitting(false);
    if (photoFailCount > 0) {
      setError(`${photoFailCount} photo(s) failed to upload. You can add them later in your profile.`);
    }
    setStep(7);
  }

  // ── Photo slots ────────────────────────────────────────────────────────────

  const photoSlots = Array.from({ length: TOTAL_PHOTO_SLOTS }, (_, i) => photos[i] ?? null);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (step === 7) {
    return (
      <SafeAreaView style={styles.root}>
        {error ? (
          <View style={[styles.errorBanner, { margin: spacing.edge }]}>
            <AppText variant="bodySmall" color={colors.danger}>
              {error}
            </AppText>
          </View>
        ) : null}
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
          {error ? (
            <View style={styles.errorBanner}>
              <AppText variant="bodySmall" color={colors.danger}>
                {error}
              </AppText>
            </View>
          ) : null}

          {/* Step content added in Tasks 3–6 */}

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
    backgroundColor: colors.surfaceWarm,
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
