import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignUp() {
    setError(null);
    if (!email || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✉️</Text>
          <Text style={styles.successHeading}>Check your email</Text>
          <Text style={styles.successBody}>
            We've sent a confirmation link to{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
            {"\n\n"}Click the link to verify your account before signing in.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(auth)/sign-in")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.sub}>Join Destined today</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.fields}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#BDBDBD"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#BDBDBD"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#BDBDBD"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backText}>Already have an account? <Text style={styles.backLink}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: "#9E9E9E",
    marginBottom: 32,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 10,
  },
  fields: {
    gap: 12,
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A1A1A",
  },
  primaryButton: {
    backgroundColor: "#E91E63",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  backRow: {
    marginTop: 24,
    alignItems: "center",
  },
  backText: {
    fontSize: 14,
    color: "#9E9E9E",
  },
  backLink: {
    color: "#E91E63",
    fontWeight: "600",
  },
  // Success state
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  successIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  successHeading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
  },
  successBody: {
    fontSize: 15,
    color: "#616161",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  emailHighlight: {
    color: "#E91E63",
    fontWeight: "600",
  },
});
