import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import Toast from "react-native-toast-message";
import Colors from "../constants/Colors";
import { useGame } from "../context/GameContext";
import React, { useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";

const SettingRow = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Switch
      trackColor={{ false: "#767577", true: Colors.success }}
      thumbColor={value ? "#e4ffcbff" : "#f4f3f4"}
      onValueChange={onValueChange}
      value={value}
    />
  </View>
);

export default function ModalScreen() {
  const {
    gameState,
    updateSettings,
    resetGame,
    session,
    signIn,
    signUp,
    signOut,
    saveMeta,
    resolveSaveConflict,
    avatarUrl,
    uploadAvatar,
    nickname,
    updateNickname,
  } = useGame();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");

  const hasConflict = saveMeta.hasConflict;

  const newerIs = useMemo(() => {
    const l = saveMeta.localLastSavedTime;
    const c = saveMeta.cloudLastSavedTime;
    if (l === null || c === null) return null;
    if (l === c) return null;
    return l > c ? "local" : "cloud";
  }, [saveMeta.localLastSavedTime, saveMeta.cloudLastSavedTime]);

  const olderIs = useMemo(() => {
    const l = saveMeta.localLastSavedTime;
    const c = saveMeta.cloudLastSavedTime;
    if (l === null || c === null) return null;
    if (l === c) return null;
    return l < c ? "local" : "cloud";
  }, [saveMeta.localLastSavedTime, saveMeta.cloudLastSavedTime]);

  useEffect(() => {
    setNicknameDraft(nickname ?? "");
  }, [nickname]);

  const handleSignIn = async () => {
    try {
      await signIn(email.trim(), password);
      Toast.show({
        type: "gameToast",
        text1: "Готово",
        text2: "Вы вошли в аккаунт.",
      });
    } catch (e: any) {
      Toast.show({
        type: "gameToast",
        text1: "Ошибка входа",
        text2: e?.message ?? "Не удалось войти",
      });
    }
  };

  const handleSignUp = async () => {
    try {
      await signUp(email.trim(), password);
      Toast.show({
        type: "gameToast",
        text1: "Аккаунт создан",
        text2: "Теперь можно продолжить.",
      });
    } catch (e: any) {
      Toast.show({
        type: "gameToast",
        text1: "Ошибка регистрации",
        text2: e?.message ?? "Не удалось зарегистрироваться",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Toast.show({
        type: "gameToast",
        text1: "Вы вышли",
        text2: "Игра продолжится офлайн.",
      });
    } catch (e: any) {
      Toast.show({
        type: "gameToast",
        text1: "Ошибка",
        text2: e?.message ?? "Не удалось выйти",
      });
    }
  };
  const handlePickAvatar = async () => {
    if (!session) {
      Toast.show({
        type: "gameToast",
        text1: "Нужен вход",
        text2: "Войдите, чтобы менять аватар.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      const uri = result.assets[0].uri;
      await uploadAvatar(uri);
      Toast.show({
        type: "gameToast",
        text1: "Аватар обновлён",
        text2: "Изменения сохранены.",
      });
    } catch (e: any) {
      Toast.show({
        type: "gameToast",
        text1: "Ошибка",
        text2: e?.message ?? "Не удалось загрузить аватар",
      });
    }
  };

  const router = useRouter();

  const handleResetPress = () => {
    Alert.alert(
      "Сброс прогресса",
      "Вы уверены, что хотите сбросить весь прогресс? Это действие нельзя будет отменить.",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Сбросить",
          onPress: async () => {
            await resetGame();
            router.back();
            Toast.show({
              type: "gameToast",
              text1: "Прогресс сброшен!",
              text2: "Вы можете начать игру заново.",
            });
          },
          style: "destructive",
        },
      ]
    );
  };
  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Аккаунт</Text>
          {session ? (
            <>
              <Text style={styles.settingLabel}>Никнейм</Text>
              <TextInput
                value={nicknameDraft}
                onChangeText={setNicknameDraft}
                placeholder="Введите никнейм"
                style={styles.input}
              />
              <Pressable
                style={styles.secondaryButton}
                onPress={async () => {
                  try {
                    await updateNickname(nicknameDraft);
                    Toast.show({
                      type: "gameToast",
                      text1: "Готово",
                      text2: "Никнейм сохранён.",
                    });
                  } catch (e: any) {
                    Toast.show({
                      type: "gameToast",
                      text1: "Ошибка",
                      text2: e?.message ?? "Не удалось сохранить никнейм",
                    });
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>Сохранить никнейм</Text>
              </Pressable>
              <Text style={styles.smallText}>
                Вход выполнен: {session.user.email}
              </Text>
              <View style={styles.avatarRow}>
                <View>
                  <Text style={styles.settingLabel}>Аватар</Text>
                  <Pressable
                    onPress={handlePickAvatar}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Выбрать</Text>
                  </Pressable>
                </View>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: "#eee" }]} />
                )}
              </View>
              {hasConflict && (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    Alert.alert(
                      "Выбор сохранения",
                      "Найден локальный и облачный прогресс. Что применить?",
                      [
                        {
                          text: "Более новый",
                          onPress: async () => {
                            if (!newerIs) return;
                            await resolveSaveConflict(newerIs);
                          },
                        },
                        {
                          text: "Более старый",
                          onPress: async () => {
                            if (!olderIs) return;
                            await resolveSaveConflict(olderIs);
                          },
                        },
                        { text: "Отмена", style: "cancel" },
                      ]
                    );
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    Выбрать сейв (есть конфликт)
                  </Text>
                </Pressable>
              )}
              <Pressable style={styles.secondaryButton} onPress={handleSignOut}>
                <Text style={styles.secondaryButtonText}>Выйти</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Пароль"
                secureTextEntry
                style={styles.input}
              />
              <View style={styles.authButtonsRow}>
                <Pressable style={styles.secondaryButton} onPress={handleSignIn}>
                  <Text style={styles.secondaryButtonText}>Войти</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleSignUp}>
                  <Text style={styles.secondaryButtonText}>Регистрация</Text>
                </Pressable>
              </View>
              <Text style={styles.smallText}>
                Можно играть офлайн — облачное сохранение включится после входа.
              </Text>
            </>
          )}
        </View>
        <View style={styles.settingsGroup}>
          <SettingRow
            label="Звуковые эффекты"
            value={gameState.settings.isSoundEnabled}
            onValueChange={(value) => updateSettings({ isSoundEnabled: value })}
          />
          <SettingRow
            label="Вибрация"
            value={gameState.settings.isVibrationEnabled}
            onValueChange={(value) =>
              updateSettings({ isVibrationEnabled: value })
            }
          />
        </View>
        <Pressable
          style={styles.resetButton}
          onPress={handleResetPress}
          testID="reset-progress-button"
        >
          <Text style={styles.resetButtonText}>Сбросить прогресс</Text>
        </Pressable>
        <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "bold" },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
    backgroundColor: "#eee",
  },
  text: { fontSize: 16, textAlign: "center" },
  resetButton: {
    marginTop: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    marginBottom: 100,
  },
  resetButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  settingsGroup: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginVertical: 30,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  settingLabel: {
    fontSize: 18,
  },
  groupTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  smallText: { fontSize: 14, color: "#666", marginBottom: 10 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  authButtonsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  secondaryButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  secondaryButtonText: { color: "#111", fontWeight: "600" },
  avatarRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
});
