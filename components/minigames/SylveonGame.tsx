import { useHeaderHeight } from "@react-navigation/elements";
// --- ИЗМЕНЕНИЕ: Добавляем useMemo для PanResponder ---
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";
import { MinigameReward } from "../../data/minigameData";

const PAIRS = 3;
const COLORS = ["#FF69B4", "#87CEEB", "#98FB98"]; // Розовый, Голубой, Зеленый
const BOW_SIZE = 50;
// --- ИЗМЕНЕНИЕ: Увеличиваем минимальное расстояние для большей играбельности ---
const MIN_DISTANCE_BETWEEN_BOWS = BOW_SIZE * 2;
const GAME_TIME_SECONDS = 20;

type Bow = {
  id: number;
  pairId: number;
  color: string;
  pos: { x: number; y: number };
  isMatched: boolean;
};

type Connection = {
  path: Point[];
  color: string;
};
type Point = { x: number; y: number };

// Функция проверки пересечений (остается без изменений)
function newPathIntersectsExisting(
  poly1: Point[],
  existingPolys: Connection[]
) {
  function linesIntersect(p1: Point, p2: Point, p3: Point, p4: Point) {
    function CCW(p1: Point, p2: Point, p3: Point) {
      return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    }
    return (
      CCW(p1, p3, p4) !== CCW(p2, p3, p4) && CCW(p1, p2, p3) !== CCW(p1, p2, p4)
    );
  }
  for (let i = 0; i < poly1.length - 1; i++) {
    for (const existingPoly of existingPolys) {
      for (let j = 0; j < existingPoly.path.length - 1; j++) {
        if (
          linesIntersect(
            poly1[i],
            poly1[i + 1],
            existingPoly.path[j],
            existingPoly.path[j + 1]
          )
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function isTooClose(newPos: Point, existingPoints: Point[]) {
  // Итерируемся по массиву точек
  for (const point of existingPoints) {
    // Сравниваем координаты напрямую, без .pos
    const dx = newPos.x - point.x;
    const dy = newPos.y - point.y;
    if (Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE_BETWEEN_BOWS) {
      return true;
    }
  }
  return false;
}

// --- ИЗМЕНЕНИЕ: Убираем panResponderRef из пропсов ---
const SylveonGame = ({
  onComplete,
}: {
  onComplete: (reward: MinigameReward | null) => void;
}) => {
  const [bows, setBows] = useState<Bow[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [currentLine, setCurrentLine] = useState<{
    path: Point[];
    color: string;
  } | null>(null);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [timeLeft, setTimeLeft] = useState(GAME_TIME_SECONDS);

  const { width, height } = useWindowDimensions();
  const selectedBow = useRef<Bow | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const totalTopOffset = headerHeight > 0 ? headerHeight : insets.top;

  // Логика таймера и завершения игры (без изменений)
  useEffect(() => {
    if (status === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setStatus("lost");
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  useEffect(() => {
    if (status === "won" || status === "lost") {
      let reward: MinigameReward | null = null;

      if (status === "won") {
        reward = {
          type: "buff",
          buffType: "xp_multiplier",
          multiplier: 2,
          duration: 12,
        };
      } else {
        // проигрыш
        if (connections.length > 0) {
          // частичный прогресс — небольшой XP
          reward = {
            type: "xp_boost",
            value: Math.min(18, connections.length * 6),
          };
        } else {
          // полный провал — штраф
          reward = {
            type: "penalty",
            penaltyType: "energy_loss_percent",
            value: 30,
          };
        }
      }

      setTimeout(() => onComplete(reward), 1500);
    }
  }, [status, connections, onComplete]);

  // --- ИЗМЕНЕНИЕ: Исправлена логика расположения бантиков ---
  useEffect(() => {
    const newBows: Bow[] = [];

    // --- Шаг 1: Определяем границы видимой и безопасной игровой зоны ---
    const xMargin = BOW_SIZE;

    // Верхняя граница: отступ для системного UI + место для нашего UI (таймер, заголовок)
    const topBound = totalTopOffset + 100;

    // Нижняя граница: высота всего экрана МИНУС отступ для системной навигации снизу
    // и МИНУС небольшой отступ, чтобы бантики не "прилипали" к границе.
    const bottomBound = height - insets.bottom - BOW_SIZE - 200;

    // Рассчитываем реальную доступную высоту для спауна
    const playableHeight = bottomBound - topBound;

    // Проверка на случай, если места слишком мало
    if (playableHeight <= MIN_DISTANCE_BETWEEN_BOWS) {
      console.error(
        "Not enough vertical space to render Sylveon game bows safely."
      );
      return;
    }

    // --- Шаг 2: Генерируем позиции строго внутри этой безопасной зоны ---
    const leftPositions: Point[] = [];
    while (leftPositions.length < PAIRS) {
      const newPos = {
        x: xMargin + Math.random() * (width / 2 - xMargin * 2),
        // Генерируем Y координату внутри рассчитанных границ
        y: topBound + Math.random() * playableHeight,
      };
      if (!isTooClose(newPos, leftPositions)) {
        leftPositions.push(newPos);
      }
    }

    const rightPositions: Point[] = [];
    while (rightPositions.length < PAIRS) {
      const newPos = {
        x: width / 2 + xMargin + Math.random() * (width / 2 - xMargin * 2),
        y: topBound + Math.random() * playableHeight,
      };
      if (!isTooClose(newPos, [...leftPositions, ...rightPositions])) {
        rightPositions.push(newPos);
      }
    }

    // --- Шаг 3: Создаем бантики (без изменений) ---
    rightPositions.sort(() => Math.random() - 0.5);

    for (let i = 0; i < PAIRS; i++) {
      newBows.push({
        id: i,
        pairId: i,
        color: COLORS[i],
        pos: leftPositions[i],
        isMatched: false,
      });
      newBows.push({
        id: i + PAIRS,
        pairId: i,
        color: COLORS[i],
        pos: rightPositions[i],
        isMatched: false,
      });
    }

    setBows(newBows);
  }, [width, height, totalTopOffset, insets.bottom]);
  // --- ИЗМЕНЕНИЕ: PanResponder переписан с использованием useMemo для стабильности ---
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => status === "playing",
        onMoveShouldSetPanResponder: () => status === "playing",

        onPanResponderGrant: (evt, gestureState) => {
          const { x0, y0 } = gestureState;
          const correctedY = y0 - totalTopOffset;

          const touchedBow = bows.find((b) => {
            const dx = x0 - b.pos.x;
            const dy = correctedY - b.pos.y;
            return !b.isMatched && Math.sqrt(dx * dx + dy * dy) < BOW_SIZE; // Проверяем внутри радиуса бантика
          });

          if (touchedBow) {
            selectedBow.current = touchedBow;
            // Начинаем линию из центра бантика
            setCurrentLine({ path: [touchedBow.pos], color: touchedBow.color });
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          if (!selectedBow.current) return;

          const { moveX, moveY } = gestureState;
          const correctedY = moveY - totalTopOffset;
          // Используем функциональное обновление, чтобы избежать двойного добавления точек
          setCurrentLine((prevLine) => {
            if (!prevLine) return null;
            return {
              ...prevLine,
              path: [...prevLine.path, { x: moveX, y: correctedY }],
            };
          });
        },
        onPanResponderRelease: (evt, gestureState) => {
          const startBow = selectedBow.current;
          if (!startBow || !currentLine || currentLine.path.length < 2) {
            setCurrentLine(null);
            selectedBow.current = null;
            return;
          }

          // --- ИЗМЕНЕНИЕ 1: Используем более точные координаты из nativeEvent ---
          const { pageX, pageY } = evt.nativeEvent;
          const correctedY = pageY - totalTopOffset;

          const endBow = bows.find((b) => {
            // Проверяем расстояние от финальной точки касания до центра бантика
            const dx = pageX - b.pos.x;
            const dy = correctedY - b.pos.y;

            // --- ИЗМЕНЕНИЕ 2: Значительно увеличиваем радиус "хитбокса" ---
            // Теперь он в 2 раза больше размера бантика, что делает попадание намного проще.
            const isWithinHitbox =
              Math.sqrt(dx * dx + dy * dy) < BOW_SIZE * 2.0;

            // Остальные условия остаются теми же
            return (
              b.pairId === startBow.pairId &&
              b.id !== startBow.id &&
              !b.isMatched &&
              isWithinHitbox
            );
          });

          if (endBow) {
            // Завершаем линию точно в центре конечного бантика для красоты
            const finalPath = [...currentLine.path, endBow.pos];

            if (!newPathIntersectsExisting(finalPath, connections)) {
              // Успешное соединение
              const newConnections = [
                ...connections,
                { path: finalPath, color: startBow.color },
              ];
              setConnections(newConnections);
              setBows((prevBows) =>
                prevBows.map((b) =>
                  b.pairId === startBow.pairId ? { ...b, isMatched: true } : b
                )
              );

              if (newConnections.length === PAIRS) {
                setStatus("won");
              }
            }
          }

          // Сбрасываем текущую линию в любом случае
          setCurrentLine(null);
          selectedBow.current = null;
        },
        onPanResponderTerminate: () => {
          // Сброс, если жест был прерван
          setCurrentLine(null);
          selectedBow.current = null;
        },
      }),
    [status, totalTopOffset, bows, currentLine, connections]
  );

  return (
    // --- ИЗМЕНЕНИЕ: Применяем panHandlers к корневому View ---
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Соедини бантики!</Text>
          <Text style={styles.subtitle}>Ленты не должны пересекаться</Text>
        </View>
        <Text style={styles.timer}>{timeLeft}</Text>
      </View>
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
        {connections.map((conn, index) => (
          <Polyline
            key={`conn-${index}`}
            points={conn.path.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={conn.color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        ))}
        {currentLine && currentLine.path.length > 1 && (
          <Polyline
            points={currentLine.path.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={currentLine.color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        )}
      </Svg>
      {bows.map((bow) => (
        <View
          key={bow.id}
          style={[
            styles.bowContainer,
            {
              top: bow.pos.y - BOW_SIZE / 2,
              left: bow.pos.x - BOW_SIZE / 2,
              opacity: bow.isMatched ? 0.5 : 1,
            },
          ]}
        >
          <Image
            source={require("../../assets/images/sylveon_bow.png")}
            style={[styles.bowImage, { tintColor: bow.color }]}
          />
        </View>
      ))}
      {status !== "playing" && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            {status === "won" ? "ПОБЕДА!" : "Время вышло!"}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", height: "100%" },
  header: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  title: { color: "white", fontSize: 22, fontWeight: "bold" },
  subtitle: { color: "#ccc", fontSize: 14 },
  timer: { color: "white", fontSize: 36, fontWeight: "900" },
  bowContainer: { position: "absolute", width: BOW_SIZE, height: BOW_SIZE },
  bowImage: { width: BOW_SIZE, height: BOW_SIZE, resizeMode: "contain" },
  resultContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  resultText: {
    color: "#FF69B4",
    fontSize: 48,
    fontWeight: "900",
    textShadowColor: "white",
    textShadowRadius: 10,
  },
});

export default SylveonGame;
