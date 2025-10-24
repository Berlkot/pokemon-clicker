import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { MinigameReward } from '../../data/minigameData';
import Colors from '../../constants/Colors';
import { FontAwesome5 } from '@expo/vector-icons';

type Props = {
  reward: MinigameReward | null;
  onClose: () => void;
};

const MinigameResult = ({ reward, onClose }: Props) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const getRewardText = () => {
    if (!reward) return { title: 'Увы!', description: 'В следующий раз повезет больше!' };
    
    switch (reward.type) {
      case 'xp_boost':
        return { title: 'Отлично!', description: `Вы получили +${reward.value}% опыта!` };
      case 'buff':
        const buffName = reward.buffType === 'xp_multiplier' ? 'Множитель опыта' : 'Шанс крита';
        return { title: 'Превосходно!', description: `Активен бафф "${buffName}" x${reward.multiplier} на ${reward.duration}с!` };
    }
  };

  const { title, description } = getRewardText();

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.title}>{title}</Text>
      <FontAwesome5 name={reward ? 'star' : 'times-circle'} size={60} color={reward ? Colors.accent : Colors.darkGray} style={{ marginVertical: 20 }}/>
      <Text style={styles.description}>{description}</Text>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Продолжить</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primary,
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 30,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 25,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MinigameResult;