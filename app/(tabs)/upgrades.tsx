import FontAwesome from '@expo/vector-icons/FontAwesome';
// --- ИЗМЕНЕНИЕ: Добавляем useRef для управления ScrollView ---
import React, { useEffect, useRef } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Colors from '../../constants/Colors';
import { useGame } from '../../context/GameContext';
import { pokemonDatabase } from '../../data/pokemonData';
import { Upgrade, upgradesDatabase } from '../../data/upgradesData';
import { formatNumber } from '../../utils/formatNumber';


// Функции и компонент UpgradeItem остаются без изменений
export const recalculateStats = (upgrades: { [key: string]: number }) => {
  let newEnergyPerClick = 1; 
  let newEnergyPerSecond = 0; 
  const clickUpgradeLevel = upgrades['stronger_click'] || 0;
  newEnergyPerClick += clickUpgradeLevel * upgradesDatabase['stronger_click'].effect.value;
  const passiveUpgradeLevel = upgrades['pikachu_helper'] || 0;
  if (passiveUpgradeLevel > 0) {
    const passiveEffect = upgradesDatabase['pikachu_helper'].effect;
    newEnergyPerSecond += passiveUpgradeLevel * passiveEffect.value * newEnergyPerClick
  }
  return { newEnergyPerClick, newEnergyPerSecond };
};

const UpgradeItem = ({ upgrade }: { upgrade: Upgrade }) => {
  const { gameState, setGameState } = useGame();
  if (!gameState) return null;
  const currentLevel = gameState.upgrades[upgrade.id] || 0;
  const cost = Math.floor(upgrade.baseCost * Math.pow(1.15, currentLevel));
  const canAfford = gameState.evolutionEnergy >= cost;
  const handlePurchase = () => {
    if (!canAfford) { Alert.alert("Недостаточно энергии!"); return; }
    setGameState(prevState => {
      if (!prevState) return null;
      const newState = { ...prevState };
      newState.evolutionEnergy -= cost;
      newState.upgrades[upgrade.id] = (newState.upgrades[upgrade.id] || 0) + 1;
      const { newEnergyPerClick, newEnergyPerSecond } = recalculateStats(newState.upgrades);
      newState.energyPerClick = newEnergyPerClick;
      newState.energyPerSecond = newEnergyPerSecond;
      return newState;
    });
    Toast.show({ type: 'gameToast', text1: 'Улучшение куплено!', text2: `${upgrade.title} теперь Уровень ${currentLevel + 1}` });
  };
  return (
    <View style={styles.upgradeCard}>
      <FontAwesome name={upgrade.effect.type === 'add_to_click' ? 'hand-pointer-o' : 'bolt'} size={40} color={Colors.primary} />
      <View style={styles.infoContainer}>
        <Text style={styles.upgradeTitle}>{upgrade.title} (Ур. {currentLevel})</Text>
        <Text style={styles.upgradeDescription}>{upgrade.description}</Text>
      </View>
      <Pressable 
        android_ripple={{ color: Colors.primary, borderless: true }}
        style={({ pressed }) => [ styles.buyButton, !canAfford && styles.disabledButton, pressed && Platform.OS !== 'android' && { opacity: 0.8 }]}
        onPress={handlePurchase}
        disabled={!canAfford}>
        <Text style={styles.buyButtonText}>{formatNumber(cost)} ЭЭ</Text>
      </Pressable>
    </View>
  );
};

