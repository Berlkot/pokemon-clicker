// app/__tests__/ResetProgress.functional.test.tsx

import React from 'react';
import { render, fireEvent, waitFor, act } from '../../../__test__/test-utils';
import { Alert } from 'react-native';
import GameScreen from '../index';
import ModalScreen from '../../modal';
import { GameProvider } from '@/context/GameContext';

// Мокаем зависимости
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: jest.fn(),
  useRouter: () => ({ back: jest.fn() }), // Мокаем useRouter
}));
jest.mock('expo-av');
jest.mock('expo-haptics');
jest.mock('react-native-toast-message');

describe('Reset Progress Functional Test', () => {
  it('should reset game progress to initial state', async () => {
    // Создаем "обертку", которая будет использоваться для всех рендеров в этом тесте
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <GameProvider>{children}</GameProvider>
    );

    // --- ЭТАП 1: Генерируем прогресс ---
    const { getByText, getByTestId, unmount, rerender } = render(<GameScreen />, { wrapper: Wrapper });
    
    await waitFor(() => expect(getByText('Энергия Эволюции: 0')).toBeTruthy());
    
    const pokemonButton = getByTestId('pokemon-pressable');
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        fireEvent.press(pokemonButton);
      });
    }
    
    await waitFor(() => expect(getByText('Энергия Эволюции: 10')).toBeTruthy());

    // --- ЭТАП 2: "Переходим" на экран настроек и сбрасываем прогресс ---
    // Вместо unmount/render, мы используем rerender, чтобы "поменять" экран,
    // но сохранить тот же самый GameProvider.
    rerender(<ModalScreen />);

    const alertSpy = jest.spyOn(Alert, 'alert');
    alertSpy.mockImplementation((title, message, buttons) => {
      // @ts-ignore
      buttons[1].onPress();
    });

    const resetButton = getByTestId('reset-progress-button');
    await act(async () => {
      fireEvent.press(resetButton);
    });
    
    expect(alertSpy).toHaveBeenCalled();

    // --- ЭТАП 3: "Возвращаемся" на игровой экран и проверяем ---
    rerender(<GameScreen />);
    
    // Теперь мы проверяем тот же самый экземпляр GameContext, который был сброшен,
    // и эта проверка пройдет успешно.
    await waitFor(() => expect(getByText('Энергия Эволюции: 0')).toBeTruthy());
    await waitFor(() => expect(getByText(/Иивии/)).toBeTruthy());
    await waitFor(() => expect(getByText(/\(Ур\. 1\)/)).toBeTruthy());
  });
});