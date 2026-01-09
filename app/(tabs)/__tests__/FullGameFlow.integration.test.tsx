import { useGame } from '@/context/GameContext';
import React from 'react';
import { act, fireEvent, render, waitFor } from '../../../__test__/test-utils';
import GameScreen from '../index';
import UpgradesScreen from '../upgrades';


jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: jest.fn(),
}));
jest.mock('expo-audio');
jest.mock('expo-haptics');
jest.mock('react-native-toast-message');

jest.mock('react-native/Libraries/Animated/Animated', () => {
  const ActualAnimated = jest.requireActual('react-native/Libraries/Animated/Animated');
  const mock = new Proxy(ActualAnimated, {
    get(target, prop) {
      if (['timing', 'spring', 'sequence', 'parallel'].includes(prop)) {
        return () => ({ start: (cb) => cb?.({ finished: true }) });
      }
      return target[prop];
    },
  });
  return mock;
});
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


let contextState: any = null;
const ContextSpy = () => {
  const { gameState } = useGame();
  contextState = gameState;
  return null;
};


describe('GameScreen and UpgradesScreen Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  it(
    'should allow user to buy an upgrade and see its effect on the game screen',
    async () => {
      const gameScreen = render(<GameScreen />);
      await waitFor(() => expect(gameScreen.getByText(/Опыт:\s*0\s*\/\s*100/)).toBeTruthy());

      const pokemonButton = gameScreen.getByTestId('pokemon-pressable');
      await act(async () => {
        for (let i = 0; i < 120; i++) {
          fireEvent.press(pokemonButton);
        }
      });
      gameScreen.unmount();

      const upgradesScreen = render(<UpgradesScreen />);
      const buyButton = await upgradesScreen.findByText('120 ЭЭ');
      await act(async () => {
        fireEvent.press(buyButton);
      });

      upgradesScreen.unmount();

      const finalGameScreen = render(<GameScreen />);
      await waitFor(() => expect(finalGameScreen.getByText(/Опыт:\s*20\s*\/\s*282/)).toBeTruthy());

      const finalPokemonButton = finalGameScreen.getByTestId('pokemon-pressable');
      await act(async () => {
        fireEvent.press(finalPokemonButton);
      });

      await waitFor(() => expect(finalGameScreen.getByText(/Опыт:\s*22\s*\/\s*282/)).toBeTruthy());
    },
    15000
  );
});
