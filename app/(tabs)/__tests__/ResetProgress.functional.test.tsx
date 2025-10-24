

import { GameProvider } from '@/context/GameContext';
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '../../../__test__/test-utils';
import ModalScreen from '../../modal';
import GameScreen from '../index';


jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: jest.fn(),
  useRouter: () => ({ back: jest.fn() }), 
}));
jest.mock('expo-audio');
jest.mock('expo-haptics');
jest.mock('react-native-toast-message');

describe('Reset Progress Functional Test', () => {
  it('should reset game progress to initial state', async () => {
    
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <GameProvider>{children}</GameProvider>
    );

    
    const { getByText, getByTestId, unmount, rerender } = render(<GameScreen />, { wrapper: Wrapper });
    
    await waitFor(() => expect(getByText('Опыт: 0 / 100')).toBeTruthy());
    
    const pokemonButton = getByTestId('pokemon-pressable');
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        fireEvent.press(pokemonButton);
      });
    }
    
    await waitFor(() => expect(getByText('Опыт: 10 / 100')).toBeTruthy());

    
    
    
    rerender(<ModalScreen />);

    const alertSpy = jest.spyOn(Alert, 'alert');
    alertSpy.mockImplementation((title, message, buttons) => {
      
      buttons[1].onPress();
    });

    const resetButton = getByTestId('reset-progress-button');
    await act(async () => {
      fireEvent.press(resetButton);
    });
    
    expect(alertSpy).toHaveBeenCalled();

    
    rerender(<GameScreen />);
    
    
    
    await waitFor(() => expect(getByText('Опыт: 0 / 100')).toBeTruthy());
    await waitFor(() => expect(getByText(/Иивии/)).toBeTruthy());
    await waitFor(() => expect(getByText(/\(Ур\. 1\)/)).toBeTruthy());
  });
});