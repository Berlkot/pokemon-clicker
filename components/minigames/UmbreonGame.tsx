import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
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
  // --- ИЗМЕНЕНИЕ: Убрано состояние 'ready'. Игра начинается сразу. ---
  const [gameStatus, setGameStatus] = useState<"playing" | "finished">(
    "playing"
  );
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS / 1000);

  const { width, height } = useWindowDimensions();
  const gameIntervals = useRef<{
    timer: NodeJS.Timeout | null;
    spawner: NodeJS.Timeout | null;
  }>({ timer: null, spawner: null });
  const scoreRef = useRef(score);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // --- ИЗМЕНЕНИЕ: Вся логика отсчета до старта удалена ---

  // --- ИЗМЕНЕНИЕ: endGame обернут в useCallback для стабильности useEffect ---
  const endGame = useCallback(() => {
    // Проверяем, чтобы endGame не вызывался повторно
    if (gameStatus === "finished") return;

    setGameStatus("finished");
    if (gameIntervals.current.timer) clearInterval(gameIntervals.current.timer);
    if (gameIntervals.current.spawner)
      clearTimeout(gameIntervals.current.spawner);
    setEyes([]);

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
    }

    setTimeout(() => onComplete(reward), 1500);
  }, [onComplete, gameStatus]); // Добавлена зависимость gameStatus

  useEffect(() => {
    // Этот эффект теперь запускается сразу, так как gameStatus изначально 'playing'
    if (gameStatus === "playing") {
      gameIntervals.current.timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const spawnEye = () => {
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

        const nextSpawnTime = Math.max(300, 900 - scoreRef.current * 15);
        // Проверяем, что игра все еще идет, перед созданием нового спаунера
        if (gameStatus === 'playing') {
            gameIntervals.current.spawner = setTimeout(spawnEye, nextSpawnTime);
        }
      };
      spawnEye();
    }

    // Функция очистки остается той же, она сработает при unmount или смене gameStatus
    return () => {
      if (gameIntervals.current.timer)
        clearInterval(gameIntervals.current.timer);
      if (gameIntervals.current.spawner)
        clearTimeout(gameIntervals.current.spawner);
    };
  }, [endGame, gameStatus, height, width]);

  const handleEyePress = (eyeId: number) => {
    const eye = eyes.find((e) => e.id === eyeId);
    if (!eye) return;

    setScore((prev) => prev + 1);

    // Удаляем глаз немедленно, чтобы избежать двойных нажатий
    setEyes((prev) => prev.filter((e) => e.id !== eyeId));

    // Анимацию можно запустить и после удаления, она не зависит от состояния
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

  // --- ИЗМЕНЕНИЕ: Удален рендер состояния 'ready' ---

  return (
    <View style={styles.container}>
      <View style={styles.uiContainer}>
        <Text style={styles.uiText}>Счет: {score}</Text>
        <Text style={styles.uiText}>Время: {timeLeft}</Text>
      </View>

      {eyes.map((eye) => {
        const glowOpacity = eye.glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        });
        return (
          <Pressable
            key={eye.id}
            onPress={() => handleEyePress(eye.id)}
            style={[styles.eyePressable, eye.pos]}
          >
            <Animated.View
              style={[styles.eyeContainer, { opacity: eye.fadeAnim }]}
            >
              <Animated.View
                style={[styles.glowContainer, { opacity: glowOpacity }]}
              >
                <Svg height="100%" width="100%" viewBox="0 0 100 100">
                  <Defs>
                    <RadialGradient id="grad" cx="50%" cy="50%" r="50%">
                      <Stop offset="0%" stopColor="#FFDE00" stopOpacity="0.8" />
                      <Stop offset="100%" stopColor="#F44336" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Circle cx="50" cy="50" r="50" fill="url(#grad)" />
                </Svg>
              </Animated.View>
              <Image
                source={require("../../assets/images/umbreon_eye.png")}
                style={styles.eyeImage}
              />
            </Animated.View>
          </Pressable>
        );
      })}

      {gameStatus === "finished" && (
        <View style={styles.finishedContainer}>
          <Text style={styles.finishedText}>Игра окончена!</Text>
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
  // --- Стиль countdownText больше не нужен ---
  eyePressable: { position: "absolute" },
  eyeContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  eyeImage: { width: 70, height: 70, resizeMode: "contain" },
  glowContainer: { position: "absolute", width: 140, height: 140 },
  finishedContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
  },
  finishedText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    textShadowColor: "#FFDE00",
    textShadowRadius: 10,
  },
});

export default UmbreonGame;