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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    setError(null);
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🔑</Text>
          <Text style={styles.successHeading}>Reset link sent</Text>
          <Text style={styles.successBody}>
            Check your inbox at{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
            {"\n\n"}Follow the link to reset your password.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(auth)/sign-in")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Back to Sign In</Text>
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
        <Text style={styles.heading}>Forgot password?</Text>
        <Text style={styles.sub}>
          Enter your email and we'll send you a reset link.
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

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

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backLink}>← Back to Sign In</Text>
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
    lineHeight: 22,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 10,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 24,
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
  backLink: {
    color: "#E91E63",
    fontSize: 14,
    fontWeight: "500",
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
