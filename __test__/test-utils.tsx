// __tests__/test-utils.tsx

import React, { FC, ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { GameProvider } from '../context/GameContext'; // Укажите правильный путь

const AllTheProviders: FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <GameProvider>
      {children}
    </GameProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Экспортируем все из testing-library, но переопределяем render
export * from '@testing-library/react-native';
export { customRender as render };