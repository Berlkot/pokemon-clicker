import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

type Props = {
  title: string;
  instructions: string;
  onComplete: () => void; // Функция, которая будет вызвана по завершении отсчета
};

const MinigameIntro = ({ title, instructions, onComplete }: Props) => {
  const [countdown, setCountdown] = useState(3);
  const scaleAnim = React.useRef(new Animated.Value(0.5)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Анимация появления текста
    Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    // Запускаем таймер обратного отсчета
    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    // Завершаем интро через 3 секунды
    const timeout = setTimeout(() => {
      clearInterval(interval);
      // Анимация исчезновения
      Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(onComplete);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete, opacityAnim, scaleAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.instructions}>{instructions}</Text>
      <Text style={styles.countdown}>
        {countdown > 0 ? countdown : 'GO!'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructions: {
    color: '#ddd',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  countdown: {
    color: '#FFDE00', // Яркий желтый, как у Умбреона
    fontSize: 96,
    fontWeight: '900',
  },
});

export default MinigameIntro;