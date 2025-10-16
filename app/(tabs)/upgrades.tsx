import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useGame } from '../../context/GameContext';
import { upgradesDatabase, Upgrade } from '../../data/upgradesData';
import Colors from '../../constants/Colors'; // <-- Импортируем цвета
import FontAwesome from '@expo/vector-icons/FontAwesome'; // <-- Для иконок
import Toast from 'react-native-toast-message'; // <-- Для уведомлений (из Части 2)


const recalculateStats = (upgrades: { [key: string]: number }) => {
  let newEnergyPerClick = 1; // Базовое значение
  let newEnergyPerSecond = 0; // Базовое значение

  // Сначала считаем общую силу клика
  const clickUpgradeLevel = upgrades['stronger_click'] || 0;
  newEnergyPerClick += clickUpgradeLevel * upgradesDatabase['stronger_click'].effect.value;

  // Затем, на основе силы клика, считаем пассивный доход
  const passiveUpgradeLevel = upgrades['pikachu_helper'] || 0;
  if (passiveUpgradeLevel > 0) {
    const passiveEffect = upgradesDatabase['pikachu_helper'].effect;
    // Пассивный доход = (уровень * процент) * текущая_сила_клика
    newEnergyPerSecond += Math.round(passiveUpgradeLevel * passiveEffect.value * newEnergyPerClick);
  }
  
  return { newEnergyPerClick, newEnergyPerSecond };
};


// Компонент для одного улучшения
const UpgradeItem = ({ upgrade }: { upgrade: Upgrade }) => {
  const { gameState, setGameState } = useGame();

  if (!gameState) return null;

  const currentLevel = gameState.upgrades[upgrade.id] || 0;
  // Динамическая стоимость: увеличивается с каждым уровнем (например, на 15%)
  const cost = Math.floor(upgrade.baseCost * Math.pow(1.15, currentLevel));
  const canAfford = gameState.evolutionEnergy >= cost;

  const handlePurchase = () => {
    if (!canAfford) {
      Alert.alert("Недостаточно энергии!");
      return;
    }

    setGameState(prevState => {
      if (!prevState) return null;

      const newState = { ...prevState };
      
      // 1. Списываем энергию и повышаем уровень улучшения
      newState.evolutionEnergy -= cost;
      newState.upgrades[upgrade.id] = (newState.upgrades[upgrade.id] || 0) + 1;

      // 2. Вызываем нашу новую функцию для пересчета ВСЕХ статов
      const { newEnergyPerClick, newEnergyPerSecond } = recalculateStats(newState.upgrades);
      
      // 3. Обновляем статы в состоянии
      newState.energyPerClick = newEnergyPerClick;
      newState.energyPerSecond = newEnergyPerSecond;

      return newState;
    });
    Toast.show({
      type: 'gameToast',
      text1: 'Улучшение куплено!',
      text2: `${upgrade.title} теперь Уровень ${currentLevel + 1}`,
    });
  };

  return (
    <View style={styles.upgradeCard}>
      <FontAwesome name={upgrade.effect.type === 'add_to_click' ? 'hand-pointer-o' : 'bolt'} size={40} color={Colors.primary} />
      <View style={styles.infoContainer}>
        <Text style={styles.upgradeTitle}>{upgrade.title} (Ур. {currentLevel})</Text>
        <Text style={styles.upgradeDescription}>{upgrade.description}</Text>
      </View>
      <TouchableOpacity 
        style={[styles.buyButton, !canAfford && styles.disabledButton]}
        onPress={handlePurchase}
        disabled={!canAfford}>
        <Text style={styles.buyButtonText}>{cost} ЭЭ</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function UpgradesScreen() {
  const { gameState } = useGame();

  if (!gameState) {
    return <View style={styles.container}><Text>Загрузка...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Магазин улучшений</Text>
        <Text style={styles.energyText}>Ваша энергия: {Math.floor(gameState.evolutionEnergy)}</Text>
      </View>
      
      {/* Динамически рендерим все улучшения из нашей базы данных */}
      {Object.values(upgradesDatabase).map(upgrade => (
        <UpgradeItem key={upgrade.id} upgrade={upgrade} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 28, fontWeight: 'bold' },
  energyText: { fontSize: 18, color: 'gray', marginTop: 5 },
  upgradeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    // Тень для эффекта "карточки"
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
});