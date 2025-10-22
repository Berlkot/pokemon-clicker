import { StyleSheet, Text, View, Image, Pressable, Animated, useWindowDimensions, Alert, BackHandler } from 'react-native';
import React, { useState, useRef, useCallback, useEffect, memo, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { pokemonDatabase } from '../../data/pokemonData';
import Colors from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { formatNumber } from '../../utils/formatNumber'; // <-- Импортируем наш форматер
import { Audio } from 'expo-av';

type FloatingNumber = {
  id: number;
  value: number;
  animation: Animated.Value;
  startX: number;
  startY: number;
};


const CRIT_CHANCE = 0.1; // 10% шанс
const CRIT_MULTIPLIER = 5; // Умножает энергию в 5 раз


// --- КОНСТАНТЫ ДЛЯ АНИМАЦИИ ---
const POKEMON_SIZE = 250;
const SQUEEZE_SCALE_Y = 0.8; // Сжимаем до 80% высоты
// Чтобы казалось, что сжатие идет сверху, сдвигаем покемона вниз на половину "сжатого" пространства.
// (1.0 - 0.8) / 2 * POKEMON_SIZE = 0.1 * 250 = 25
const SQUEEZE_TRANSLATE_Y = (1 - SQUEEZE_SCALE_Y) / 2 * POKEMON_SIZE;
const defaultPokemonData = pokemonDatabase['eevee'];

type PikachuSprite = {
  id: number;
  animation: Animated.Value;
  x: number; // Позиция по горизонтали
  y: number; // Позиция по вертикали
};


const PikachuSpriteComponent = memo(function PikachuSpriteComponent({ sprite }: { sprite: PikachuSprite }) {
  const translateY = sprite.animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.Image
      source={require('../../assets/images/pikachu.png')}
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

export default function GameScreen() {
  const { gameState, setGameState } = useGame();
  const { width, height } = useWindowDimensions(); // <-- Получаем размеры экрана

  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  // --- НОВОЕ СОСТОЯНИЕ ДЛЯ ХРАНЕНИЯ СПРАЙТОВ ПИКАЧУ ---
  const [pikachuSprites, setPikachuSprites] = useState<PikachuSprite[]>([]);

  // --- АНИМАЦИИ ---
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const translateAnimation = useRef(new Animated.Value(0)).current;
  const sound = useRef<Audio.Sound | null>(null); 
  const colorAnimationDriver = useRef(new Animated.Value(0)).current;
  const previousBgColor = useRef(Colors.stageColors[0]);
  const previousAccentColor = useRef(Colors.stageAccentColors[0]);

  const levelUpAnimation = useRef(new Animated.Value(0)).current;

  const triggerLevelUpAnimation = () => {
    requestAnimationFrame(() => {
      levelUpAnimation.setValue(0); // Сбрасываем анимацию
      Animated.sequence([
        Animated.timing(levelUpAnimation, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(levelUpAnimation, { toValue: 0, duration: 1000, useNativeDriver: true, delay: 800 }),
      ]).start();
    });
  };

  const triggerClickAnimation = () => {


    // Запускаем последовательность: сначала сжатие, потом разжатие
    Animated.sequence([
      // 1. Анимация сжатия (происходит параллельно по двум осям)
      Animated.parallel([
        Animated.timing(scaleAnimation, { toValue: SQUEEZE_SCALE_Y, duration: 75, useNativeDriver: true }),
        Animated.timing(translateAnimation, { toValue: SQUEEZE_TRANSLATE_Y, duration: 75, useNativeDriver: true }),
      ]),
      // 2. Анимация разжатия (используем spring для эффекта "отскока")
      Animated.parallel([
        Animated.spring(scaleAnimation, { toValue: 1, friction: 3, useNativeDriver: true }),
        Animated.spring(translateAnimation, { toValue: 0, friction: 3, useNativeDriver: true }),
      ]),
    ]).start();
  };

  useEffect(() => {
    // Асинхронная функция для загрузки звука в память
    const loadSound = async () => {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
           require('../../assets/sounds/click.mp3') // Укажите правильный путь к вашему файлу
        );
        sound.current = newSound;
      } catch (error) {
        console.error("Failed to load sound", error);
      }
    };

    loadSound();

    // Функция очистки: выгружаем звук, когда компонент исчезает
    return () => {
      if (sound.current) {
        sound.current.unloadAsync();
      }
    };
  }, []);
  // Эффект, который следит за сменой покемона и запускает анимацию фона
  useEffect(() => {
    if (!gameState) return;

    // Безопасно получаем данные покемона
    const pokemonData = pokemonDatabase[gameState.currentPokemonId];
    if (!pokemonData) return; // Если не найден, просто выходим

    const newBgColor = Colors.stageColors[pokemonData.evolutionStage - 1];
    const newAccentColor = Colors.stageAccentColors[pokemonData.evolutionStage - 1];

    if (newBgColor === previousBgColor.current) return;

    colorAnimationDriver.setValue(0);
    Animated.timing(colorAnimationDriver, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start();

    previousBgColor.current = newBgColor;
    previousAccentColor.current = newAccentColor;
  }, [colorAnimationDriver, gameState, gameState?.currentPokemonId]);

  const createFloatingNumber = useCallback((value: number, isCrit: boolean = false) => {
    const spawnArea = 150; // Область появления чисел (в пикселях)
    
    const newNumber: FloatingNumber = {
      id: Date.now() + Math.random(),
      value,
      animation: new Animated.Value(0),
      startX: Math.random() * spawnArea + 50, // +50 - это отступ, чтобы числа не появлялись у самого края
      startY: Math.random() * spawnArea,
    };

    setFloatingNumbers(current => {
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
      setFloatingNumbers(current => current.filter(n => n.id !== newNumber.id));
    });
  }, []);

    useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Показываем диалоговое окно
        Alert.alert(
          "Выход из игры",
          "Вы уверены, что хотите выйти?",
          [
            { text: "Остаться", style: "cancel", onPress: () => null },
            { text: "Выйти", style: "destructive", onPress: () => BackHandler.exitApp() } // Закрываем приложение
          ]
        );
        // `return true` говорит системе Android: "Я обработал это нажатие, не делай ничего больше" (т.е. не закрывай приложение).
        return true;
      };

      // Добавляем "слушателя" события
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Функция очистки: когда пользователь уходит с экрана, мы удаляем "слушателя",
      // чтобы кнопка "Назад" работала как обычно на других экранах (например, в Улучшениях).
      return () => subscription.remove();
    }, [])
  );
  
  useFocusEffect(
    useCallback(() => {
      if (!gameState || gameState.energyPerSecond === 0) {
        return;
      }
      
      const interval = setInterval(() => {
        setGameState(prevState => {
          if (!prevState) return null;
          return { ...prevState, evolutionEnergy: prevState.evolutionEnergy + prevState.energyPerSecond };
        });
      }, 1000);

      return () => clearInterval(interval);
    }, [gameState, setGameState]) // Зависимость, чтобы интервал перезапустился при покупке улучшения
  );


  useEffect(() => {
    if (!gameState) return;

    // Получаем текущий уровень улучшения "Помощник Пикачу"
    const pikachuLevel = gameState.upgrades['pikachu_helper'] || 0;

    // Если на экране уже нужное количество Пикачу, ничего не делаем
    if (pikachuLevel === pikachuSprites.length) return;

    // Если уровень сбросился (например, после сброса прогресса)
    if (pikachuLevel < pikachuSprites.length) {
      setPikachuSprites([]); // Просто очищаем массив
      return;
    }

    // Если нужно добавить новых Пикачу
    const newSprites: PikachuSprite[] = [];
    for (let i = pikachuSprites.length; i < pikachuLevel; i++) {
      const newSprite: PikachuSprite = {
        id: Date.now() + i,
        animation: new Animated.Value(0),
        // Генерируем случайную позицию в пределах экрана с отступами
        x: Math.random() * (width - 50),
        y: Math.random() * (height - 150) + 50, // +50 чтобы не спавнились в самом верху
      };
      newSprites.push(newSprite);
    }
    
    // Добавляем новых Пикачу к уже существующим
    const updatedSprites = [...pikachuSprites, ...newSprites];
    setPikachuSprites(updatedSprites);

    // Запускаем анимацию для каждого нового спрайта
    newSprites.forEach(sprite => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sprite.animation, {
            toValue: 1,
            duration: 1500 + Math.random() * 500, // Случайная длительность
            useNativeDriver: true,
          }),
          Animated.timing(sprite.animation, {
            toValue: 0,
            duration: 1500 + Math.random() * 500,
            useNativeDriver: true,
          }),
        ]),
        // Добавляем случайную задержку, чтобы они двигались не в такт
        { delay: Math.random() * 1000 }
      ).start();
    });

  }, [gameState, height, pikachuSprites, width]);

  const handlePokemonClick = async () => {
    if (!gameState) return;
    try {
      await sound.current?.replayAsync();
    } catch (error) {
      console.error("Failed to play sound", error);
    }
    
    triggerClickAnimation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    let energyGained = gameState.energyPerClick;
    const isCrit = Math.random() < CRIT_CHANCE;

    if (isCrit) {
      energyGained *= CRIT_MULTIPLIER;
    }
    
    createFloatingNumber(Math.round(energyGained), isCrit);
    
    setGameState(prevState => {
      if (!prevState) return null;

      let { currentPokemonId, currentPokemonLevel, currentPokemonExp } = prevState;

      // Безопасно получаем данные
      const pokemonData = pokemonDatabase[currentPokemonId];
      if (!pokemonData) return prevState; // Если что-то не так, не меняем состояние и предотвращаем сбой

      const requiredExp = requiredExpForLevelUp;
      let newExp = currentPokemonExp + Math.round(gameState.energyPerClick);

      if (newExp >= requiredExp) {
        currentPokemonLevel += 1;
        newExp -= requiredExp;
        triggerLevelUpAnimation(); 
        if (pokemonData.evolvesTo && currentPokemonLevel >= (pokemonData.evolutionLevel ?? 999)) {
          currentPokemonId = pokemonData.evolvesTo;
        }
      }

      return {
        ...prevState,
        evolutionEnergy: prevState.evolutionEnergy + prevState.energyPerClick,
        currentPokemonId,
        currentPokemonLevel,
        currentPokemonExp: newExp,
      };
    });
  };
  
  const currentPokemonData = (gameState && pokemonDatabase[gameState.currentPokemonId]) || defaultPokemonData;

  const animatedBackgroundColor = useMemo(() => colorAnimationDriver.interpolate({
    inputRange: [0, 1],
    outputRange: [previousBgColor.current, Colors.stageColors[currentPokemonData.evolutionStage - 1]],
  }), [colorAnimationDriver, currentPokemonData.evolutionStage]); // <-- Зависимость: пересчитать только при смене покемона

  const animatedAccentColor = useMemo(() => colorAnimationDriver.interpolate({
    inputRange: [0, 1],
    outputRange: [previousAccentColor.current, Colors.stageAccentColors[currentPokemonData.evolutionStage - 1]],
  }), [colorAnimationDriver, currentPokemonData.evolutionStage]); // <-- Зависимость: пересчитать только при смене покемона

  if (!gameState) {
    return <View style={styles.container}><Text>Загрузка игры...</Text></View>;
  }
  // Теперь все последующие вычисления используют эту безопасную переменную
  const requiredExpForLevelUp = Math.floor(100 * Math.pow(gameState.currentPokemonLevel, 1.5));
  const experiencePercentage = (gameState.currentPokemonExp / requiredExpForLevelUp) * 100;

  const levelUpScale = levelUpAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] });
  const levelUpOpacity = levelUpAnimation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  
  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedBackgroundColor }]}>

      <View style={[StyleSheet.absoluteFillObject, styles.spriteContainer]}>
        {pikachuSprites.map(sprite => (
          <PikachuSpriteComponent key={sprite.id} sprite={sprite} />
        ))}
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statText}>Энергия Эволюции: {formatNumber(gameState.evolutionEnergy)}</Text>
        <Text style={styles.statText}>В секунду: {formatNumber(gameState.energyPerSecond)}</Text>
      </View>
      
      <View style={styles.pokemonContainer}>
        <Text style={styles.pokemonName}>{currentPokemonData.name} (Ур. {gameState.currentPokemonLevel})</Text>
        <Animated.Text style={[styles.levelUpText, { opacity: levelUpOpacity, transform: [{ scale: levelUpScale }] }]}>
          LEVEL UP!
        </Animated.Text>
        <Animated.View style={{ transform: [{ scaleY: scaleAnimation }, { translateY: translateAnimation }] }}>
          <Pressable onPress={handlePokemonClick} testID="pokemon-pressable">
            <Image source={currentPokemonData.image} style={styles.pokemonImage} />
          </Pressable>
      

        </Animated.View>

        {/* Числа теперь рендерятся ВНУТРИ этого контейнера */}
        {floatingNumbers.map(({ id, value, animation, startX, startY }) => {
          const translateY = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -100] });
          const opacity = animation.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
          const isCritical = value > (gameState.energyPerClick + 1);
          return (
            <Animated.Text
              key={id}
              style={[
                styles.floatingNumber, // <-- Базовый стиль
                isCritical && styles.critFloatingNumber, // <-- Дополнительный стиль для крита
                {
                  left: startX,
                  top: startY,
                  transform: [{ translateY }],
                  opacity,
                  color: isCritical ? Colors.danger : animatedAccentColor, // <-- Применяем анимированный цвет!
                },
              ]}
            >
              +{formatNumber(value)}{isCritical ? '!!' : ''}
            </Animated.Text>
          );
        })}
      </View>

      <View style={styles.experienceContainer}>
        <Text style={styles.expText}>Опыт: {gameState.currentPokemonExp} / {requiredExpForLevelUp}</Text>
        <View style={styles.expBarBackground}>
          <View style={[styles.expBarForeground, { width: `${experiencePercentage}%` }]} />
        </View>
      </View>
    </Animated.View>
  );
}

