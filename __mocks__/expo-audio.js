
const mockPlayer = {
  play: jest.fn(),
  seekTo: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  
};


export const useAudioPlayer = jest.fn(() => mockPlayer);