import React from 'react';
import { render, fireEvent, waitFor, act } from '../../../__test__/test-utils'; 
import GameScreen from '../index';

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

describe('GameScreen Integration', () => {
  it('should update evolution energy on screen when pokemon is clicked', async () => {
    const { getByText, getByTestId } = render(<GameScreen />);

    await waitFor(() => expect(getByText(/Опыт:\s*0\s*\/\s*100/)).toBeTruthy());

    const pokemonButton = getByTestId('pokemon-pressable');

    await act(async () => {
      fireEvent.press(pokemonButton);
    });

    await waitFor(() => expect(getByText(/Опыт:\s*1\s*\/\s*100/)).toBeTruthy());

    await act(async () => {
      fireEvent.press(pokemonButton);
    });
    await waitFor(() => expect(getByText(/Опыт:\s*2\s*\/\s*100/)).toBeTruthy());
  });
});