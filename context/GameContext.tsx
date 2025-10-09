// context/GameContext.tsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Определяем, как будет выглядеть состояние наших улучшений (ID апгрейда и его уровень).
interface UpgradesState {
  [upgradeId: string]: number; // e.g. { 'stronger_click': 2, 'pikachu_helper': 1 }
}

// Наш основной интерфейс состояния игры.
interface GameState {
  evolutionEnergy: number;
  energyPerClick: number;
  energyPerSecond: number;
  currentPokemonId: string;
  currentPokemonLevel: number;
  currentPokemonExp: number;
  upgrades: UpgradesState;
}

// Что будет предоставлять наш контекст: состояние и функция для его обновления.
interface IGameContext {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  // В будущем сюда можно добавить более специфичные функции, например, purchaseUpgrade()
}

// Создаем сам контекст с начальным значением undefined.
const GameContext = createContext<IGameContext | undefined>(undefined);

const GAME_DATA_KEY = '@PokemonEvolution:gameData';

// Создаем "Провайдер" - компонент, который будет хранить состояние и "раздавать" его дочерним элементам.
export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Вся логика загрузки, сохранения и пассивного дохода теперь живет здесь, в одном месте!
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const savedData = await AsyncStorage.getItem(GAME_DATA_KEY);
        if (savedData !== null) {
                    setGameState({
            evolutionEnergy: 0,
            energyPerClick: 1,
            energyPerSecond: 0,
            currentPokemonId: 'eevee',
            currentPokemonLevel: 40,
            currentPokemonExp: 0,
            upgrades: {}, // Изначально нет купленных апгрейдов
          });
        } else {
          // Начальное состояние игры
          setGameState({
            evolutionEnergy: 0,
            energyPerClick: 1,
            energyPerSecond: 0,
            currentPokemonId: 'bulbasaur',
            currentPokemonLevel: 1,
            currentPokemonExp: 0,
            upgrades: {}, // Изначально нет купленных апгрейдов
          });
        }
      } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
      }
    };
    loadGameData();
  }, []);

  useEffect(() => {
    if (gameState) {
      AsyncStorage.setItem(GAME_DATA_KEY, JSON.stringify(gameState));
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

  return (
    <GameContext.Provider value={{ gameState, setGameState }}>
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