// Обновленные стили
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
  },
  statsContainer: {
    alignItems: 'center',
  },
  critFloatingNumber: {
    fontSize: 32, // Крупнее
    fontWeight: '900', // Жирнее
  },
  statText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  spriteContainer: {
    zIndex: -1, // <-- Самое главное: отправляем контейнер на задний план
  },
  pikachuSprite: {
    position: 'absolute',
    width: 40,
    height: 40,
    resizeMode: 'contain',
    opacity: 0.7, // Делаем их полупрозрачными, чтобы не отвлекали
  },
  pokemonName: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkGray, // <-- ДОБАВЬТЕ ЭТУ СТРОКУ (темно-серый цвет)
    marginBottom: 10, // Добавим отступ для красоты
  },
  // --- НОВЫЙ СТИЛЬ ДЛЯ КОНТЕЙНЕРА ---
  pokemonContainer: {
    width: POKEMON_SIZE,
    height: POKEMON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pokemonImage: {
    width: POKEMON_SIZE,
    height: POKEMON_SIZE,
    resizeMode: 'contain',
  },
  floatingNumber: {
    position: 'absolute', // Вынимает элемент из потока документа
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'black',
    textShadowRadius: 2,
    textShadowOffset: { width: 1, height: 1 },
  },
  experienceContainer: {
    width: '100%',
    alignItems: 'center',
  },
  expText: {
    fontSize: 16,
    marginBottom: 5,
  },
  levelUpText: {
    position: 'absolute',
    fontSize: 48,
    fontWeight: '900',
    color: Colors.accent,
    textShadowColor: Colors.primary,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  expBarBackground: {
    width: '90%',
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  expBarForeground: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 10,
  },
});