// --- ИЗМЕНЕНИЕ: Добавляем авто-скролл в EvolutionTimeline ---
const EvolutionTimeline = () => {
  const { gameState } = useGame();
  // Создаем ref для ScrollView
  const scrollViewRef = useRef<ScrollView>(null);

  if (!gameState) return null;

  const getEvolutionChain = (startId: string): string[] => {
    const chain = [startId];
    let currentId = startId;
    while (pokemonDatabase[currentId] && pokemonDatabase[currentId].evolvesTo) {
      currentId = pokemonDatabase[currentId].evolvesTo!;
      chain.push(currentId);
    }
    return chain;
  };
  
  const evolutionChain = getEvolutionChain('eevee');
  const currentIndex = evolutionChain.indexOf(gameState.currentPokemonId);

  // useEffect для выполнения скролла после рендера
  useEffect(() => {
    if (scrollViewRef.current && currentIndex > 0) {
      // Рассчитываем позицию для скролла. 100 = ширина иконки (80) + отступы (20)
      const xOffset = (currentIndex - 1) * 100; 
      
      // Используем setTimeout, чтобы скролл сработал после того, как все элементы отрендерились
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: xOffset, animated: true });
      }, 100);
    }
  }, [currentIndex]); // Запускаем эффект при изменении текущего покемона

  return (
    <View style={styles.evolutionSection}>
      <Text style={styles.sectionHeader}>Прогресс Эволюции</Text>
      <ScrollView 
        ref={scrollViewRef} // Привязываем ref
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.timelineContainer}
      >
        {evolutionChain.map((pokemonId, index) => {
          const pokemonData = pokemonDatabase[pokemonId];
          const isLocked = index > currentIndex;
          const isActive = index === currentIndex;
          return (
            <View key={pokemonId} style={styles.pokemonIconContainer}>
              <View style={isActive ? styles.activePokemonBorder : styles.inactivePokemonBorder}>
                <Image 
                  source={pokemonData.image} 
                  style={[styles.pokemonImage, isLocked && styles.lockedImage]}
                />
              </View>
              {isLocked && (
                <View style={styles.lockIconContainer}>
                  <FontAwesome name="lock" size={24} color="white" />
                </View>
              )}
              <Text style={styles.pokemonNameText}>{pokemonData.name}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};


// --- ИЗМЕНЕНИЕ: Перестраиваем структуру экрана ---
export default function UpgradesScreen() {
  const { gameState } = useGame();

  if (!gameState) {
    return <View style={styles.container}><Text>Загрузка...</Text></View>;
  }

  return (
    // Главный контейнер теперь не имеет padding, чтобы Timeline прилип к краям
    <View style={styles.container}>
      {/* ScrollView теперь занимает все доступное пространство и имеет отступы */}
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Магазин улучшений</Text>
        </View>
        
        {Object.values(upgradesDatabase).map(upgrade => (
          <UpgradeItem key={upgrade.id} upgrade={upgrade} />
        ))}
      </ScrollView>
      
      {/* Timeline теперь находится за пределами ScrollView, внизу */}
      <EvolutionTimeline />
    </View>
  );
}


// --- ИЗМЕНЕНИЕ: Обновляем стили для новой структуры ---
const styles = StyleSheet.create({
  // Главный контейнер: занимает весь экран
  container: { flex: 1, backgroundColor: '#fff' },
  // Контейнер для скролла: имеет внутренние отступы
  scrollContentContainer: { padding: 15 },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 28, fontWeight: 'bold' },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
  },
  upgradeTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
  upgradeDescription: { fontSize: 14, color: Colors.darkGray },
  buyButton: { backgroundColor: Colors.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  buyButtonText: { color: Colors.primary, fontWeight: 'bold', fontSize: 16 },
  disabledButton: { backgroundColor: Colors.lightGray },
  evolutionSection: {
    // Убираем margin и добавляем границу сверху
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionHeader: {
    fontSize: 18, // Уменьшаем размер для компактности
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: Colors.primary,
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  pokemonIconContainer: {
    alignItems: 'center',
    marginHorizontal: 10,
    width: 80,
  },
  // Добавляем стиль для неактивной рамки, чтобы размеры совпадали
  inactivePokemonBorder: {
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'transparent', // Прозрачная рамка
    padding: 4,
  },
  activePokemonBorder: {
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.accent,
    padding: 4,
  },
  pokemonImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
  },
  lockedImage: {
    tintColor: 'gray',
    opacity: 0.6,
  },
  lockIconContainer: {
    position: 'absolute',
    top: 20,
    left: 28,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pokemonNameText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
    textAlign: 'center',
  },
});