import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuth } from "@/app/_layout";
import { supabase } from "@/utils/supabase";
import PhotoGrid from "@/components/PhotoGrid";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppText } from "@/components/Text";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { colors, radii, spacing, typography } from "@/theme";
import type { ProfilePhoto } from "@/components/PhotoGridItem";

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  location_city: string | null;
  destination: string | null;
  bio: string | null;
  hobbies: string[] | null;
  relationship_type: string | null;
};

type FormState = {
  name: string;
  location_city: string;
  gender: string;
  destination: string;
  bio: string;
  hobbies: string[];
  relationship_type: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other"];
const RELATIONSHIP_OPTIONS = ["Short-term", "Long-term", "Casual", "Open"];
const PRESET_HOBBIES = [
  "Hiking", "Coffee", "Surf", "Climbing", "Cooking", "Pottery",
  "Live music", "Film", "Art", "Tennis", "Running", "Yoga",
  "Reading", "Wine",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractStoragePath(publicUrl: string): string {
  const marker = "/object/public/photos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return "";
  return publicUrl.slice(idx + marker.length);
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [hobbyInput, setHobbyInput] = useState("");

  const [form, setForm] = useState<FormState>({
    name: "",
    location_city: "",
    gender: "",
    destination: "",
    bio: "",
    hobbies: [],
    relationship_type: "",
  });

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const [profileRes, photosRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("profile_photos").select("*").eq("profile_id", userId).order("display_order"),
    ]);

    if (profileRes.error) {
      setError(profileRes.error.message);
    } else if (profileRes.data) {
      const p = profileRes.data as Profile;
      setProfile(p);
      setForm({
        name: p.name ?? "",
        location_city: p.location_city ?? "",
        gender: p.gender ?? "",
        destination: p.destination ?? "",
        bio: p.bio ?? "",
        hobbies: p.hobbies ?? [],
        relationship_type: p.relationship_type ?? "",
      });
    }

    if (photosRes.data) setPhotos(photosRes.data as ProfilePhoto[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Change detection ───────────────────────────────────────────────────────

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      form.name !== (profile.name ?? "") ||
      form.location_city !== (profile.location_city ?? "") ||
      form.gender !== (profile.gender ?? "") ||
      form.destination !== (profile.destination ?? "") ||
      form.bio !== (profile.bio ?? "") ||
      form.relationship_type !== (profile.relationship_type ?? "") ||
      JSON.stringify(form.hobbies) !== JSON.stringify(profile.hobbies ?? [])
    );
  }, [form, profile]);

  // ── Photo handlers ─────────────────────────────────────────────────────────

  async function handleAddPhoto(_slotIndex: number) {
    if (!userId || photoLoading) return;
    if (photos.length >= 9) {
      Alert.alert("Limit reached", "You can have up to 9 photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (result.canceled || !result.assets[0]) return;
    setPhotoLoading(true);
    setError(null);

    try {
      const asset = result.assets[0];
      const fileExt = asset.uri.split(".").pop()?.split("?")[0] ?? "jpg";
      const fileName = `${userId}/${generateUUID()}.${fileExt}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, blob, { contentType: asset.mimeType ?? "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);

      const { data: photoRow, error: insertError } = await supabase
        .from("profile_photos")
        .insert({
          profile_id: userId,
          url: urlData.publicUrl,
          display_order: photos.length,
          impressions: 0,
          swipe_left: 0,
          swipe_right: 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setPhotos((prev) => [...prev, photoRow as ProfilePhoto]);
    } catch (err: any) {
      setError(err.message ?? "Failed to upload photo.");
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleDeletePhoto(photo: ProfilePhoto) {
    setPhotoLoading(true);
    setError(null);
    try {
      const path = extractStoragePath(photo.url);
      if (path) await supabase.storage.from("photos").remove([path]);

      const { error: deleteError } = await supabase
        .from("profile_photos")
        .delete()
        .eq("id", photo.id);

      if (deleteError) throw deleteError;

      const remaining = photos
        .filter((p) => p.id !== photo.id)
        .map((p, i) => ({ ...p, display_order: i }));

      for (const p of remaining) {
        await supabase.from("profile_photos").update({ display_order: p.display_order }).eq("id", p.id);
      }
      setPhotos(remaining);
    } catch (err: any) {
      setError(err.message ?? "Failed to delete photo.");
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleReorder(reorderedPhotos: ProfilePhoto[]) {
    setPhotos(reorderedPhotos);
    try {
      for (const p of reorderedPhotos) {
        await supabase.from("profile_photos").update({ display_order: p.display_order }).eq("id", p.id);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to reorder photos.");
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!userId || !hasChanges) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        name: form.name || null,
        location_city: form.location_city || null,
        gender: form.gender || null,
        destination: form.destination || null,
        bio: form.bio || null,
        hobbies: form.hobbies.length > 0 ? form.hobbies : null,
        relationship_type: form.relationship_type || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: form.name || null,
              location_city: form.location_city || null,
              gender: form.gender || null,
              destination: form.destination || null,
              bio: form.bio || null,
              hobbies: form.hobbies.length > 0 ? form.hobbies : null,
              relationship_type: form.relationship_type || null,
            }
          : prev
      );
      Alert.alert("Saved", "Your profile has been updated.");
    }
  }

  // ── Hobby helpers ──────────────────────────────────────────────────────────

  function toggleHobby(hobby: string) {
    setForm((d) => ({
      ...d,
      hobbies: d.hobbies.includes(hobby)
        ? d.hobbies.filter((h) => h !== hobby)
        : [...d.hobbies, hobby],
    }));
  }

  function addCustomHobby() {
    const trimmed = hobbyInput.trim();
    if (!trimmed || form.hobbies.includes(trimmed)) { setHobbyInput(""); return; }
    setForm((d) => ({ ...d, hobbies: [...d.hobbies, trimmed] }));
    setHobbyInput("");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader
          eyebrow="Your profile"
          title={form.name || "Edit profile"}
          trailing={
            saving ? <ActivityIndicator size="small" color={colors.accent} /> : null
          }
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={styles.errorBanner}>
              <AppText variant="bodySmall" color={colors.danger}>{error}</AppText>
            </View>
          ) : null}

          {/* Photos */}
          <AppText variant="label" color={colors.inkSoft} style={styles.sectionLabel}>
            Photos
          </AppText>
          {photoLoading ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginBottom: spacing.sm }} />
          ) : null}
          <PhotoGrid
            photos={photos}
            onAddPhoto={handleAddPhoto}
            onDeletePhoto={handleDeletePhoto}
            onReorder={handleReorder}
            onDragStart={() => setScrollEnabled(false)}
            onDragEnd={() => setScrollEnabled(true)}
            disabled={photoLoading}
          />

          {/* Destination — the hook */}
          <AppText variant="label" color={colors.accent} style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
            ✦ Destination — your hook
          </AppText>
          <Card variant="warm" padding="lg">
            <AppText variant="caption" color={colors.inkSoft}>Where do you want to go?</AppText>
            <TextInput
              value={form.destination}
              onChangeText={(v) => setForm((p) => ({ ...p, destination: v }))}
              placeholder="e.g. Lisbon, Tokyo, Joshua Tree"
              placeholderTextColor={colors.inkFaint}
              style={[styles.bigInput, { fontFamily: typography.serif }]}
            />
          </Card>

          {/* About You */}
          <AppText variant="label" color={colors.inkSoft} style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
            About you
          </AppText>
          <Card variant="plain" padding="lg">
            <AppText variant="caption" color={colors.inkSoft}>Name</AppText>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="Your name"
              placeholderTextColor={colors.inkFaint}
              style={styles.fieldInput}
            />
            <View style={styles.divider} />

            <AppText variant="caption" color={colors.inkSoft}>Location</AppText>
            <TextInput
              value={form.location_city}
              onChangeText={(v) => setForm((p) => ({ ...p, location_city: v }))}
              placeholder="City or town"
              placeholderTextColor={colors.inkFaint}
              style={styles.fieldInput}
            />
            <View style={styles.divider} />

            <AppText variant="caption" color={colors.inkSoft}>Bio</AppText>
            <TextInput
              value={form.bio}
              onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
              placeholder="A few sentences about you"
              placeholderTextColor={colors.inkFaint}
              multiline
              numberOfLines={4}
              maxLength={300}
              textAlignVertical="top"
              style={[styles.fieldInput, { minHeight: 80 }]}
            />
            <AppText variant="caption" color={colors.inkFaint} align="right" style={{ marginTop: 4 }}>
              {form.bio.length}/300
            </AppText>
          </Card>

          {/* Gender */}
          <AppText variant="label" color={colors.inkSoft} style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
            Gender
          </AppText>
          <View style={styles.chipWrap}>
            {GENDER_OPTIONS.map((opt) => (
              <Chip
                key={opt}
                label={opt}
                selected={form.gender === opt}
                onPress={() => setForm((p) => ({ ...p, gender: p.gender === opt ? "" : opt }))}
              />
            ))}
          </View>

          {/* Interests */}
          <AppText variant="label" color={colors.inkSoft} style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
            Interests
          </AppText>
          <View style={styles.chipWrap}>
            {PRESET_HOBBIES.map((h) => (
              <Chip
                key={h}
                label={h}
                selected={form.hobbies.includes(h)}
                onPress={() => toggleHobby(h)}
              />
            ))}
          </View>
          {/* Custom hobby input */}
          <View style={styles.customHobbyRow}>
            <TextInput
              value={hobbyInput}
              onChangeText={setHobbyInput}
              onSubmitEditing={addCustomHobby}
              returnKeyType="done"
              placeholder="Add custom interest…"
              placeholderTextColor={colors.inkFaint}
              style={styles.customInput}
            />
            <Pressable onPress={addCustomHobby} style={styles.addBtn}>
              <AppText variant="bodyMedium" color={colors.white}>+</AppText>
            </Pressable>
          </View>
          {/* Custom hobbies not in preset */}
          {form.hobbies.filter((h) => !PRESET_HOBBIES.includes(h)).length > 0 ? (
            <View style={[styles.chipWrap, { marginTop: spacing.sm }]}>
              {form.hobbies
                .filter((h) => !PRESET_HOBBIES.includes(h))
                .map((h) => (
                  <Chip key={h} label={`${h} ✕`} selected onPress={() => toggleHobby(h)} />
                ))}
            </View>
          ) : null}

          {/* Looking For */}
          <AppText variant="label" color={colors.inkSoft} style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
            Looking for
          </AppText>
          <View style={styles.chipWrap}>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <Chip
                key={opt}
                label={opt}
                selected={form.relationship_type === opt}
                onPress={() => setForm((p) => ({ ...p, relationship_type: p.relationship_type === opt ? "" : opt }))}
              />
            ))}
          </View>

          <View style={{ height: spacing.xxl }} />
          <Button
            label="Save changes"
            variant="primary"
            onPress={handleSave}
            loading={saving}
            disabled={!hasChanges || saving}
          />
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  scroll: {
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
  sectionLabel: { marginBottom: spacing.sm },
  divider: { height: 1, backgroundColor: colors.rule, marginVertical: spacing.md },
  bigInput: {
    fontSize: 24,
    color: colors.ink,
    paddingVertical: 6,
    marginTop: 6,
  },
  fieldInput: {
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 6,
    fontFamily: typography.sans,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  customHobbyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  customInput: {
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
