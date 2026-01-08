import { formatNumber } from "@/utils/formatNumber";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import * as FileSystem from "expo-file-system/legacy";
import { pokemonDatabase } from "../data/pokemonData";

interface UpgradesState {
  [upgradeId: string]: number;
}
interface GameSettings {
  isSoundEnabled: boolean;
  isVibrationEnabled: boolean;
}

interface GameState {
  lastSavedTime: number;
  evolutionEnergy: number;
  energyPerClick: number;
  energyPerSecond: number;
  currentPokemonId: string;
  currentPokemonLevel: number;
  currentPokemonExp: number;
  upgrades: UpgradesState;
  settings: GameSettings;
  activeBuffs: ActiveBuff[];
  activeMinigameId: string | null;
  nextMinigameTime: number;
  pausedCooldownTime: number;
  xpPerClick: number;
  xpPerSecond: number;
  minigameCooldownStartedAt: number
minigameCooldownTotalMs: number,
 

}

const INITIAL_GAME_STATE: GameState = {
  lastSavedTime: Date.now(),
  evolutionEnergy: 0,
  energyPerClick: 1,
  energyPerSecond: 0,
  currentPokemonId: "eevee",
  currentPokemonLevel: 1,
  currentPokemonExp: 0,
  upgrades: {},
  settings: {
    isSoundEnabled: true,
    isVibrationEnabled: true,
  },
  activeBuffs: [],
  activeMinigameId: null,
  nextMinigameTime: 0,
  pausedCooldownTime: 0,
  xpPerClick: 1,
  xpPerSecond: 0,
  minigameCooldownStartedAt: 0,
  minigameCooldownTotalMs: 100000,

};

export interface ActiveBuff {
  id: number;
  type: "xp_multiplier" | "crit_chance_boost";
  multiplier: number;
  expiresAt: number;
  startTime: number;
}

type SaveChoice = "local" | "cloud";

interface SaveMeta {
  localLastSavedTime: number | null;
  cloudLastSavedTime: number | null;
  hasConflict: boolean;
}

export interface IGameContext {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  resetGame: () => Promise<void>;
  updateSettings: (newSettings: Partial<GameSettings>) => void;

  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  saveMeta: SaveMeta;
  resolveSaveConflict: (choice: SaveChoice) => Promise<void>;

  avatarUrl: string | null;
  uploadAvatar: (imageUri: string) => Promise<void>;
  isBlocked: boolean;
  blockReason: string | null;
  nickname: string | null;
  updateNickname: (nickname: string) => Promise<void>;
  getBuffInfo: (buff: ActiveBuff) => { title: string; description: string };
}

