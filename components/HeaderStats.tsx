import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../constants/Colors';
import { useGame } from '../context/GameContext';
import { formatNumber } from '../utils/formatNumber';

const HeaderStats = () => {
  const { gameState } = useGame();

  
  if (!gameState) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        {/* Иконка энергии (например, кристалл или монета) */}
        <FontAwesome5 name="gem" size={16} color={Colors.accent} />
        <Text style={styles.statText}>
          {formatNumber(gameState.evolutionEnergy)}
        </Text>
      </View>
      <View style={styles.statItem}>
        {/* Иконка дохода в секунду (молния) */}
        <FontAwesome5 name="bolt" size={16} color={Colors.lightGray} />
        <Text style={styles.statText}>
          {formatNumber(gameState.energyPerSecond)}/s
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)', 
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  statText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 5,
  },
});

export default HeaderStats;