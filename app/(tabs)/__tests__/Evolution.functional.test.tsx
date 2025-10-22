import React from 'react';
import { render, fireEvent, waitFor, act } from '../../../__test__/test-utils';
import GameScreen from '../index';
import { GameContext } from '../../../context/GameContext';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: jest.fn(),
}));
jest.mock('expo-audio');
jest.mock('expo-haptics');


const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (
        message.includes('act') ||
        message.includes('Animated') ||
        message.includes('useNativeDriver')
      )
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});


describe('Pokemon Evolution Functional Test with Complex Formula', () => {
  it('should correctly evolve a pokemon when it reaches the required level', async () => {
    
    const level = 4;
    const requiredExp = Math.floor(100 * Math.pow(level, 1.5)); // 100 * 4^1.5 = 100 * 8 = 800

    const initialStateForEspeon = {
      evolutionEnergy: 1000,
      energyPerClick: 1, 
      energyPerSecond: 0,
      currentPokemonId: 'eevee',
      currentPokemonLevel: level,
      currentPokemonExp: requiredExp - 1,
      upgrades: {},
      lastSavedTime: Date.now(),
    };

    let gameState = initialStateForEspeon;
    const setGameState = jest.fn((updater) => {
        gameState = updater(gameState);
    });

    const { getByText, getByTestId, unmount } = render(
      <GameContext.Provider value={{ gameState, setGameState, resetGame: jest.fn() }}>
        <GameScreen />
      </GameContext.Provider>
    );

    await waitFor(() => {
      expect(getByText(/Иивии/)).toBeTruthy();
      expect(getByText(/\(Ур\. 4\)/)).toBeTruthy();
      expect(getByText(new RegExp(`Опыт: ${requiredExp - 1} / ${requiredExp}`))).toBeTruthy();
    });
    
    const pokemonButton = getByTestId('pokemon-pressable');

    await act(async () => {
      fireEvent.press(pokemonButton);
    });
    const finalState = gameState;
    expect(finalState.currentPokemonId).toBe('espeon');
    expect(finalState.currentPokemonLevel).toBe(5);
    expect(finalState.currentPokemonExp).toBe(0);

    unmount();

    const level2 = 9;
    const requiredExp2 = Math.floor(100 * Math.pow(level2, 1.5));

    const initialStateForUmbreon = {
      evolutionEnergy: 10000,
      energyPerClick: 1,
      energyPerSecond: 0,
      currentPokemonId: 'espeon',
      currentPokemonLevel: level2,
      currentPokemonExp: requiredExp2 - 1,
      lastSavedTime: Date.now(),
      upgrades: {},
    };

    let gameState2 = initialStateForUmbreon;
    const setGameState2 = jest.fn((updater) => {
        gameState2 = updater(gameState2);
    });

    const { getByText: getByText2, getByTestId: getByTestId2 } = render(
      <GameContext.Provider value={{ gameState: gameState2, setGameState: setGameState2, resetGame: jest.fn() }}>
        <GameScreen />
      </GameContext.Provider>
    );

    await waitFor(() => {
        expect(getByText2(/Эспион/)).toBeTruthy();
        expect(getByText2(/\(Ур\. 9\)/)).toBeTruthy();
        expect(getByText2(new RegExp(`Опыт: ${requiredExp2 - 1} / ${requiredExp2}`))).toBeTruthy();
    });

    const pokemonButton2 = getByTestId2('pokemon-pressable');
    await act(async () => {
      fireEvent.press(pokemonButton2);
    });

    const finalState2 = gameState2;
    expect(finalState2.currentPokemonId).toBe('umbreon');
    expect(finalState2.currentPokemonLevel).toBe(10);
    expect(finalState2.currentPokemonExp).toBe(0);
  });
});