export const GameContext = createContext<IGameContext | undefined>(undefined);
const GAME_DATA_KEY = "@PokemonEvolution:gameData";

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [cloudSave, setCloudSave] = useState<GameState | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);

  const [saveMeta, setSaveMeta] = useState<SaveMeta>({
    localLastSavedTime: null,
    cloudLastSavedTime: null,
    hasConflict: false,
  });

  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadGameData = async () => {
      try {
        const savedDataJson = await AsyncStorage.getItem(GAME_DATA_KEY);
        if (savedDataJson !== null) {
          let savedData: GameState = JSON.parse(savedDataJson);
          Object.keys(INITIAL_GAME_STATE).forEach((key) => {
            if (!Object.hasOwn(savedData, key)) {
              savedData[key] = INITIAL_GAME_STATE[key];
            }
          });

          const timeOfflineInSeconds =
            (Date.now() - savedData.lastSavedTime) / 1000;

          const offlineEnergy =
            timeOfflineInSeconds * savedData.energyPerSecond;
          const offlineXp = timeOfflineInSeconds * (savedData.xpPerSecond ?? 0);

          if (offlineEnergy >= 1 || offlineXp >= 1) {
            savedData.evolutionEnergy += offlineEnergy;
            savedData.currentPokemonExp += Math.floor(offlineXp);
            const energyString = offlineEnergy
              ? formatNumber(Math.floor(offlineEnergy)) + " энергии"
              : "";
            const xpString = offlineXp
              ? formatNumber(Math.floor(offlineXp)) + " опыта"
              : "";
            Toast.show({
              type: "gameToast",
              text1: "С возвращением!",
              text2: `За время вашего отсутствия вы заработали ${energyString}${
                !!energyString && !!xpString ? " и " : ""
              }${xpString}!`,
            });
          }
          savedData.activeMinigameId = null;
          setGameState(savedData);
        } else {
          setGameState(INITIAL_GAME_STATE);
        }
      } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
      }
    };
    loadGameData();
  }, []);

  useEffect(() => {
    if (gameState) {
      const stateToSave = { ...gameState, lastSavedTime: Date.now() };
      AsyncStorage.setItem(GAME_DATA_KEY, JSON.stringify(stateToSave));
    }
  }, [gameState]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((prevState) => {
        if (!prevState || prevState.activeBuffs.length === 0) return prevState;

        const now = Date.now();
        const activeBuffs = prevState.activeBuffs.filter(
          (buff) => buff.expiresAt > now
        );

        if (activeBuffs.length !== prevState.activeBuffs.length) {
          return { ...prevState, activeBuffs };
        }
        return prevState;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      !gameState ||
      (gameState.energyPerSecond === 0 && gameState.xpPerSecond === 0)
    )
      return;
    const interval = setInterval(() => {
      setGameState((prev) => {
        if (!prev) return null;

        const next = {
          ...prev,
          evolutionEnergy: prev.evolutionEnergy + prev.energyPerSecond,
          currentPokemonExp: prev.currentPokemonExp + (prev.xpPerSecond ?? 0),
        };

        return applyLevelUps(next);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, gameState?.energyPerSecond]);

  const resetGame = async () => {
    try {
      await AsyncStorage.removeItem(GAME_DATA_KEY);
      setGameState(INITIAL_GAME_STATE);
    } catch (error) {
      console.error("Ошибка при сбросе прогресса:", error);
    }
  };
  const updateSettings = (newSettings: Partial<GameSettings>) => {
    setGameState((prevState) => {
      if (!prevState) return null;
      return {
        ...prevState,
        settings: {
          ...prevState.settings,
          ...newSettings,
        },
      };
    });
  };
  const normalizeSave = (save: GameState): GameState => {
    const copy: any = { ...save };
    Object.keys(INITIAL_GAME_STATE).forEach((key) => {
      if (!Object.hasOwn(copy, key)) {
        copy[key] = (INITIAL_GAME_STATE as any)[key];
      }
    });
    return copy as GameState;
  };
  const applyLevelUps = (state: GameState): GameState => {
    let currentPokemonId = state.currentPokemonId;
    let currentPokemonLevel = state.currentPokemonLevel;
    let currentPokemonExp = state.currentPokemonExp;

    while (true) {
      const requiredExp = Math.floor(100 * Math.pow(currentPokemonLevel, 1.5));
      if (currentPokemonExp < requiredExp) break;

      currentPokemonExp -= requiredExp;
      currentPokemonLevel += 1;

      const pokemonData = pokemonDatabase[currentPokemonId];
      if (
        pokemonData?.evolvesTo &&
        currentPokemonLevel >= (pokemonData.evolutionLevel ?? 999)
      ) {
        currentPokemonId = pokemonData.evolvesTo;
      }
    }

    return {
      ...state,
      currentPokemonId,
      currentPokemonLevel,
      currentPokemonExp,
    };
  };

  const getBuffInfo = (buff: { type: string; multiplier: number; expiresAt: number }) => {
  const secondsLeft = Math.max(0, Math.ceil((buff.expiresAt - Date.now()) / 1000))

  switch (buff.type) {
    case 'xp_multiplier':
      return {
        title: 'Множитель опыта',
        description: `Опыт умножается на x${buff.multiplier}.\nОсталось: ${secondsLeft}с.`,
      }
    case 'crit_chance_boost':
      return {
        title: 'Шанс крита',
        description: `Шанс крита увеличен (множитель: x${buff.multiplier}).\nОсталось: ${secondsLeft}с.`,
      }
    default:
      return {
        title: 'Бафф',
        description: `Множитель: x${buff.multiplier}.\nОсталось: ${secondsLeft}с.`,
      }
  }
}


  const fetchCloudSave = async (userId: string) => {
    const { data, error } = await supabase
      .from("game_saves")
      .select("save")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.save ? (data.save as GameState) : null;
  };

  const upsertCloudSave = async (userId: string, save: GameState) => {
    const payload = save;

    const { error } = await supabase.from("game_saves").upsert({
      user_id: userId,
      save: payload,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  };
  useEffect(() => {
    const run = async () => {
      if (!session?.user?.id) {
        setAvatarUrl(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, avatar_path, nickname")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!error) {
        setAvatarUrl(data?.avatar_url ?? null);
        setNickname(data?.nickname ?? null);
      }
    };

    run().catch(console.error);
  }, [session?.user?.id]);
  useEffect(() => {
    const run = async () => {
      if (!session?.user?.id) {
        setCloudSave(null);
        setCloudSyncEnabled(false);
        setSaveMeta((m) => ({
          ...m,
          cloudLastSavedTime: null,
          hasConflict: false,
        }));
        return;
      }

      const remote = await fetchCloudSave(session.user.id);
      const normalized = remote ? normalizeSave(remote) : null;
      setCloudSave(normalized);

      const localTime = gameState?.lastSavedTime ?? null;
      const cloudTime = normalized?.lastSavedTime ?? null;

      const hasConflict =
        localTime !== null && cloudTime !== null && cloudTime > localTime;

      if (hasConflict) {
        setIsBlocked(true);
        setBlockReason(
          "Найден конфликт локального и облачного сохранения. Выберите, какой прогресс применить."
        );
      } else {
        setIsBlocked(false);
        setBlockReason(null);
      }

      setSaveMeta({
        localLastSavedTime: localTime,
        cloudLastSavedTime: cloudTime,
        hasConflict,
      });

      // Если конфликта нет:
      // - если cloud есть и local нет → берем cloud
      // - если local есть и cloud нет → можно сразу включить sync (будем пушить local)
      if (!hasConflict) {
        if (!gameState && normalized) {
          setGameState(normalized);
        }
        setCloudSyncEnabled(true);
      } else {
        setCloudSyncEnabled(false);
      }
      if (
        session?.user?.id &&
        gameState &&
        cloudTime !== null &&
        localTime !== null &&
        localTime >= cloudTime
      ) {
        // локальный новее/равен -> просто обновим облако
        upsertCloudSave(session.user.id, gameState).catch(console.error);
      }
    };

    run().catch((e) => console.error("Cloud load error", e));
  }, [session?.user.id, gameState?.lastSavedTime, gameState]);

  const resolveSaveConflict = async (choice: SaveChoice) => {
    if (!session?.user?.id) return;

    if (choice === "cloud") {
      if (cloudSave) {
        setGameState(cloudSave);
      }
    } else {
      if (gameState) {
        await upsertCloudSave(session.user.id, gameState);
      }
    }

    setIsBlocked(false);
    setBlockReason(null);

    setCloudSyncEnabled(true);
    setSaveMeta((m) => ({ ...m, hasConflict: false }));
  };
  useEffect(() => {
    if (!gameState) return;
    if (!session?.user?.id) return;
    if (!cloudSyncEnabled) return;

    const t = setTimeout(() => {
      upsertCloudSave(session.user.id, gameState).catch((e) =>
        console.error("Cloud push error", e)
      );
    }, 800);

    return () => clearTimeout(t);
  }, [gameState, session?.user?.id, cloudSyncEnabled]);
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setCloudSyncEnabled(false);
  };
  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = globalThis.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes.buffer;
  };

  const uploadAvatar = async (imageUri: string) => {
    if (!session?.user?.id) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const oldPath = profile?.avatar_path ?? null;
    if (oldPath) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }

    // читаем файл как base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = base64ToArrayBuffer(base64);

    const ext = imageUri.split(".").pop() || "jpg";
    const path = `${session.user.id}/avatar_${Date.now()}.${ext}`;
    console.log("path", path);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, arrayBuffer, {
        upsert: true,
        contentType: "image/jpeg",
      });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: session.user.id,
      avatar_url: publicUrl,
      avatar_path: path,
      updated_at: new Date().toISOString(),
    });

    if (profileError) throw profileError;

    setAvatarUrl(publicUrl);
  };

  const updateNickname = async (newNickname: string) => {
    if (!session?.user?.id) throw new Error("Not authenticated");

    const trimmed = newNickname.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      throw new Error("Никнейм должен быть от 1 до 20 символов");
    }

    const { error } = await supabase.from("profiles").upsert({
      user_id: session.user.id,
      nickname: trimmed,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    setNickname(trimmed);
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        resetGame,
        updateSettings,
        updateNickname,
        nickname,

        session,
        signIn,
        signUp,
        signOut,

        saveMeta,
        resolveSaveConflict,

        avatarUrl,
        uploadAvatar,
        isBlocked,
        blockReason,
        getBuffInfo
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
