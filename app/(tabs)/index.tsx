import { StyleSheet, Text, View, Image, Pressable, Animated, useWindowDimensions } from 'react-native';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { pokemonDatabase } from '../../data/pokemonData';
import Colors from '../../constants/Colors';
import * as Haptics from 'expo-haptics';


type FloatingNumber = {
  id: number; value: number; animation: Animated.Value;
  startX: number; startY: number;
};

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

export default function GameScreen() {
  const { gameState, setGameState } = useGame();
  const { width, height } = useWindowDimensions(); // <-- Получаем размеры экрана

  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  // --- НОВОЕ СОСТОЯНИЕ ДЛЯ ХРАНЕНИЯ СПРАЙТОВ ПИКАЧУ ---
  const [pikachuSprites, setPikachuSprites] = useState<PikachuSprite[]>([]);

  // --- АНИМАЦИИ ---
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const translateAnimation = useRef(new Animated.Value(0)).current;
  const colorAnimationDriver = useRef(new Animated.Value(0)).current;
  const previousBgColor = useRef(Colors.stageColors[0]);
  const previousAccentColor = useRef(Colors.stageAccentColors[0]);

  // --- ЛОГИКА АНИМАЦИЙ ---
  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnimation, { toValue: SQUEEZE_SCALE_Y, useNativeDriver: true }),
      Animated.spring(translateAnimation, { toValue: SQUEEZE_TRANSLATE_Y, useNativeDriver: true }),
    ]).start();
  };
  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnimation, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateAnimation, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

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

  const createFloatingNumber = useCallback((value: number) => {
    const spawnArea = 150; // Область появления чисел (в пикселях)
    
    const newNumber: FloatingNumber = {
      id: Date.now() + Math.random(),
      value,
      animation: new Animated.Value(0),
      startX: Math.random() * spawnArea + 50, // +50 - это отступ, чтобы числа не появлялись у самого края
      startY: Math.random() * spawnArea,
    };

    setFloatingNumbers(current => [...current, newNumber]);

    Animated.timing(newNumber.animation, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start(() => {
      setFloatingNumbers(current => current.filter(n => n.id !== newNumber.id));
    });
  }, []);

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

  const handlePokemonClick = () => {
    if (!gameState) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createFloatingNumber(gameState.energyPerClick);
    
    setGameState(prevState => {
      if (!prevState) return null;

      let { currentPokemonId, currentPokemonLevel, currentPokemonExp } = prevState;

      // Безопасно получаем данные
      const pokemonData = pokemonDatabase[currentPokemonId];
      if (!pokemonData) return prevState; // Если что-то не так, не меняем состояние и предотвращаем сбой

      const requiredExp = currentPokemonLevel * 100;
      let newExp = currentPokemonExp + 1;

      if (newExp >= requiredExp) {
        currentPokemonLevel += 1;
        newExp -= requiredExp;
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
  
  if (!gameState) {
    return <View style={styles.container}><Text>Загрузка игры...</Text></View>;
  }

  // --- ГЛАВНОЕ ИСПРАВЛЕНИЕ: ЕДИНАЯ ТОЧКА БЕЗОПАСНОГО ДОСТУПА К ДАННЫМ ---
  const currentPokemonData = pokemonDatabase[gameState.currentPokemonId] || defaultPokemonData;

  // Теперь все последующие вычисления используют эту безопасную переменную
  const requiredExpForLevelUp = gameState.currentPokemonLevel * 100;
  const experiencePercentage = (gameState.currentPokemonExp / requiredExpForLevelUp) * 100;

  // Интерполяции тоже становятся безопасными
  const animatedBackgroundColor = colorAnimationDriver.interpolate({
    inputRange: [0, 1],
    outputRange: [previousBgColor.current, Colors.stageColors[currentPokemonData.evolutionStage - 1]],
  });
  const animatedAccentColor = colorAnimationDriver.interpolate({
    inputRange: [0, 1],
    outputRange: [previousAccentColor.current, Colors.stageAccentColors[currentPokemonData.evolutionStage - 1]],
  });
  
  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedBackgroundColor }]}>

      <View style={[StyleSheet.absoluteFillObject, styles.spriteContainer]}>
        {pikachuSprites.map(sprite => {
          // Интерполяция для "покачивания"
          const translateY = sprite.animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -10], // Двигается вверх на 10 пикселей
          });
          return (
            <Animated.Image
              key={sprite.id}
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
        })}
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statText}>Энергия Эволюции: {Math.floor(gameState.evolutionEnergy)}</Text>
        <Text style={styles.statText}>В секунду: {gameState.energyPerSecond}</Text>
      </View>
      
      {/* --- ЭТОТ КОНТЕЙНЕР РЕШАЕТ ОБЕ ПРОБЛЕМЫ --- */}
      <View style={styles.pokemonContainer}>
        <Text style={styles.pokemonName}>{currentPokemonData.name} (Ур. {gameState.currentPokemonLevel})</Text>

        <Animated.View style={{ transform: [{ scaleY: scaleAnimation }, { translateY: translateAnimation }] }}>
          <Pressable onPress={handlePokemonClick} onPressIn={onPressIn} onPressOut={onPressOut}>
            <Image source={currentPokemonData.image} style={styles.pokemonImage} />
          </Pressable>
      

        </Animated.View>

        {/* Числа теперь рендерятся ВНУТРИ этого контейнера */}
        {floatingNumbers.map(({ id, value, animation, startX, startY }) => {
          const translateY = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -100] });
          const opacity = animation.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
          return (
            <Animated.Text
              key={id}
              style={[
                styles.floatingNumber,
                {
                  left: startX,
                  top: startY,
                  transform: [{ translateY }],
                  opacity,
                  color: animatedAccentColor, // <-- Применяем анимированный цвет!
                },
              ]}
            >
              +{value}
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