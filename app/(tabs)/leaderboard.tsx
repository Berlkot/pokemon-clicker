// app/(tabs)/leaderboard.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import Colors from "../../constants/Colors";
import { useGame } from "../../context/GameContext";
import { supabase } from "../../lib/supabase";
import { formatNumber } from "../../utils/formatNumber";

type RpcLeaderboardRow = {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  ascension_count: number | null;
  level: number | null;
  energy: number | null;
  updated_at?: string | null;
};

type LeaderRow = {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  ascensions: number;
  level: number;
  energy: number;
};

export default function LeaderboardScreen() {
  const { session } = useGame();
  const router = useRouter();

  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const myUserId = session?.user?.id ?? null;

  const buildLeaderboard = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_leaderboard", {
      limit_count: 100,
    });

    if (error) throw error;

    const safe = (data || []) as RpcLeaderboardRow[];

    const computed: LeaderRow[] = safe.map((r) => ({
      userId: r.user_id,
      nickname: (r.nickname || "Игрок").trim(),
      avatarUrl: r.avatar_url ?? null,
      ascensions: Number(r.ascension_count || 0),
      level: Number(r.level || 0),
      energy: Math.floor(Number(r.energy || 0)),
    }));

    setRows(computed);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await buildLeaderboard();
    } catch (e: any) {
      console.error(e);
      Toast.show({
        type: "gameToast",
        text1: "Не удалось загрузить рейтинг",
        text2: e?.message ? String(e.message) : "Ошибка сети или доступа",
      });
    } finally {
      setLoading(false);
    }
  }, [buildLeaderboard]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await buildLeaderboard();
    } finally {
      setRefreshing(false);
    }
  }, [buildLeaderboard]);

  const renderItem = useCallback(
    ({ item, index }: { item: LeaderRow; index: number }) => {
      const isMe = !!myUserId && item.userId === myUserId;

      return (
        <View style={[styles.row, isMe && styles.meRow]}>
          <Text style={styles.rank}>#{index + 1}</Text>

          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.nickname}
            </Text>
            <Text style={styles.meta}>
              Вознесений: {item.ascensions} • Ур: {item.level} • Энергия:{" "}
              {formatNumber(item.energy)}
            </Text>
          </View>
        </View>
      );
    },
    [myUserId]
  );

  return (
    <View style={styles.container}>
      {!session && (
        <View style={styles.joinCard}>
          <Text style={styles.joinTitle}>Участвовать в рейтинге</Text>
          <Text style={styles.joinText}>
            Войдите в аккаунт в настройках, чтобы ваш прогресс попал в таблицу
            лидеров.
          </Text>

          <Pressable style={styles.joinBtn} onPress={() => router.push("/modal")}>
            <Text style={styles.joinBtnText}>Открыть настройки</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={{ paddingTop: 40 }}>
          <ActivityIndicator color="white" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          onRefresh={onRefresh}
          refreshing={refreshing}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, padding: 12 },

  joinCard: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  joinTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  joinText: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
    marginBottom: 10,
  },

  joinBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  joinBtnText: { color: Colors.primary, fontWeight: "900" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  meRow: { borderWidth: 2, borderColor: Colors.accent },

  rank: { width: 44, color: "white", fontWeight: "900" },

  avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  avatarPlaceholder: { backgroundColor: "rgba(255,255,255,0.25)" },

  name: { color: "white", fontWeight: "900" },
  meta: { color: "rgba(255,255,255,0.8)", marginTop: 2, fontSize: 12 },
});
