import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AudioPlayer, createAudioPlayer, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import Svg, { Circle } from "react-native-svg";
import MinigameOverlay from "../../components/MinigameOverlay";
import Colors from "../../constants/Colors";
import { useGame } from "../../context/GameContext";
import { minigameDatabase, MinigameReward } from "../../data/minigameData";
import { pokemonDatabase } from "../../data/pokemonData";
import { formatNumber } from "../../utils/formatNumber";
import BackgroundGradient from "@/components/BackgroundGradient";

type FloatingNumber = {
  id: number;
  value: number;
  animation: Animated.Value;
  startX: number;
  startY: number;
  isCrit: boolean;
  isBuffed: boolean;
};

type XpFloatingNumber = {
  id: number;
  value: number;
  animation: Animated.Value;
  startX: number;
  startY: number;
};

const HOLD_DURATION_MS = 1500;
const MINIGAME_COOLDOWN_MS = 100000;
const CRIT_CHANCE = 0.1;
const CRIT_MULTIPLIER = 5;

const POKEMON_SIZE = 250;
const SQUEEZE_SCALE_Y = 0.8;

const SQUEEZE_TRANSLATE_Y = ((1 - SQUEEZE_SCALE_Y) / 2) * POKEMON_SIZE;
const defaultPokemonData = pokemonDatabase["eevee"];

type PikachuSprite = {
  id: number;
  animation: Animated.Value;
  x: number;
  y: number;
};

