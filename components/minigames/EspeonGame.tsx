import { useHeaderHeight } from "@react-navigation/elements";
import React, { useCallback, useEffect } from "react";
import {
    Animated,
    Easing,
    Image,
    PanResponder,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
    Circle,
    Defs,
    Line,
    RadialGradient,
    Stop,
} from "react-native-svg";
import { MinigameReward } from "../../data/minigameData";


const CRYSTAL_COUNT = 4;
const SEQUENCE_LENGTH = CRYSTAL_COUNT; 
const CRYSTAL_RADIUS = 30;
const MIN_DISTANCE = CRYSTAL_RADIUS * 3;


type Crystal = {
  id: number;
  pos: { x: number; y: number };
  anim: Animated.Value;
};
type Particle = {
  id: number;
  anim: Animated.Value;
  pos: { x: number; y: number };
};

const isTooClose = (
  newCrystal: Crystal["pos"],
  existingCrystals: Crystal[]
) => {
  for (const crystal of existingCrystals) {
    const dx = newCrystal.x - crystal.pos.x;
    const dy = newCrystal.y - crystal.pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE) {
      return true;
    }
  }
  return false;
};

const EspeonGame = ({ onComplete, panResponderRef }: {
  onComplete: (reward: MinigameReward | null) => void;
  panResponderRef: any; 
}) => {
  const [sequence, setSequence] = React.useState<number[]>([]);
  const [playerPath, setPlayerPath] = React.useState<number[]>([]);
  const [status, setStatus] = React.useState<"showing" | "playing">("showing");
  const [crystals, setCrystals] = React.useState<Crystal[]>([]);
  const [line, setLine] = React.useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [cursorPosition, setCursorPosition] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [particles, setParticles] = React.useState<Particle[]>([]);

  
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const totalTopOffset = headerHeight > 0 ? headerHeight : insets.top; 

  
  useEffect(() => {
    const newCrystals: Crystal[] = [];
    while (newCrystals.length < CRYSTAL_COUNT) {
      const newCrystalPos = {
        x: 50 + Math.random() * 250,
        y: 150 + Math.random() * 400,
      };
      if (!isTooClose(newCrystalPos, newCrystals)) {
        newCrystals.push({
          id: newCrystals.length,
          pos: newCrystalPos,
          anim: new Animated.Value(1),
        });
      }
    }
    setCrystals(newCrystals);

    const crystalIds = Array.from({ length: CRYSTAL_COUNT }, (_, i) => i);
    for (let i = crystalIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [crystalIds[i], crystalIds[j]] = [crystalIds[j], crystalIds[i]];
    }
    const newSequence = crystalIds.slice(0, SEQUENCE_LENGTH);
    setSequence(newSequence);

    
    let delay = 500;
    newSequence.forEach((crystalId) => {
      const crystal = newCrystals.find((c) => c.id === crystalId);
      if (crystal) {
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(crystal.anim, {
              toValue: 1.5,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(crystal.anim, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start();
        }, delay);
        delay += 600;
      }
    });
    setTimeout(() => setStatus("playing"), delay);
  }, []);

  
  const createParticle = useCallback((x: number, y: number) => {
    const newParticle: Particle = {
      id: Date.now() + Math.random(),
      anim: new Animated.Value(0),
      pos: {
        x: x + (Math.random() - 0.5) * 15, 
        y: y + (Math.random() - 0.5) * 15,
      },
    };

    setParticles((current) => [...current, newParticle]);

    Animated.timing(newParticle.anim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start(() => {
      
      setParticles((current) => current.filter((p) => p.id !== newParticle.id));
    });
  }, []);

  React.useEffect(() => {
    const gestureHandlers = {
      onStartShouldSetPanResponder: () => status === "playing",
      onMoveShouldSetPanResponder: () => status === "playing",

      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const correctedY = pageY - totalTopOffset; 
        setCursorPosition({ x: pageX, y: correctedY });

        
      },

      onPanResponderMove: (evt, gestureState) => {
        const { moveX, moveY } = gestureState;
        const correctedY = moveY - totalTopOffset; 
        setCursorPosition({ x: moveX, y: correctedY });
        createParticle(moveX, correctedY);

        
        const currentCrystal = crystals.find((c) => {
          
          if (playerPath.includes(c.id)) return false;

          const dx = moveX - c.pos.x;
          const dy = correctedY - c.pos.y;
          return Math.sqrt(dx * dx + dy * dy) < CRYSTAL_RADIUS;
        });

        if (currentCrystal) {
          
          
          setLine({
            x1: currentCrystal.pos.x,
            y1: currentCrystal.pos.y,
            x2: moveX,
            y2: correctedY,
          });

          const newPlayerPath = [...playerPath, currentCrystal.id];
          setPlayerPath(newPlayerPath);

          Animated.spring(currentCrystal.anim, {
            toValue: 1.3,
            friction: 5,
            useNativeDriver: true,
          }).start();
        } else if (playerPath.length > 0) {
          
          setLine((prev) =>
            prev ? { ...prev, x2: moveX, y2: correctedY } : null
          );
        }
      },

      onPanResponderRelease: () => {
        setCursorPosition(null);
        setLine(null);

        crystals.forEach((crystal) => {
          if (playerPath.includes(crystal.id)) {
            Animated.spring(crystal.anim, {
              toValue: 1,
              friction: 5,
              useNativeDriver: true,
            }).start();
          }
        });

        
        let correctSteps = 0;
        for (let i = 0; i < playerPath.length; i++) {
          if (playerPath[i] === sequence[i]) {
            correctSteps++;
          } else {
            break; 
          }
        }

        const isPerfectWin = correctSteps === sequence.length;

        setTimeout(() => {
          if (isPerfectWin) {
            
            onComplete({
              type: "buff",
              buffType: "xp_multiplier",
              multiplier: 2,
              duration: 10,
            });
          } else if (correctSteps > 0) {
            
            
            const MAX_XP_REWARD_PERCENT = 15;
            const rewardValue = Math.floor(
              (correctSteps / sequence.length) * MAX_XP_REWARD_PERCENT
            );
            onComplete({ type: "xp_boost", value: rewardValue });
          } else {
            
            onComplete(null);
          }
        }, 300);
      },
    };

    Object.assign(panResponderRef.panHandlers, PanResponder.create(gestureHandlers).panHandlers);
  }, [status, crystals, playerPath, sequence, onComplete, panResponderRef, totalTopOffset, createParticle]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {status === "showing" ? "Запомни путь..." : "Проведи по кристаллам!"}
      </Text>

      <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
        {line && (
          <Line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#EE82EE"
            strokeWidth="5"
          />
        )}
      </Svg>

      {crystals.map((c) => {
        const glowOpacity = c.anim.interpolate({
          inputRange: [1, 1.3],
          outputRange: [0, 1], 
          extrapolate: "clamp",
        });

        return (
          <Animated.View
            key={c.id}
            style={[
              styles.crystalContainer,
              {
                top: c.pos.y - CRYSTAL_RADIUS,
                left: c.pos.x - CRYSTAL_RADIUS,
                transform: [{ scale: c.anim }],
              },
            ]}
          >
            {/* 2. --- ЗАМЕНЯЕМ View НА SVG С ГРАДИЕНТОМ --- */}
            <Animated.View
              style={[styles.glowContainer, { opacity: glowOpacity }]}
            >
              <Svg height="100%" width="100%" viewBox="0 0 100 100">
                {/* Defs - это место для определения элементов, которые мы будем использовать позже, например, градиентов */}
                <Defs>
                  {/* Определяем сам радиальный градиент */}
                  <RadialGradient id="grad" cx="50%" cy="50%" r="50%">
                    {/* Первая точка (центр): яркий, непрозрачный */}
                    <Stop offset="0%" stopColor="#EE82EE" stopOpacity="0.8" />
                    {/* Вторая точка (край): тот же цвет, но полностью прозрачный */}
                    <Stop offset="100%" stopColor="#EE82EE" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                {/* Рисуем круг и заливаем ("fill") его нашим градиентом по ID */}
                <Circle cx="50" cy="50" r="50" fill="url(#grad)" />
              </Svg>
            </Animated.View>

            <Image
              source={require("../../assets/images/crystal.png")}
              style={styles.crystalImage}
            />
          </Animated.View>
        );
      })}

      {/* 8. --- РЕНДЕРИНГ ЧАСТИЦ --- */}
      {particles.map((p) => {
        const opacity = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        });
        const scale = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.2],
        });
        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.pos.x,
                top: p.pos.y,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}

      {/* 9. --- РЕНДЕРИНГ КУРСОРА --- */}
      {cursorPosition && (
        <View
          style={[
            styles.cursor,
            { left: cursorPosition.x - 15, top: cursorPosition.y - 15 },
          ]}
        />
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: { width: "100%", height: "100%" },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 80,
  },
  crystalContainer: {
    position: "absolute",
    width: CRYSTAL_RADIUS * 2,
    height: CRYSTAL_RADIUS * 2,
    justifyContent: "center",
    alignItems: "center",
  },
  crystalImage: {
    width: CRYSTAL_RADIUS * 2,
    height: CRYSTAL_RADIUS * 2,
    resizeMode: "contain",
  },
  
  glowContainer: {
    position: "absolute",
    width: CRYSTAL_RADIUS * 4, 
    height: CRYSTAL_RADIUS * 4,
  },

  crystalActive: {
    backgroundColor: "rgba(255, 255, 0, 0.8)", 
    borderColor: "#FFFF00",
  },
  cursor: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderColor: "white",
    borderWidth: 2,
  },
  particle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFF00", 
  },
});

export default EspeonGame;