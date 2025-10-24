import { useHeaderHeight } from '@react-navigation/elements';
import React, { useEffect, useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { MinigameReward } from '../../data/minigameData';


const PAIRS = 3;
const COLORS = ['#FF69B4', '#87CEEB', '#98FB98'];
const BOW_SIZE = 50;
const MIN_DISTANCE_BETWEEN_BOWS = BOW_SIZE * 1.5;
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





function newPathIntersectsExisting(poly1: Point[], existingPolys: Connection[], allBows: Bow[]) {
  function linesIntersect(p1: Bow['pos'], p2: Bow['pos'], p3: Bow['pos'], p4: Bow['pos']) {
  
  function CCW(p1: Bow['pos'], p2: Bow['pos'], p3: Bow['pos']) {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  }
  return (CCW(p1, p3, p4) !== CCW(p2, p3, p4)) && (CCW(p1, p2, p3) !== CCW(p1, p2, p4));
}

  
  for (let i = 0; i < poly1.length - 1; i++) {
    
    for (const existingPoly of existingPolys) {
      const poly2 = existingPoly.path;
      for (let j = 0; j < poly2.length - 1; j++) {
        if (linesIntersect(poly1[i], poly1[i + 1], poly2[j], poly2[j + 1])) {
          return true; 
        }
      }
    }
  }
  return false; 
}


function isTooClose(newPos: Bow['pos'], existingBows: Bow[]) {
  for (const bow of existingBows) {
    const dx = newPos.x - bow.pos.x;
    const dy = newPos.y - bow.pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE_BETWEEN_BOWS) {
      return true;
    }
  }
  return false;
}

