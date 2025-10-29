import { useAudioPlayer } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
// --- ИЗМЕНЕНИЕ: ДОБАВЛЯЕМ View ---
import { Animated, StyleSheet, Text, View } from 'react-native'; 
import { useGame } from '../context/GameContext';
import { minigameDatabase, MinigameReward } from '../data/minigameData';
import EspeonGame from './minigames/EspeonGame';
import MinigameIntro from './minigames/MinigameIntro';
import MinigameResult from './minigames/MinigameResult';
import SylveonGame from './minigames/SylveonGame';
import UmbreonGame from './minigames/UmbreonGame';


type Props = {
  pokemonId: string;
  onComplete: (reward: MinigameReward | null) => void;
};

const MinigameOverlay = ({ pokemonId, onComplete }: Props) => {
  const minigame = minigameDatabase[pokemonId];
  const { gameState } = useGame();
  
  const [status, setStatus] = useState<'intro' | 'playing' | 'finished'>('intro');
  const [reward, setReward] = useState<MinigameReward | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const winPlayer = useAudioPlayer(require('../assets/sounds/sfx/win.mp3'));
  const losePlayer = useAudioPlayer(require('../assets/sounds/sfx/lose.mp3'));

  const handleGameEnd = (gameReward: MinigameReward | null) => {
    if (gameState?.settings.isSoundEnabled) {
      if (gameReward?.type === 'buff') {
        winPlayer.play();
      } else {
        losePlayer.play();
      }
    }
    setReward(gameReward);
    setStatus('finished');
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleCloseResult = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onComplete(reward);
    });
  };
  
  const handleIntroComplete = () => {
    setStatus('playing');
  };

  const renderGame = () => {
    switch (minigame.type) {
        case 'whack-a-mole':
          return <UmbreonGame onComplete={handleGameEnd} />;
        case 'simon-says':
          return <EspeonGame onComplete={handleGameEnd} />;
        case 'connect-pairs':
          return <SylveonGame onComplete={handleGameEnd} />;
        default:
          setTimeout(() => handleGameEnd(null), 1000);
          return <Text style={styles.instructionText}>Мини-игра в разработке</Text>;
      }
  }

  const renderContent = () => {
    switch (status) {
      case 'intro':
        return (
          <MinigameIntro
            title={minigame.name}
            instructions={minigame.instructions}
            onComplete={handleIntroComplete}
          />
        );
      case 'playing':
        // --- ИЗМЕНЕНИЕ: Оборачиваем игру в View, чтобы гарантировать, что она растянется ---
        return (
            <View style={{ flex: 1 }}>
                {renderGame()}
            </View>
        );
      case 'finished':
        return <MinigameResult reward={reward} onClose={handleCloseResult} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim },
        (status === 'finished' || status === 'intro') && styles.centerContent,
      ]}
    >
      {renderContent()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 10,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: '50%',
  },
});

export default MinigameOverlay;