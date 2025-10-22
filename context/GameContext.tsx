import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { formatNumber } from '@/utils/formatNumber';

// Определяем, как будет выглядеть состояние наших улучшений (ID апгрейда и его уровень).
interface UpgradesState {
  [upgradeId: string]: number; // e.g. { 'stronger_click': 2, 'pikachu_helper': 1 }
}

// Наш основной интерфейс состояния игры.
interface GameState {
  lastSavedTime: number;
  evolutionEnergy: number;
  energyPerClick: number;
  energyPerSecond: number;
  currentPokemonId: string;
  currentPokemonLevel: number;
  currentPokemonExp: number;
  upgrades: UpgradesState;
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
};

// --- ОБНОВИМ ИНТЕРФЕЙС КОНТЕКСТА ---
export interface IGameContext {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  resetGame: () => Promise<void>; // <-- Добавляем новую функцию
}

export const GameContext = createContext<IGameContext | undefined>(undefined);
const GAME_DATA_KEY = '@PokemonEvolution:gameData';


// Создаем "Провайдер" - компонент, который будет хранить состояние и "раздавать" его дочерним элементам.
export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Вся логика загрузки, сохранения и пассивного дохода теперь живет здесь, в одном месте!
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const savedDataJson = await AsyncStorage.getItem(GAME_DATA_KEY);
        if (savedDataJson !== null) {
          let savedData: GameState = JSON.parse(savedDataJson);

          // --- ИСПРАВЛЕНИЕ ОФФЛАЙН-ПРОГРЕССА ---
          const timeOfflineInSeconds = (Date.now() - savedData.lastSavedTime) / 1000;
          const offlineEarnings = timeOfflineInSeconds * savedData.energyPerSecond;

          if (offlineEarnings > 1) { // Начисляем, только если заработано что-то значимое
            savedData.evolutionEnergy += offlineEarnings;
            // Показываем уведомление о заработке
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


  return (
    <GameContext.Provider value={{ gameState, setGameState, resetGame }}>
      {children}
    </GameContext.Provider>
  );
};

// Создаем кастомный хук для удобного доступа к контексту.
// Он будет проверять, что мы используем его внутри GameProvider.
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};