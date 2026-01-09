import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { MinigameReward } from "../../data/minigameData";

const GAME_DURATION_MS = 15000;
const EYE_LIFETIME_MS = 1500;

type Eye = {
  id: number;
  pos: { top: number; left: number };
  fadeAnim: Animated.Value;
  glowAnim: Animated.Value;
};

const UmbreonGame = ({
  onComplete,
}: {
  onComplete: (reward: MinigameReward | null) => void;
}) => {
  const [eyes, setEyes] = useState<Eye[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS / 1000);
  const [isGameActive, setIsGameActive] = useState(true);

  const { width, height } = useWindowDimensions();

  // Рефы для доступа к актуальным данным внутри замыканий (интервалов)
  const scoreRef = useRef(0);
  const isGameActiveRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  const timersRef = useRef<{
    mainTimer: NodeJS.Timeout | null;
    spawner: NodeJS.Timeout | null;
  }>({ mainTimer: null, spawner: null });

  // Обновляем рефы при рендере
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const endGame = useCallback(() => {
    if (!isGameActiveRef.current) return;

    isGameActiveRef.current = false;
    setIsGameActive(false);

    if (timersRef.current.mainTimer) clearInterval(timersRef.current.mainTimer);
    if (timersRef.current.spawner) clearTimeout(timersRef.current.spawner);

    setEyes([]); // Очищаем глаза

    const finalScore = scoreRef.current;
    let reward: MinigameReward | null = null;

    if (finalScore > 18) {
      reward = {
        type: "buff",
        buffType: "xp_multiplier",
        multiplier: 2,
        duration: 15,
      };
    } else if (finalScore > 8) {
      reward = { type: "xp_boost", value: Math.min(25, 5 + finalScore) };
    } else if (finalScore > 0) {
      reward = { type: "xp_boost", value: finalScore };
    } else {
      // Штраф
      reward = { type: "penalty", penaltyType: "extra_cooldown", value: 20 };
    }

    setTimeout(() => {
      onCompleteRef.current(reward);
    }, 1500);
  }, []);

  // Основной игровой цикл (ЗАПУСКАЕТСЯ ТОЛЬКО ОДИН РАЗ)
  useEffect(() => {
    // 1. Таймер обратного отсчета
    timersRef.current.mainTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Логика спавна глаз
    const spawnEye = () => {
      if (!isGameActiveRef.current) return;

      const newEye: Eye = {
        id: Date.now() + Math.random(),
        pos: {
          top: 100 + Math.random() * (height - 450),
          left: 20 + Math.random() * (width - 100),
        },
        fadeAnim: new Animated.Value(0),
        glowAnim: new Animated.Value(0),
      };

      setEyes((prev) => [...prev, newEye]);

      // Анимация появления/исчезновения
      Animated.sequence([
        Animated.timing(newEye.fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(EYE_LIFETIME_MS - 700),
        Animated.timing(newEye.fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setEyes((prev) => prev.filter((e) => e.id !== newEye.id));
      });

      // Планируем следующий спавн
      // Сложность растет: чем больше очков, тем быстрее появляются
      const nextSpawnTime = Math.max(600, 900 - scoreRef.current * 15);

      timersRef.current.spawner = setTimeout(spawnEye, nextSpawnTime);
    };

    // Первый запуск спавнера
    spawnEye();

    // Очистка при размонтировании
    return () => {
      if (timersRef.current.mainTimer)
        clearInterval(timersRef.current.mainTimer);
      if (timersRef.current.spawner) clearTimeout(timersRef.current.spawner);
    };
  }, []); // Пустой массив зависимостей = стабильная работа

  const handleEyePress = (eyeId: number) => {
    const eye = eyes.find((e) => e.id === eyeId);
    if (!eye) return;

    setScore((prev) => prev + 1);
    setEyes((prev) => prev.filter((e) => e.id !== eyeId));

    // Эффект "вспышки" (можно оставить, даже если глаз удален из DOM, анимация не упадет)
    Animated.sequence([
      Animated.timing(eye.glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(eye.glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <View style={styles.uiContainer}>
        <Text style={styles.uiText}>Счет: {score}</Text>
        <Text style={styles.uiText}>Время: {timeLeft}</Text>
      </View>

      {eyes.map((eye) => (
        <Pressable
          key={eye.id}
          onPress={() => handleEyePress(eye.id)}
          style={[styles.eyePressable, eye.pos]}
        >
          <Animated.Image
            source={require("../../assets/images/umbreon_eye.png")} // Убедись, что путь верный
            style={[styles.eyeImage, { opacity: eye.fadeAnim }]}
          />
        </Pressable>
      ))}

      {!isGameActive && (
        <View style={styles.finishedContainer}>
          <Text style={styles.finishedText}>
            {score > 0 ? "Отлично!" : "Время вышло!"}
          </Text>
          <Text style={styles.finishedText}>Ваш счет: {score}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%", height: "100%", backgroundColor: "#000" },
  uiContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 60,
    zIndex: 10,
  },
  uiText: { color: "white", fontSize: 22, fontWeight: "bold" },
  eyePressable: { position: "absolute", padding: 10 },
  eyeImage: { width: 70, height: 70, resizeMode: "contain" },
  finishedContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 20,
  },
  finishedText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    textShadowColor: "#FFDE00",
    textShadowRadius: 10,
  },
});

export default UmbreonGame;
