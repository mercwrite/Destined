import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  photoUrl: string | null;
  name: string | null;
  dateOfBirth: string | null;
  onNameSave: (name: string) => void;
};

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function ProfileAvatar({
  photoUrl,
  name,
  dateOfBirth,
  onNameSave,
}: Props) {
  const age = dateOfBirth ? computeAge(dateOfBirth) : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");

  function startEdit() {
    setDraft(name ?? "");
    setEditing(true);
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (trimmed) {
      onNameSave(trimmed);
    }
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="person" size={48} color="#9E9E9E" />
        )}
      </View>

      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.nameInput}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={saveEdit}
            autoFocus
            returnKeyType="done"
            maxLength={40}
            placeholder="Your name"
            placeholderTextColor="#BDBDBD"
          />
          <TouchableOpacity onPress={saveEdit} style={styles.editAction}>
            <Ionicons name="checkmark-circle" size={26} color="#4291db" />
          </TouchableOpacity>
          <TouchableOpacity onPress={cancelEdit} style={styles.editAction}>
            <Ionicons name="close-circle" size={26} color="#9E9E9E" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name || "Add your name"}</Text>
          <TouchableOpacity onPress={startEdit} hitSlop={8}>
            <Ionicons name="pencil" size={18} color="#9E9E9E" />
          </TouchableOpacity>
        </View>
      )}

      {age !== null && <Text style={styles.age}>{age}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 20,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: 120,
    height: 120,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  age: {
    fontSize: 16,
    color: "#9E9E9E",
    marginTop: 2,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 8 : 10,
    minWidth: 160,
    textAlign: "center",
  },
  editAction: {
    padding: 2,
  },
});