const PikachuSpriteComponent = memo(function PikachuSpriteComponent({
  sprite,
}: {
  sprite: PikachuSprite;
}) {
  const translateY = sprite.animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.Image
      source={require("../../assets/images/pikachu.png")}
      style={[
        styles.pikachuSprite,
        {
          left: sprite.x,
          top: sprite.y,
          transform: [{ translateY }],
        },
      ]}
    />
  );
});

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function GameScreen() {
  const { gameState, setGameState, getBuffInfo } = useGame();
  const { width, height } = useWindowDimensions();

  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);

  const [pikachuSprites, setPikachuSprites] = useState<PikachuSprite[]>([]);

  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const translateAnimation = useRef(new Animated.Value(0)).current;
  const player = useAudioPlayer(require("../../assets/sounds/click.mp3"));
  const cryPlayer = useRef<AudioPlayer | null>(null);
  const colorAnimationDriver = useRef(new Animated.Value(0)).current;
  const previousBgColor = useRef(Colors.stageColors[0]);
  const previousAccentColor = useRef(Colors.stageAccentColors[0]);
  const [minigameCooldownProgress, setMinigameCooldownProgress] = useState(0);
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const holdAnimation = useRef(new Animated.Value(0)).current;
  const [isMinigameVisible, setIsMinigameVisible] = useState(false);
  const transitionPokemonScale = useRef(new Animated.Value(1)).current;
  const transitionPokemonOpacity = useRef(new Animated.Value(0)).current;
  const transitionWipe = useRef(new Animated.Value(0)).current;
  const [xpFloatingNumbers, setXpFloatingNumbers] = useState<
    XpFloatingNumber[]
  >([]);

  const [buffTimerOffsets, setBuffTimerOffsets] = useState<{
    [key: number]: number;
  }>({});

  const previousPokemonId = useRef(gameState?.currentPokemonId);
  const levelUpAnimation = useRef(new Animated.Value(0)).current;
  const [maskImageSource, setMaskImageSource] = useState(
    pokemonDatabase[gameState?.currentPokemonId || "eevee"].image
  );

  const [expBarWidth, setExpBarWidth] = useState(0);
  let extraCooldownMs = 0;

  const triggerLevelUpAnimation = () => {
    requestAnimationFrame(() => {
      levelUpAnimation.setValue(0);
      Animated.sequence([
        Animated.timing(levelUpAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(levelUpAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
          delay: 800,
        }),
      ]).start();
    });
  };

  const createXpFloatingNumber = useCallback(
    (value: number) => {
      if (value <= 0 || !gameState) return;

      const requiredExp = Math.floor(
        100 * Math.pow(gameState.currentPokemonLevel, 1.5)
      );
      const progressRatio =
        requiredExp > 0
          ? Math.min(gameState.currentPokemonExp / requiredExp, 1)
          : 0;
      const startX = expBarWidth * progressRatio - 10;
      const startY = 25;

      const newNumber: XpFloatingNumber = {
        id: Date.now() + Math.random(),
        value,
        animation: new Animated.Value(0),
        startX: Math.max(0, startX),
        startY,
      };

      setXpFloatingNumbers((curr) => [...curr, newNumber]);

      Animated.timing(newNumber.animation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setXpFloatingNumbers((curr) =>
          curr.filter((n) => n.id !== newNumber.id)
        );
      });
    },
    [gameState, expBarWidth]
  );

  const triggerClickAnimation = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: SQUEEZE_SCALE_Y,
          duration: 75,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnimation, {
          toValue: SQUEEZE_TRANSLATE_Y,
          duration: 75,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.spring(scaleAnimation, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(translateAnimation, {
          toValue: 0,
          friction: 3,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  useEffect(() => {
    if (!gameState) return;
    if (gameState.activeMinigameId) return;
    const xpPerSecond = gameState.xpPerSecond;
    if (xpPerSecond <= 0) return;

    const interval = setInterval(() => {
      createXpFloatingNumber(xpPerSecond);
    }, 1000);

    return () => clearInterval(interval);
  }, [
    gameState?.xpPerSecond,
    gameState?.activeMinigameId,
    createXpFloatingNumber,
    gameState,
  ]);

  useEffect(() => {
    // Вход в мини-игру
    if (gameState?.activeMinigameId && !isMinigameVisible) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(transitionPokemonScale, {
            toValue: 3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(transitionPokemonOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(transitionWipe, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 1. Показываем оверлей игры
        setIsMinigameVisible(true);
        // 2. ВСЁ! НЕ сбрасываем значение шторки.
        // Она остается внизу (со значением 1) за оверлеем.
      });
    }
    // Выход из мини-игры (этот блок теперь будет работать правильно)
    else if (!gameState?.activeMinigameId && isMinigameVisible) {
      // Прячем оверлей игры, чтобы стала видна шторка
      setIsMinigameVisible(false);
      // Анимируем шторку вверх (от ее текущего значения 1 к 0)
      Animated.timing(transitionWipe, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        // Добавим небольшую задержку, чтобы избежать мерцания
        delay: 10,
      }).start(() => {
        // Сбрасываем остальные анимации
        transitionPokemonScale.setValue(1);
        transitionPokemonOpacity.setValue(0);
      });
    }
  }, [
    gameState?.activeMinigameId,
    isMinigameVisible,
    transitionPokemonOpacity,
    transitionPokemonScale,
    transitionWipe,
  ]);

  useEffect(() => {
    if (!gameState) return;

    const currentId = gameState.currentPokemonId;

    // --- ИЗМЕНЕНИЕ 2: Новая, более надежная проверка ---
    // Запускаем анимацию только если ID покемона действительно изменился
    if (currentId !== previousPokemonId.current) {
      const pokemonData = pokemonDatabase[currentId];
      const newBgColor = Colors.stageColors[pokemonData.evolutionStage - 1];
      const newAccentColor =
        Colors.stageAccentColors[pokemonData.evolutionStage - 1];

      colorAnimationDriver.setValue(0);
      Animated.timing(colorAnimationDriver, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start(() => {
        // После завершения анимации:
        // 1. Обновляем маску на изображение нового покемона
        setMaskImageSource(pokemonData.image);
        // 2. Обновляем ref, чтобы он "запомнил" нового покемона для следующей проверки
        previousPokemonId.current = currentId;
      });

      // Обновляем предыдущие цвета для интерполяции
      previousBgColor.current = newBgColor;
      previousAccentColor.current = newAccentColor;
    }
  }, [colorAnimationDriver, gameState, gameState?.currentPokemonId]);

  const createFloatingNumber = useCallback(
    (value: number, isCrit: boolean = false, isBuffed: boolean = false) => {
      const spawnArea = 150;

      const newNumber: FloatingNumber = {
        id: Date.now() + Math.random(),
        value,
        animation: new Animated.Value(0),
        startX: Math.random() * spawnArea + 50,
        startY: Math.random() * spawnArea,
        isCrit,
        isBuffed,
      };

      setFloatingNumbers((current) => {
        if (current.length > 20) {
          return [...current.slice(1), newNumber];
        }
        return [...current, newNumber];
      });

      Animated.timing(newNumber.animation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }).start(() => {
        setFloatingNumbers((current) =>
          current.filter((n) => n.id !== newNumber.id)
        );
      });
    },
    []
  );
  useEffect(() => {
    if (gameState?.activeMinigameId && gameState.settings.isSoundEnabled) {
      const pokemonData = pokemonDatabase[gameState.activeMinigameId];
      if (pokemonData && pokemonData.cry) {
        const player = createAudioPlayer(pokemonData.cry);
        player.play();
        cryPlayer.current = player;
      }
    }

    return () => {
      if (cryPlayer.current) {
        cryPlayer.current.remove();
        cryPlayer.current = null;
      }
    };
  }, [gameState?.activeMinigameId, gameState?.settings.isSoundEnabled]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Выход из игры", "Вы уверены, что хотите выйти?", [
          { text: "Остаться", style: "cancel", onPress: () => null },
          {
            text: "Выйти",
            style: "destructive",
            onPress: () => BackHandler.exitApp(),
          },
        ]);

        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (!gameState || gameState.energyPerSecond === 0) {
        return;
      }

      const interval = setInterval(() => {
        setGameState((prevState) => {
          if (!prevState) return null;
          return {
            ...prevState,
            evolutionEnergy:
              prevState.evolutionEnergy + prevState.energyPerSecond,
          };
        });
      }, 1000);

      return () => clearInterval(interval);
    }, [gameState, setGameState])
  );
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (!gameState) return;

      const now = Date.now();

      if (gameState.activeMinigameId) {
        const progress =
          1 -
          gameState.pausedCooldownTime /
            (MINIGAME_COOLDOWN_MS + extraCooldownMs);
        setMinigameCooldownProgress(progress);
      } else if (gameState.nextMinigameTime > now) {
        const total = gameState.minigameCooldownTotalMs || MINIGAME_COOLDOWN_MS;
        const start =
          gameState.minigameCooldownStartedAt ||
          gameState.nextMinigameTime - total;
        const elapsed = now - start;
        const progress = elapsed / total;
        setMinigameCooldownProgress(clamp01(progress));
      } else {
        setMinigameCooldownProgress(1);
      }

      if (gameState.activeBuffs.length > 0) {
        const CIRCLE_RADIUS = 18;
        const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

        const newBuffTimers: { [key: number]: number } = {};
        gameState.activeBuffs.forEach((buff) => {
          const totalDuration = buff.expiresAt - buff.startTime;
          const timeLeft = buff.expiresAt - now;

          if (timeLeft > 0) {
            const progress = timeLeft / totalDuration;
            newBuffTimers[buff.id] = CIRCUMFERENCE * (1 - progress);
          }
        });
        setBuffTimerOffsets(newBuffTimers);
      } else if (Object.keys(buffTimerOffsets).length > 0) {
        setBuffTimerOffsets({});
      }
    }, 100);

    return () => clearInterval(timerInterval);
  }, [buffTimerOffsets, extraCooldownMs, gameState]);

  useEffect(() => {
    if (!gameState) return;

    const pikachuLevel = gameState.upgrades["pikachu_helper"] || 0;

    if (pikachuLevel === pikachuSprites.length) return;

    if (pikachuLevel < pikachuSprites.length) {
      setPikachuSprites([]);
      return;
    }

    const newSprites: PikachuSprite[] = [];
    for (let i = pikachuSprites.length; i < pikachuLevel; i++) {
      const newSprite: PikachuSprite = {
        id: Date.now() + i,
        animation: new Animated.Value(0),

        x: Math.random() * (width - 50),
        y: Math.random() * (height - 150) + 50,
      };
      newSprites.push(newSprite);
    }

    const updatedSprites = [...pikachuSprites, ...newSprites];
    setPikachuSprites(updatedSprites);

    newSprites.forEach((sprite) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sprite.animation, {
            toValue: 1,
            duration: 1500 + Math.random() * 500,
            useNativeDriver: true,
          }),
          Animated.timing(sprite.animation, {
            toValue: 0,
            duration: 1500 + Math.random() * 500,
            useNativeDriver: true,
          }),
        ]),

        { delay: Math.random() * 1000 }
      ).start();
    });
  }, [gameState, height, pikachuSprites, width]);

  const handlePokemonClick = async () => {
    if (!gameState || gameState.activeMinigameId) return;
    if (gameState.settings.isSoundEnabled) {
      try {
        player.seekTo(0);
        player.play();
      } catch (error) {
        console.error("Failed to play sound", error);
      }
    }
    triggerClickAnimation();

    if (gameState.settings.isVibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    let energyGained = gameState.energyPerClick;
    let totalMultiplier = 1;

    const energyMultiplierFromBuffs = gameState.activeBuffs.reduce(
      (acc, buff) => {
        // пока: бафы не влияют на энергию (или влияют только те, которые не xp)
        return acc;
      },
      1
    );
    totalMultiplier *= energyMultiplierFromBuffs;

    const isCrit = Math.random() < CRIT_CHANCE;
    if (isCrit) {
      totalMultiplier *= CRIT_MULTIPLIER;
    }

    createFloatingNumber(
      Math.round(energyGained * totalMultiplier),
      isCrit,
      energyMultiplierFromBuffs > 1 && !isCrit
    );

    setGameState((prevState) => {
      if (!prevState) return null;

      let { currentPokemonId, currentPokemonLevel } = prevState;
      const pokemonData = pokemonDatabase[currentPokemonId];
      if (!pokemonData) return prevState;

      const requiredExp = requiredExpForLevelUp;

      const xpMultiplierFromBuffs = prevState.activeBuffs.reduce(
        (acc, buff) => {
          return buff.type === "xp_multiplier" ? acc * buff.multiplier : acc;
        },
        1
      );

      const expGained = Math.floor(
        prevState.xpPerClick * xpMultiplierFromBuffs
      );

      let newExp = prevState.currentPokemonExp + expGained;

      if (newExp >= requiredExp) {
        currentPokemonLevel += 1;
        newExp -= requiredExp;
        triggerLevelUpAnimation();
        if (
          pokemonData.evolvesTo &&
          currentPokemonLevel >= (pokemonData.evolutionLevel ?? 999)
        ) {
          currentPokemonId = pokemonData.evolvesTo;
        }
      }

      return {
        ...prevState,
        evolutionEnergy:
          prevState.evolutionEnergy +
          Math.round(energyGained * totalMultiplier),
        currentPokemonId,
        currentPokemonLevel,
        currentPokemonExp: newExp,
      };
    });
  };

  const handlePressIn = () => {
    if (
      !minigameDatabase[currentPokemonData.id] ||
      minigameCooldownProgress < 1 ||
      !gameState
    )
      return;

    // Запускаем анимацию сжатия
    Animated.timing(holdAnimation, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Этот коллбэк сработает, когда анимация завершится
      // 'finished' будет true, только если анимация не была прервана
      if (finished && gameState) {
        // УСПЕХ! Запускаем мини-игру
        extraCooldownMs = 0;
        setGameState((prevState) => {
          if (!prevState) return null;
          return {
            ...prevState,
            activeMinigameId: prevState.currentPokemonId,
            nextMinigameTime: Date.now() + MINIGAME_COOLDOWN_MS,
          };
        });
      }
    });
  };

  const shimmerOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4], // От полностью прозрачного до 40% непрозрачности
  });

  // Интерполяция для удержания (сжатие) остается без изменений
  const holdScale = holdAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
  });

  const handlePressOut = () => {
    // Если игрок отпустил палец, останавливаем текущую анимацию
    holdAnimation.stopAnimation(() => {
      // И плавно возвращаем покемона в нормальное состояние
      Animated.timing(holdAnimation, {
        toValue: 0,
        duration: 300, // Быстрое восстановление
        useNativeDriver: true,
      }).start();
    });
  };

  const handleMinigameComplete = (reward: MinigameReward | null) => {
    setGameState((prevState) => {
      if (!prevState) return null;

      let newXp = prevState.currentPokemonExp;
      let newBuffs = [...prevState.activeBuffs];
      let energyLoss = 0;

      if (reward) {
        if (reward.type === "xp_boost") {
          const requiredExp = Math.floor(
            100 * Math.pow(prevState.currentPokemonLevel, 1.5)
          );
          newXp += Math.floor((requiredExp * reward.value) / 100);
        }

        if (reward.type === "buff") {
          newBuffs.push({
            id: Date.now(),
            type: reward.buffType,
            startTime: Date.now(),
            multiplier: reward.multiplier,
            expiresAt: Date.now() + reward.duration * 1000,
          });
        }

        if (reward.type === "penalty") {
          if (reward.penaltyType === "extra_cooldown") {
            extraCooldownMs = reward.value * 1000;
          }
          if (reward.penaltyType === "energy_loss_percent") {
            energyLoss = Math.floor(
              (prevState.evolutionEnergy * reward.value) / 100
            );
          }
        }
      }

      const cooldownTotalMs = MINIGAME_COOLDOWN_MS + extraCooldownMs;
      const cooldownStartedAt = Date.now();
      const newNextMinigameTime = cooldownStartedAt + cooldownTotalMs;

      return {
        ...prevState,
        evolutionEnergy: Math.max(0, prevState.evolutionEnergy - energyLoss),
        currentPokemonExp: newXp,
        activeBuffs: newBuffs,
        activeMinigameId: null,
        nextMinigameTime: newNextMinigameTime,
        minigameCooldownStartedAt: cooldownStartedAt,
        minigameCooldownTotalMs: cooldownTotalMs,
      };
    });
  };

  const currentPokemonData =
    (gameState && pokemonDatabase[gameState.currentPokemonId]) ||
    defaultPokemonData;

  const animatedBackgroundColor = useMemo(
    () =>
      colorAnimationDriver.interpolate({
        inputRange: [0, 1],
        outputRange: [
          previousBgColor.current,
          Colors.stageColors[currentPokemonData.evolutionStage - 1],
        ],
      }),
    [colorAnimationDriver, currentPokemonData.evolutionStage]
  );
  useEffect(() => {
    if (
      minigameDatabase[currentPokemonData.id] &&
      minigameCooldownProgress >= 1 &&
      !gameState?.activeMinigameId
    ) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      shimmerAnimation.stopAnimation();
      shimmerAnimation.setValue(0);
    }

    return () => shimmerAnimation.stopAnimation();
  }, [
    minigameCooldownProgress,
    gameState?.activeMinigameId,
    shimmerAnimation,
    currentPokemonData.id,
  ]);

  const animatedAccentColor = useMemo(
    () =>
      colorAnimationDriver.interpolate({
        inputRange: [0, 1],
        outputRange: [
          previousAccentColor.current,
          Colors.stageAccentColors[currentPokemonData.evolutionStage - 1],
        ],
      }),
    [colorAnimationDriver, currentPokemonData.evolutionStage]
  );
  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text>Загрузка игры...</Text>
      </View>
    );
  }

  const requiredExpForLevelUp = Math.floor(
    100 * Math.pow(gameState.currentPokemonLevel, 1.5)
  );
  const experiencePercentage =
    (gameState.currentPokemonExp / requiredExpForLevelUp) * 100;

  const levelUpScale = levelUpAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.2],
  });
  const levelUpOpacity = levelUpAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });
  const accentColor =
    Colors.stageAccentColors[currentPokemonData.evolutionStage - 1];

  const wipeTranslateY = transitionWipe.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, 0],
  });

  const animatedPokemonOpacity = transitionPokemonOpacity.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: animatedBackgroundColor }]}
    >
      <BackgroundGradient
        color={Colors.stageAccentColors[currentPokemonData.evolutionStage - 1]}
      />
      <View style={styles.topUiContainer}>
        {/* Отображение баффов */}
        <View style={styles.buffsContainer}>
          {gameState.activeBuffs.map((buff) => {
            const onPress = () => {
              const { title, description } = getBuffInfo(buff);
              Alert.alert(title, description);
            };
            const buffIconName =
              buff.type === "xp_multiplier"
                ? "star"
                : buff.type === "crit_chance_boost"
                ? "flash"
                : "star-four-points";
            const CIRCLE_RADIUS = 18;
            const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
            return (
              <Pressable
                key={buff.id}
                style={styles.buffIconContainer}
                onPress={onPress}
              >
                <View style={styles.buffIconBackground} />

                <Svg width="44" height="44" viewBox="0 0 44 44">
                  <Circle
                    cx="22"
                    cy="22"
                    r={CIRCLE_RADIUS}
                    stroke={accentColor}
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={buffTimerOffsets[buff.id] || 0}
                    strokeLinecap="round"
                    transform="rotate(-90 22 22)"
                  />
                </Svg>
                <View style={styles.buffIcon}>
                  <MaterialCommunityIcons
                    name={buffIconName}
                    size={20}
                    color="white"
                  />
                  <Text style={styles.buffText}>x{buff.multiplier}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />
      </View>

      <View style={[StyleSheet.absoluteFillObject, styles.spriteContainer]}>
        {pikachuSprites.map((sprite) => (
          <PikachuSpriteComponent key={sprite.id} sprite={sprite} />
        ))}
      </View>

      <View />
      <View
        style={styles.centerStage}
        pointerEvents={isMinigameVisible ? "none" : "auto"}
      >
        <View style={styles.pokemonContainer}>
          <Text style={styles.pokemonName}>
            {currentPokemonData.name} (Ур. {gameState.currentPokemonLevel})
          </Text>
          <Animated.Text
            style={[
              styles.levelUpText,
              { opacity: levelUpOpacity, transform: [{ scale: levelUpScale }] },
            ]}
          >
            LEVEL UP!
          </Animated.Text>
          <Animated.View
            style={{
              transform: [
                { scaleY: scaleAnimation },
                { translateY: translateAnimation },
                { scale: holdScale },
              ],
            }}
          >
            <Pressable
              onPress={handlePokemonClick}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              testID="pokemon-pressable"
              style={styles.pressableContainer}
              disabled={isMinigameVisible}
            >
              <Image
                source={currentPokemonData.image}
                style={styles.pokemonImage}
              />

              <MaskedView
                style={StyleSheet.absoluteFill}
                maskElement={
                  <View style={styles.maskContainer}>
                    <Image
                      source={maskImageSource}
                      style={styles.pokemonImage}
                    />
                  </View>
                }
                pointerEvents="none"
              >
                <Animated.View
                  style={{
                    flex: 1,
                    backgroundColor: accentColor,
                    opacity: shimmerOpacity,
                  }}
                  pointerEvents="none"
                />
              </MaskedView>
            </Pressable>
          </Animated.View>
          {minigameDatabase[currentPokemonData.id] && (
            <View style={styles.pokemonCooldownContainer}>
              <MaterialCommunityIcons
                name="gamepad-variant"
                size={20}
                color={minigameCooldownProgress >= 1 ? accentColor : "#aaa"}
              />
              <View style={styles.cooldownBarBackground}>
                <View
                  style={[
                    styles.cooldownBarForeground,
                    {
                      width: `${minigameCooldownProgress * 100}%`,
                      backgroundColor: accentColor,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {floatingNumbers.map(
            ({ id, value, animation, startX, startY, isCrit, isBuffed }) => {
              const translateY = animation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -100],
              });
              const opacity = animation.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 1, 0],
              });

              return (
                <Animated.Text
                  key={id}
                  style={[
                    styles.floatingNumber,
                    isCrit && styles.critFloatingNumber,
                    isBuffed && styles.buffFloatingNumber,
                    {
                      left: startX,
                      top: startY,
                      transform: [{ translateY }],
                      opacity,
                      color: isCrit
                        ? Colors.danger
                        : isBuffed
                        ? accentColor
                        : animatedAccentColor,
                    },
                  ]}
                >
                  +{formatNumber(value)}
                  {isCrit ? "!!" : isBuffed ? "!" : ""}
                </Animated.Text>
              );
            }
          )}
        </View>
        <Animated.View
          style={[
            styles.transitionPokemon,
            {
              opacity: animatedPokemonOpacity,
              transform: [{ scale: transitionPokemonScale }],
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={currentPokemonData.image}
            style={styles.pokemonImage}
          />
        </Animated.View>
      </View>
      <View style={styles.bottomUiContainer}>
        <BackgroundGradient color={Colors.darkGray} />
        <View style={styles.experienceContainer}>
          <View style={styles.expRow}>
            <Text style={styles.expText}>
              Опыт: {formatNumber(gameState.currentPokemonExp)} /{" "}
              {formatNumber(requiredExpForLevelUp)}
            </Text>
            {gameState.xpPerSecond && (
              <View style={styles.xpPerSecondBadge}>
                <Text style={styles.xpPerSecondText}>
                  +{formatNumber(gameState.xpPerSecond ?? 0)}/s
                </Text>
              </View>
            )}
          </View>

          <View
            style={styles.expBarBackground}
            onLayout={(event) => setExpBarWidth(event.nativeEvent.layout.width)}
          >
            <View
              style={[
                styles.expBarForeground,
                {
                  width: `${experiencePercentage}%`,
                  backgroundColor:
                    Colors.stageAccentColors[
                      currentPokemonData.evolutionStage - 1
                    ],
                },
              ]}
            />
          </View>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {xpFloatingNumbers.map((n) => {
              const translateY = n.animation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -35],
              });
              const opacity = n.animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 0.6, 0],
              });

              return (
                <Animated.Text
                  key={n.id}
                  style={[
                    styles.xpFloatingNumber,
                    {
                      left: n.startX,
                      top: n.startY,
                      opacity,
                      transform: [{ translateY }],
                      color:
                        Colors.stageAccentColors[
                          currentPokemonData.evolutionStage - 1
                        ],
                    },
                  ]}
                >
                  +{formatNumber(n.value)} XP
                </Animated.Text>
              );
            })}
          </View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.transitionWipe,
          {
            backgroundColor: accentColor,
            transform: [{ translateY: wipeTranslateY }],
          },
        ]}
        pointerEvents="none"
      />

      {/* Оверлей теперь показывается по локальному состоянию isMinigameVisible */}
      {isMinigameVisible && (
        <MinigameOverlay
          pokemonId={gameState.activeMinigameId!}
          onComplete={handleMinigameComplete}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  transitionWipe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  topUiContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  buffIconBackground: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  buffsContainer: {
    flexDirection: "row",
    gap: 10,
  },
  buffIconContainer: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  buffIcon: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  buffTimerCircle: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderWidth: 4,
    borderColor: Colors.accent,
    borderRadius: 22,
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  buffText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 10,
  },
  spriteContainer: {
    zIndex: -1,
  },
  pikachuSprite: {
    position: "absolute",
    width: 40,
    height: 40,
    resizeMode: "contain",
    opacity: 0.7,
  },
  pokemonName: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.darkGray,
    marginBottom: 10,
  },
  pokemonCooldownContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    width: "80%",
  },
  experienceContainer: {
    width: "100%",
    alignItems: "center",
  },
  levelUpText: {
    position: "absolute",
    fontSize: 48,
    fontWeight: "900",
    color: Colors.accent,
    textShadowColor: Colors.primary,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  expBarBackground: {
    width: "90%",
    height: 20,
    backgroundColor: "#9b9b9bff",
    borderRadius: 10,
    overflow: "hidden",
  },
  expBarForeground: {
    height: "100%",
    borderRadius: 10,
  },
  bottomUiContainer: {
    width: "100%",
    alignItems: "center",
  },
  cooldownContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    width: "30%",
  },
  cooldownBarBackground: {
    flex: 1,
    height: 10,
    backgroundColor: "#9b9b9bff",
    borderRadius: 5,
    marginLeft: 10,
    overflow: "hidden",
  },
  cooldownBarForeground: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 5,
  },
  floatingNumber: {
    position: "absolute",
    fontSize: 22,
    fontWeight: "bold",
    textShadowColor: "black",
    textShadowRadius: 2,
    textShadowOffset: { width: 1, height: 1 },
  },
  critFloatingNumber: {
    fontSize: 32,
    fontWeight: "900",
  },

  buffFloatingNumber: {
    fontSize: 26,
    fontWeight: "800",
  },
  centerStage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },

  transitionPokemon: {
    position: "absolute",
    zIndex: 1000,
  },
  pokemonContainer: {
    width: POKEMON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pressableContainer: {
    width: POKEMON_SIZE,
    height: POKEMON_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  pokemonImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  maskContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  xpFloatingNumber: {
    position: "absolute",
    fontSize: 14,
    fontWeight: "800",
    color: Colors.accent,
    textShadowColor: "black",
    textShadowRadius: 2,
    textShadowOffset: { width: 1, height: 1 },
  },

  expRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },

  expText: {
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 0,
  },

  xpPerSecondBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  xpPerSecondText: {
    color: "white",
    fontWeight: "800",
    fontSize: 12,
  },
});