const SylveonGame = ({ onComplete, panResponderRef }: {
  onComplete: (reward: MinigameReward | null) => void;
  panResponderRef: any;
}) => {
  const [bows, setBows] = useState<Bow[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [currentLine, setCurrentLine] = useState<{ path: Point[]; color: string } | null>(null);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const { width, height } = useWindowDimensions();
  const selectedBow = useRef<Bow | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const totalTopOffset = headerHeight > 0 ? headerHeight : insets.top;


  useEffect(() => {
    
    if (status === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            
            if(timerRef.current) clearInterval(timerRef.current);
            setStatus('lost');
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status]); 
    useEffect(() => {
    if (status === 'won' || status === 'lost') {
      let reward: MinigameReward | null = null;
      if (status === 'won') {
        
        reward = { type: 'buff', buffType: 'xp_multiplier', multiplier: 2, duration: 10 };
      } else if (status === 'lost' && connections.length > 0) {
        
        reward = { type: 'xp_boost', value: connections.length * 5 }; 
      }
      
      
      setTimeout(() => onComplete(reward), 1500);
    }
  }, [status, connections, onComplete]);

  
  useEffect(() => {
    const newBows: Bow[] = [];
    const xMargin = BOW_SIZE * 1.5;
    const yMargin = 150; 

    
    let leftColumnBows: Bow[] = [];
    while (leftColumnBows.length < PAIRS) {
      const newPos = {
        x: xMargin + Math.random() * (width / 2 - xMargin * 2),
        y: yMargin + Math.random() * (height - yMargin * 2),
      };
      if (!isTooClose(newPos, leftColumnBows)) {
        leftColumnBows.push({ id: leftColumnBows.length, pairId: leftColumnBows.length, color: COLORS[leftColumnBows.length], pos: newPos, isMatched: false });
      }
    }

    
    let rightColumnBows: Bow[] = [];
    while (rightColumnBows.length < PAIRS) {
      const newPos = {
        x: width / 2 + xMargin + Math.random() * (width / 2 - xMargin * 2),
        y: yMargin + Math.random() * (height - yMargin * 2),
      };
      if (!isTooClose(newPos, [...leftColumnBows, ...rightColumnBows])) {
        rightColumnBows.push({ id: rightColumnBows.length + PAIRS, pairId: rightColumnBows.length, color: COLORS[rightColumnBows.length], pos: newPos, isMatched: false });
      }
    }
    
    setBows([...leftColumnBows, ...rightColumnBows]);
  }, [width, height]);
  
  
  useEffect(() => {
    const gestureHandlers = {
      onStartShouldSetPanResponder: () => status === 'playing',
      onPanResponderGrant: (evt) => {
        
        const { pageX, pageY } = evt.nativeEvent;
        const correctedY = pageY - totalTopOffset;

        const touchedBow = bows.find(b => {
          const dx = pageX - b.pos.x;
          const dy = correctedY - b.pos.y;
          return !b.isMatched && (dx * dx + dy * dy) < (BOW_SIZE * BOW_SIZE);
        });
        if (touchedBow) {
          selectedBow.current = touchedBow;
          setCurrentLine({ path: [{ x: pageX, y: correctedY }], color: touchedBow.color });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        
        if (selectedBow.current) {
          const { moveX, moveY } = gestureState;
          const correctedY = moveY - totalTopOffset;
          setCurrentLine(prev => prev ? { ...prev, path: [...prev.path, { x: moveX, y: correctedY }] } : null);
        }
      },
      onPanResponderRelease: (evt) => {
        const startBow = selectedBow.current;
        if (!startBow || !currentLine || currentLine.path.length < 2) {
          
          setCurrentLine(null);
          selectedBow.current = null;
          return;
        }

        const { pageX, pageY } = evt.nativeEvent;
        const correctedY = pageY - totalTopOffset;

        const endBow = bows.find(b => {
          const dx = pageX - b.pos.x;
          const dy = correctedY - b.pos.y;
          return b.pairId === startBow.pairId && b.id !== startBow.id && !b.isMatched;
        });

        let isValidConnection = true;
        if (endBow) {
          
          if (newPathIntersectsExisting(currentLine.path, connections, bows)) {
            isValidConnection = false;
          }
        } else {
          isValidConnection = false;
        }

        if (isValidConnection && endBow) {
          
          const finalCleanPath = [...currentLine.path.slice(0, -1), endBow.pos];
          const newConnections = [...connections, { path: finalCleanPath, color: startBow.color }];
          setConnections(newConnections);
          setBows(prev => prev.map(b => (b.pairId === startBow.pairId) ? { ...b, isMatched: true } : b));

          
          if (newConnections.length === PAIRS) {
            setStatus('won'); 
          }
        }
        
        
        setCurrentLine(null);
        selectedBow.current = null;
      },
    }
    Object.assign(panResponderRef.panHandlers, PanResponder.create(gestureHandlers).panHandlers);
   }, [status, bows, connections, onComplete, panResponderRef, totalTopOffset, currentLine]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Соедини бантики!</Text>
          <Text style={styles.subtitle}>Ленты не должны пересекаться</Text>
        </View>
        {/* 6. --- ОТОБРАЖЕНИЕ ТАЙМЕРА --- */}
        <Text style={styles.timer}>{timeLeft}</Text>
      </View>
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
        {/* 8. --- РЕНДЕРИМ ПУТИ С ПОМОЩЬЮ Polyline --- */}
        {connections.map((conn, index) => (
            <Polyline
                key={`conn-${index}`}
                points={conn.path.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={conn.color}
                strokeWidth="8"
                strokeLinecap="round"
            />
        ))}
        {currentLine && currentLine.path.length > 1 && (
            <Polyline
                points={currentLine.path.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={currentLine.color}
                strokeWidth="8"
                strokeLinecap="round"
            />
        )}
      </Svg>
      {bows.map(bow => (
        <View key={bow.id} style={[styles.bowContainer, { top: bow.pos.y - BOW_SIZE / 2, left: bow.pos.x - BOW_SIZE / 2, opacity: bow.isMatched ? 0.5 : 1 }]}>
          <Image 
            source={require('../../assets/images/sylveon_bow.png')}
            style={[styles.bowImage, { tintColor: bow.color }]} 
          />
        </View>
      ))}
            {status === 'won' && <Text style={styles.resultText}>ПОБЕДА!</Text>}
      {status === 'lost' && <Text style={styles.resultText}>Время вышло!</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
    container: { width: '100%', height: '100%' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 20,
    },
    title: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    subtitle: { color: '#ccc', fontSize: 14 },
    timer: { color: 'white', fontSize: 36, fontWeight: '900' },
    bowContainer: { position: 'absolute', width: BOW_SIZE, height: BOW_SIZE },
    bowImage: { width: BOW_SIZE, height: BOW_SIZE, resizeMode: 'contain' },
    resultText: { position: 'absolute', top: '50%', alignSelf: 'center', color: '#FF69B4', fontSize: 48, fontWeight: '900', textShadowColor: 'white', textShadowRadius: 10 },
});

export default SylveonGame;