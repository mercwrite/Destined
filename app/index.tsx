import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

export default function Index() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //Test database connection by pulling data from test table. Should return john doe
  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from("test").select("*");
      if (error) {
        setError(error.message);
      } else {
        setData(data ?? []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color: "red" }}>{error}</Text>}
      {!loading && !error && (
        <FlatList
          data={data}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <Text>{JSON.stringify(item)}</Text>
          )}
          ListEmptyComponent={<Text>No data found.</Text>}
        />
      )}
    </View>
  );
}
