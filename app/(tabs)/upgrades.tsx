// app/(tabs)/upgrades.tsx

import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
// --- Импортируем хук и базу данных улучшений ---
import { useGame } from '../../context/GameContext';
import { upgradesDatabase, Upgrade } from '../../data/upgradesData';

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

      const newUpgrades = { ...prevState.upgrades };
      newUpgrades[upgrade.id] = (newUpgrades[upgrade.id] || 0) + 1;

      let newEnergyPerClick = prevState.energyPerClick;
      let newEnergyPerSecond = prevState.energyPerSecond;

      // Применяем эффект улучшения
      if (upgrade.effect.type === 'add_click') {
        newEnergyPerClick += upgrade.effect.value;
      } else if (upgrade.effect.type === 'add_passive') {
        newEnergyPerSecond += upgrade.effect.value;
      }
      
      return {
        ...prevState,
        evolutionEnergy: prevState.evolutionEnergy - cost,
        energyPerClick: newEnergyPerClick,
        energyPerSecond: newEnergyPerSecond,
        upgrades: newUpgrades,
      };
    });
  };

  return (
    <View style={styles.upgradeItem}>
      <View style={styles.infoContainer}>
        <Text style={styles.upgradeTitle}>{upgrade.title} (Ур. {currentLevel})</Text>
        <Text style={styles.upgradeDescription}>{upgrade.description}</Text>
      </View>
      <TouchableOpacity 
        style={[styles.buyButton, !canAfford && styles.disabledButton]}
        onPress={handlePurchase}
        disabled={!canAfford}
      >
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
  infoContainer: { flex: 1 },
  upgradeTitle: { fontSize: 18, fontWeight: 'bold' },
  upgradeDescription: { fontSize: 14, color: 'gray' },
  buyButton: { backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, marginLeft: 10 },
  buyButtonText: { color: 'white', fontWeight: 'bold' },
  disabledButton: { backgroundColor: '#a0a0a0' },
});