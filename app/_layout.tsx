import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";

// ── Auth Context ──────────────────────────────────────────────────────────────

type AuthContextType = {
  session: Session | null;
};

const AuthContext = createContext<AuthContextType>({ session: null });

export function useAuth() {
  return useContext(AuthContext);
}

// ── Auth Guard ────────────────────────────────────────────────────────────────

function AuthGuard({ session, loading }: { session: Session | null; loading: boolean }) {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)/swipe");
    }
  }, [session, loading, segments]);

  return null;
}

// ── Root Layout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ session }}>
      <AuthGuard session={session} loading={loading} />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthContext.Provider>
  );
}
