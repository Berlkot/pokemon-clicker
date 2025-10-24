import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text } from 'react-native';
import { useGame } from '../context/GameContext';
import { minigameDatabase, MinigameReward } from '../data/minigameData';
import EspeonGame from './minigames/EspeonGame';
import MinigameResult from './minigames/MinigameResult';
import SylveonGame from './minigames/SylveonGame';
import UmbreonGame from './minigames/UmbreonGame';

import { useAudioPlayer } from 'expo-audio';

type Props = {
  pokemonId: string;
  onComplete: (reward: MinigameReward | null) => void;
};

const MinigameOverlay = ({ pokemonId, onComplete }: Props) => {
  const minigame = minigameDatabase[pokemonId];

  const { gameState } = useGame();
  const [status, setStatus] = useState<'playing' | 'finished'>('playing');
  const [reward, setReward] = useState<MinigameReward | null>(null);


  const fadeAnim = useRef(new Animated.Value(0)).current;
  const winPlayer = useAudioPlayer(require('../assets/sounds/sfx/win.mp3'));
  const losePlayer = useAudioPlayer(require('../assets/sounds/sfx/lose.mp3'));

  const panResponderRef = useRef(PanResponder.create({
      
      onStartShouldSetPanResponder: () => false,
  })).current;

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

  const renderGame = () => {
    switch (minigame.type) {
      case 'whack-a-mole':
        return <UmbreonGame onComplete={handleGameEnd} />;
      case 'simon-says':
        return <EspeonGame onComplete={handleGameEnd} panResponderRef={panResponderRef} />;
      case 'connect-pairs':
        return <SylveonGame onComplete={handleGameEnd} panResponderRef={panResponderRef} />;
      default:
        setTimeout(() => handleGameEnd(null), 1000);
        return <Text style={styles.instructionText}>Мини-игра в разработке</Text>;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.overlay, 
        { opacity: fadeAnim },
        status === 'finished' && styles.centerContent 
      ]} 
      {...panResponderRef.panHandlers}
    >
      {status === 'playing' ? renderGame() : <MinigameResult reward={reward} onClose={handleCloseResult} />}
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
  }
});

export default MinigameOverlay;