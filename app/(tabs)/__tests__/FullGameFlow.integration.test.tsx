import React from 'react';
import { render, fireEvent, waitFor, act } from '../../../__test__/test-utils';
import GameScreen from '../index';
import UpgradesScreen from '../upgrades';

// --- Моки ---
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: jest.fn(),
}));
jest.mock('expo-av');
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



describe('GameScreen and UpgradesScreen Integration', () => {
  it(
    'should allow user to buy an upgrade and see its effect on the game screen',
    async () => {
      // --- ЭТАП 1: GameScreen ---
      const gameScreen = render(<GameScreen />);
      await waitFor(() => expect(gameScreen.getByText('Энергия Эволюции: 0')).toBeTruthy());

      const pokemonButton = gameScreen.getByTestId('pokemon-pressable');
      await act(async () => {
        for (let i = 0; i < 100; i++) {
          fireEvent.press(pokemonButton);
        }
      });

      await waitFor(() => expect(gameScreen.getByText('Энергия Эволюции: 100')).toBeTruthy());
      gameScreen.unmount(); // ✅ вне act()

      // --- ЭТАП 2: UpgradesScreen ---
      const upgradesScreen = render(<UpgradesScreen />);
      const buyButton = await upgradesScreen.findByText('100 ЭЭ');
      await act(async () => {
        fireEvent.press(buyButton);
      });

      await waitFor(() => expect(upgradesScreen.getByText('Ваша энергия: 0')).toBeTruthy());
      upgradesScreen.unmount(); // ✅ вне act()

      // --- ЭТАП 3: GameScreen снова ---
      const finalGameScreen = render(<GameScreen />);
      await waitFor(() => expect(finalGameScreen.getByText('Энергия Эволюции: 0')).toBeTruthy());

      const finalPokemonButton = finalGameScreen.getByTestId('pokemon-pressable');
      await act(async () => {
        fireEvent.press(finalPokemonButton);
      });

      await waitFor(() => expect(finalGameScreen.getByText('Энергия Эволюции: 2')).toBeTruthy());
    },
    15000
  );
});
