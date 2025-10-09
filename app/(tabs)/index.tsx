
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { useGame } from '../../context/GameContext';
import { pokemonDatabase } from '../../data/pokemonData';


export default function GameScreen() {
  const { gameState, setGameState } = useGame();

  // --- ОСНОВНАЯ ЛОГИКА ИГРЫ (САМАЯ ВАЖНАЯ ЧАСТЬ) ---
  const handlePokemonClick = () => {
    setGameState(prevState => {
      if (!prevState) return null;

      let { currentPokemonId, currentPokemonLevel, currentPokemonExp } = prevState;

      // Получаем статические данные текущего покемона из нашей "базы данных".
      const pokemonData = pokemonDatabase[currentPokemonId];
      
      // Рассчитываем, сколько опыта нужно для следующего уровня.
      const requiredExp = currentPokemonLevel //* 100;
      
      let newExp = currentPokemonExp + 1;

      // --- Проверка на повышение уровня ---
      if (newExp >= requiredExp) {
        currentPokemonLevel += 1; // Увеличиваем уровень
        newExp -= requiredExp; // Сбрасываем опыт, сохраняя "излишек"

        // --- Проверка на ЭВОЛЮЦИЮ ---
        // Если у покемона есть эволюция и мы достигли нужного уровня...
        if (pokemonData.evolvesTo && currentPokemonLevel >= (pokemonData.evolutionLevel ?? 999)) {
          // ...меняем ID покемона на ID его следующей формы.
          currentPokemonId = pokemonData.evolvesTo;
          // Можно добавить анимацию или какой-то эффект эволюции здесь.
        }
      }

      // Возвращаем новое, обновленное состояние.
      return {
        ...prevState,
        evolutionEnergy: prevState.evolutionEnergy + prevState.energyPerClick,
        currentPokemonId,
        currentPokemonLevel,
        currentPokemonExp: newExp,
      };
    });
  };

  // --- РЕНДЕР КОМПОНЕНТА ---

  if (!gameState) {
    return <View style={styles.container}><Text>Загрузка игры...</Text></View>;
  }

  // Получаем данные для отображения из нашей базы данных по ID из состояния.
  const currentPokemonData = pokemonDatabase[gameState.currentPokemonId];
  const requiredExpForLevelUp = gameState.currentPokemonLevel //* 100;
  const experiencePercentage = (gameState.currentPokemonExp / requiredExpForLevelUp) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <Text style={styles.statText}>Энергия Эволюции: {Math.floor(gameState.evolutionEnergy)}</Text>
        <Text style={styles.statText}>В секунду: {gameState.energyPerSecond}</Text>
      </View>

      <TouchableOpacity style={styles.pokemonButton} onPress={handlePokemonClick}>
        {/* Изображение и имя берутся из базы данных */}
        <Image 
          source={currentPokemonData.image} 
          style={styles.pokemonImage}
        />
        <Text style={styles.pokemonName}>{currentPokemonData.name} (Ур. {gameState.currentPokemonLevel})</Text>
      </TouchableOpacity>
      
      <View style={styles.experienceContainer}>
        <Text style={styles.expText}>
          Опыт: {gameState.currentPokemonExp} / {requiredExpForLevelUp}
        </Text>
        <View style={styles.expBarBackground}>
          <View style={[styles.expBarForeground, { width: `${experiencePercentage}%` }]} />
        </View>
      </View>
    </View>
  );
}

// Стили остаются такими же, как в предыдущем ответе.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#f0f8ff',
  },
  statsContainer: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  pokemonButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pokemonImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  pokemonName: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: 'bold',
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
    backgroundColor: '#4caf50',
    borderRadius: 10,
  },
});