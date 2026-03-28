import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/app/_layout";
import { supabase } from "@/utils/supabase";
import ProfileAvatar from "@/components/ProfileAvatar";
import PhotoGrid from "@/components/PhotoGrid";
import type { ProfilePhoto } from "@/components/PhotoGridItem";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Constants ────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other"];
const RELATIONSHIP_OPTIONS = ["Short-term", "Long-term", "Casual", "Open"];

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

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

  // ── Data Loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const [profileRes, photosRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("profile_photos")
        .select("*")
        .eq("profile_id", userId)
        .order("display_order"),
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

    if (photosRes.data) {
      setPhotos(photosRes.data as ProfilePhoto[]);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Change Detection ─────────────────────────────────────────────────────

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      form.name !== (profile.name ?? "") ||
      form.location_city !== (profile.location_city ?? "") ||
      form.gender !== (profile.gender ?? "") ||
      form.destination !== (profile.destination ?? "") ||
      form.bio !== (profile.bio ?? "") ||
      form.relationship_type !== (profile.relationship_type ?? "") ||
      JSON.stringify(form.hobbies) !==
        JSON.stringify(profile.hobbies ?? [])
    );
  }, [form, profile]);

  // ── Photo Handlers ───────────────────────────────────────────────────────

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

      // Fetch as blob for upload
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, blob, {
          contentType: asset.mimeType ?? "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      const newOrder = photos.length;
      const { data: photoRow, error: insertError } = await supabase
        .from("profile_photos")
        .insert({
          profile_id: userId,
          url: urlData.publicUrl,
          display_order: newOrder,
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
      if (path) {
        await supabase.storage.from("photos").remove([path]);
      }

      const { error: deleteError } = await supabase
        .from("profile_photos")
        .delete()
        .eq("id", photo.id);

      if (deleteError) throw deleteError;

      // Remove locally and re-normalize order
      const remaining = photos
        .filter((p) => p.id !== photo.id)
        .map((p, i) => ({ ...p, display_order: i }));

      // Update order in DB
      for (const p of remaining) {
        await supabase
          .from("profile_photos")
          .update({ display_order: p.display_order })
          .eq("id", p.id);
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
        await supabase
          .from("profile_photos")
          .update({ display_order: p.display_order })
          .eq("id", p.id);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to reorder photos.");
    }
  }

  // ── Save Handler ─────────────────────────────────────────────────────────

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

  // ── Hobby Helpers ────────────────────────────────────────────────────────

  function addHobby() {
    const trimmed = hobbyInput.trim();
    if (!trimmed || form.hobbies.includes(trimmed)) {
      setHobbyInput("");
      return;
    }
    setForm((prev) => ({ ...prev, hobbies: [...prev.hobbies, trimmed] }));
    setHobbyInput("");
  }

  function removeHobby(hobby: string) {
    setForm((prev) => ({
      ...prev,
      hobbies: prev.hobbies.filter((h) => h !== hobby),
    }));
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4291db" />
      </View>
    );
  }

  const firstPhotoUrl = photos.length > 0 ? photos[0].url : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={scrollEnabled}
      keyboardShouldPersistTaps="handled"
    >
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Avatar */}
      <ProfileAvatar
        photoUrl={firstPhotoUrl}
        name={form.name || null}
        dateOfBirth={profile?.date_of_birth ?? null}
        onNameSave={(newName) => setForm((p) => ({ ...p, name: newName }))}
      />

      {/* Photo Grid */}
      <Text style={styles.sectionTitle}>Photos</Text>
      {photoLoading && (
        <ActivityIndicator
          size="small"
          color="#4291db"
          style={{ marginBottom: 8 }}
        />
      )}
      <PhotoGrid
        photos={photos}
        onAddPhoto={handleAddPhoto}
        onDeletePhoto={handleDeletePhoto}
        onReorder={handleReorder}
        onDragStart={() => setScrollEnabled(false)}
        onDragEnd={() => setScrollEnabled(true)}
        disabled={photoLoading}
      />

      {/* Profile Fields */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>About You</Text>

      {/* Location */}
      <Text style={styles.fieldLabel}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="City or town"
        placeholderTextColor="#BDBDBD"
        value={form.location_city}
        onChangeText={(v) => setForm((p) => ({ ...p, location_city: v }))}
      />

      {/* Gender */}
      <Text style={styles.fieldLabel}>Gender</Text>
      <View style={styles.pillRow}>
        {GENDER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.pill,
              form.gender === opt && styles.pillSelected,
            ]}
            onPress={() => setForm((p) => ({ ...p, gender: opt }))}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                form.gender === opt && styles.pillTextSelected,
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Destination */}
      <Text style={styles.fieldLabel}>Desired Destination / Activity</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Paris, hiking, coffee date"
        placeholderTextColor="#BDBDBD"
        value={form.destination}
        onChangeText={(v) => setForm((p) => ({ ...p, destination: v }))}
      />

      {/* Bio */}
      <Text style={styles.fieldLabel}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="Tell others about yourself..."
        placeholderTextColor="#BDBDBD"
        multiline
        numberOfLines={4}
        maxLength={300}
        textAlignVertical="top"
        value={form.bio}
        onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
      />
      <Text style={styles.charCount}>{form.bio.length}/300</Text>

      {/* Hobbies */}
      <Text style={styles.fieldLabel}>Hobbies & Interests</Text>
      <View style={styles.hobbyInputRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Add a hobby..."
          placeholderTextColor="#BDBDBD"
          value={hobbyInput}
          onChangeText={setHobbyInput}
          onSubmitEditing={addHobby}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.addHobbyButton}
          onPress={addHobby}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={28} color="#4291db" />
        </TouchableOpacity>
      </View>
      {form.hobbies.length > 0 && (
        <View style={styles.hobbyTags}>
          {form.hobbies.map((h) => (
            <View key={h} style={styles.hobbyTag}>
              <Text style={styles.hobbyTagText}>{h}</Text>
              <TouchableOpacity onPress={() => removeHobby(h)} hitSlop={6}>
                <Ionicons name="close-circle" size={16} color="#9E9E9E" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Relationship Type */}
      <Text style={styles.fieldLabel}>Desired Relationship Type</Text>
      <View style={styles.pillRow}>
        {RELATIONSHIP_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.pill,
              form.relationship_type === opt && styles.pillSelected,
            ]}
            onPress={() =>
              setForm((p) => ({ ...p, relationship_type: opt }))
            }
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                form.relationship_type === opt && styles.pillTextSelected,
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          (!hasChanges || saving) && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={!hasChanges || saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 24 : 60,
    paddingBottom: 40,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#616161",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A1A1A",
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: "#9E9E9E",
    textAlign: "right",
    marginTop: 4,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  pillSelected: {
    backgroundColor: "#4291db",
    borderColor: "#4291db",
  },
  pillText: {
    fontSize: 14,
    color: "#616161",
    fontWeight: "500",
  },
  pillTextSelected: {
    color: "#fff",
  },
  hobbyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addHobbyButton: {
    padding: 4,
  },
  hobbyTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  hobbyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hobbyTagText: {
    fontSize: 13,
    color: "#4291db",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#4291db",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
