export const Audio = {
  Sound: {
    createAsync: jest.fn(() => Promise.resolve({
      sound: {
        playAsync: jest.fn(() => Promise.resolve()),
        replayAsync: jest.fn(() => Promise.resolve()),
        unloadAsync: jest.fn(() => Promise.resolve()),
      },
      status: {
        isLoaded: true,
      },
    })),
  },
};