

import { render, RenderOptions } from '@testing-library/react-native';
import React, { FC, ReactElement } from 'react';
import { GameProvider } from '../context/GameContext';

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


export * from '@testing-library/react-native';
export { customRender as render };
