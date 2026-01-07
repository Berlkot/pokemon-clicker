import { formatNumber } from '@/utils/formatNumber';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'



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
}

const INITIAL_GAME_STATE: GameState = {
  lastSavedTime: Date.now(),
  evolutionEnergy: 0,
  energyPerClick: 1,
  energyPerSecond: 0,
  currentPokemonId: 'eevee',
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
};

export interface ActiveBuff {
  id: number; 
  type: 'xp_multiplier' | 'crit_chance_boost';
  multiplier: number;
  expiresAt: number;
  startTime: number;
}


export interface IGameContext {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  resetGame: () => Promise<void>;
  updateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const GameContext = createContext<IGameContext | undefined>(undefined);
const GAME_DATA_KEY = '@PokemonEvolution:gameData';



export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const savedDataJson = await AsyncStorage.getItem(GAME_DATA_KEY);
        if (savedDataJson !== null) {
          let savedData: GameState = JSON.parse(savedDataJson);
          Object.keys(INITIAL_GAME_STATE).forEach(key => {
            if (!Object.hasOwn(savedData, key)) {
              savedData[key] = INITIAL_GAME_STATE[key]; 
            }
          });

          const timeOfflineInSeconds = (Date.now() - savedData.lastSavedTime) / 1000;
          const offlineEarnings = timeOfflineInSeconds * savedData.energyPerSecond;
          savedData.evolutionEnergy = 1000000000
          savedData.activeMinigameId = null

          if (offlineEarnings > 1) {
            savedData.evolutionEnergy += offlineEarnings;
            Toast.show({
              type: 'gameToast',
              text1: 'С возвращением!',
              text2: `За время вашего отсутствия вы заработали ${formatNumber(Math.floor(offlineEarnings))} энергии!`,
            });
          }
          
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
      setGameState(prevState => {
        if (!prevState || prevState.activeBuffs.length === 0) return prevState;

        const now = Date.now();
        const activeBuffs = prevState.activeBuffs.filter(buff => buff.expiresAt > now);

        if (activeBuffs.length !== prevState.activeBuffs.length) {
          return { ...prevState, activeBuffs };
        }
        return prevState;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!gameState || gameState.energyPerSecond === 0) return;
    const interval = setInterval(() => {
      setGameState(prevState => {
        if (!prevState) return null;
        return { ...prevState, evolutionEnergy: prevState.evolutionEnergy + prevState.energyPerSecond };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, gameState?.energyPerSecond]);

  const resetGame = async () => {
    try {
      await AsyncStorage.removeItem(GAME_DATA_KEY);
      setGameState(INITIAL_GAME_STATE);
    } catch (error) {
      console.error('Ошибка при сбросе прогресса:', error);
    }
  };
    const updateSettings = (newSettings: Partial<GameSettings>) => {
    setGameState(prevState => {
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


  return (
    <GameContext.Provider value={{ gameState, setGameState, resetGame, updateSettings }}>
      {children}
    </GameContext.Provider>
  );
};



export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};