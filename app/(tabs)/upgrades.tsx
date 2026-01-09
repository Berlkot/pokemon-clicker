import { FontAwesome5 } from "@expo/vector-icons";
// --- ИЗМЕНЕНИЕ: Добавляем useRef для управления ScrollView ---
import React, { useEffect, useRef } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Colors from "../../constants/Colors";
import { useGame } from "../../context/GameContext";
import { pokemonDatabase } from "../../data/pokemonData";
import {
  Upgrade,
  upgradesDatabase,
  ascensionUpgradesDatabase,
} from "../../data/upgradesData";
import { formatNumber } from "../../utils/formatNumber";
import BackgroundGradient from "../../components/BackgroundGradient";
import format from "../../utils/formatString";

// Функции и компонент UpgradeItem остаются без изменений
export const recalculateStats = (
  upgrades: { [key: string]: number },
  ascensionUpgrades: { [key: string]: number } = {}
) => {
  let newEnergyPerSecond = 0;
  let newXpPerSecond = 0;
  let newEnergyPerClick = 1;
  let newXpPerClick = 1;

  const clickPowerBonus = 1 + ascensionUpgrades["crystal_click_power"] || 0;
  const xpPowerBonus = 1 + ascensionUpgrades["crystal_click_power"] || 0;

  const clickLvl = upgrades["stronger_click"] || 0;
  newEnergyPerClick +=
    clickLvl *
    upgradesDatabase["stronger_click"].effect.value *
    clickPowerBonus;

  const xpClickLvl = upgrades["trainer_study"] || 0;
  newXpPerClick +=
    xpClickLvl * upgradesDatabase["trainer_study"].effect.value * xpPowerBonus;

  const pikachuLvl = upgrades["pikachu_helper"] || 0;
  if (pikachuLvl > 0) {
    const eff = upgradesDatabase["pikachu_helper"].effect.value; // 0.1
    newEnergyPerSecond += pikachuLvl * eff * newEnergyPerClick;
  }

  const xpHelperLvl = upgrades["xp_helper"] || 0;
  if (xpHelperLvl > 0) {
    const eff = upgradesDatabase["xp_helper"].effect.value; // 0.05
    newXpPerSecond += xpHelperLvl * eff * newXpPerClick;
  }

  return {
    newEnergyPerClick,
    newEnergyPerSecond,
    newXpPerClick,
    newXpPerSecond,
  };
};

const UpgradeItem = ({
  upgrade,
  ascensionBonus = 1,
}: {
  upgrade: Upgrade;
  ascensionBonus?: number;
}) => {
  const { gameState, setGameState } = useGame();
  if (!gameState) return null;
  const effectiveValue = upgrade.effect.value * ascensionBonus;
  const currentLevel = gameState.upgrades[upgrade.id] || 0;
  const cost = Math.floor(upgrade.baseCost * Math.pow(1.15, currentLevel));
  const canAfford = gameState.evolutionEnergy >= cost;

  const before = recalculateStats(gameState.upgrades, gameState.ascensionUpgrades);

  const nextUpgrades = {
    ...gameState.upgrades,
    [upgrade.id]: (gameState.upgrades[upgrade.id] || 0) + 1,
  };
  const after = recalculateStats(nextUpgrades, gameState.ascensionUpgrades);

  const statLine = (() => {
    switch (upgrade.effect.type) {
      case "add_to_click":
        return `Энергия/клик: ${before.newEnergyPerClick} → ${after.newEnergyPerClick}`;
      case "add_passive_from_click_percentage":
        return `Энергия/сек: ${before.newEnergyPerSecond.toFixed(
          2
        )} → ${after.newEnergyPerSecond.toFixed(2)}`;
      case "add_to_xp_click":
        return `XP/клик: ${before.newXpPerClick} → ${after.newXpPerClick}`;
      case "add_xp_passive_from_xp_click_percentage":
        return `XP/сек: ${before.newXpPerSecond.toFixed(
          2
        )} → ${after.newXpPerSecond.toFixed(2)}`;
      default:
        return "";
    }
  })();

  const handlePurchase = () => {
    if (!canAfford) {
      Alert.alert("Недостаточно энергии!");
      return;
    }
    setGameState((prev) => {
      if (!prev) return null;

      const currentLevel = prev.upgrades[upgrade.id] || 0;
      const nextUpgrades = { ...prev.upgrades, [upgrade.id]: currentLevel + 1 };

      const {
        newEnergyPerClick,
        newEnergyPerSecond,
        newXpPerClick,
        newXpPerSecond,
      } = recalculateStats(nextUpgrades);

      return {
        ...prev,
        evolutionEnergy: prev.evolutionEnergy - cost,
        upgrades: nextUpgrades,
        energyPerClick: newEnergyPerClick,
        energyPerSecond: newEnergyPerSecond,
        xpPerClick: newXpPerClick,
        xpPerSecond: newXpPerSecond,
      };
    });
    Toast.show({
      type: "gameToast",
      text1: "Улучшение куплено!",
      text2: `${upgrade.title} теперь Уровень ${currentLevel + 1}`,
    });
  };
  return (
    <View style={styles.upgradeCard}>
      <FontAwesome5 name={upgrade.icon} size={40} color={Colors.primary} />
      <View style={styles.infoContainer}>
        <Text style={styles.upgradeTitle}>
          {upgrade.title} (Ур. {currentLevel}){"\n"}
          <Text style={styles.upgradeDelta}>{statLine}</Text>
        </Text>

        <Text style={styles.upgradeDescription}>
          {format(upgrade.description, effectiveValue)}
        </Text>
      </View>
      <Pressable
        android_ripple={{ color: Colors.primary, borderless: true }}
        style={({ pressed }) => [
          styles.buyButton,
          !canAfford && styles.disabledButton,
          pressed && Platform.OS !== "android" && { opacity: 0.8 },
        ]}
        onPress={handlePurchase}
        disabled={!canAfford}
      >
        <Text style={styles.buyButtonText}>{formatNumber(cost)} ЭЭ</Text>
      </Pressable>
    </View>
  );
};

const AscensionUpgradeItem = ({ upgrade }: { upgrade: any }) => {
  const { gameState, setGameState } = useGame();
  if (!gameState) return null;

  const currentLevel = gameState.ascensionUpgrades?.[upgrade.id] || 0;
  const cost = Math.floor(upgrade.baseCost * Math.pow(1.35, currentLevel)); // можно подкрутить
  const canAfford = gameState.ascensionCurrency >= cost;
  const isUnlocked = gameState.ascensionCount > 0;

  const handlePurchase = () => {
    if (!isUnlocked) return;
    if (!canAfford) {
      Alert.alert("Недостаточно валюты вознесения!");
      return;
    }

    setGameState((prev) => {
      if (!prev) return null;
      const lvl = prev.ascensionUpgrades?.[upgrade.id] || 0;

      return {
        ...prev,
        ascensionCurrency: prev.ascensionCurrency - cost,
        ascensionUpgrades: {
          ...(prev.ascensionUpgrades || {}),
          [upgrade.id]: lvl + 1,
        },
      };
    });

    Toast.show({
      type: "gameToast",
      text1: "Улучшение вознесения куплено!",
      text2: `${upgrade.title} теперь Уровень ${currentLevel + 1}`,
    });
  };

  return (
    <View style={[styles.upgradeCard, !isUnlocked && styles.lockedCard]}>
      <FontAwesome5
        name={upgrade.icon}
        size={22}
        color={isUnlocked ? Colors.primary : "#999"}
      />

      <View style={styles.infoContainer}>
        <Text style={styles.upgradeTitle}>
          {upgrade.title} (Ур. {currentLevel})
        </Text>
        <Text style={styles.upgradeDescription}>{upgrade.description}</Text>
      </View>

      <Pressable
        style={[
          styles.buyButton1,
          (!isUnlocked || !canAfford) && styles.disabledButton,
        ]}
        onPress={handlePurchase}
        disabled={!isUnlocked || !canAfford}
      >
        <View style={{    flexDirection: "row",
    alignItems: "center"}}>
          <Text style={styles.buyButtonText}>{cost}</Text>
          <Image
            source={require("../../assets/images/ascension.png")}
            style={{ width: 18, height: 18, marginRight: 6 }}
          />
        </View>
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

  const evolutionChain = getEvolutionChain("eevee");
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
          const isLocked =
            index > currentIndex && gameState.ascensionCount === 0;
          const isActive = index === currentIndex;
          const unlockLevel = pokemonData.evolutionLevel;
          return (
            <View key={pokemonId} style={styles.pokemonIconContainer}>
              <View
                style={
                  isActive
                    ? styles.activePokemonBorder
                    : styles.inactivePokemonBorder
                }
              >
                <Image
                  source={pokemonData.image}
                  style={[styles.pokemonImage, isLocked && styles.lockedImage]}
                />
              </View>
              {isLocked && (
                <View style={styles.lockIconContainer}>
                  <BackgroundGradient color="black" topOffset={-6} />

                  <FontAwesome5 name="lock" size={24} color="white" />
                  <Text style={styles.unlockText}>Ур. {unlockLevel}</Text>
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
    return (
      <View style={styles.container}>
        <Text>Загрузка...</Text>
      </View>
    );
  }

  return (
    // Главный контейнер теперь не имеет padding, чтобы Timeline прилип к краям
    <View style={styles.container}>
      {/* ScrollView теперь занимает все доступное пространство и имеет отступы */}
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Магазин улучшений</Text>
        </View>

        {Object.values(upgradesDatabase).map((upgrade) => (
          <UpgradeItem key={upgrade.id} upgrade={upgrade} />
        ))}

        <View style={{ marginTop: 10 }}>
          <Text style={styles.sectionHeader}>Улучшения вознесения</Text>

          {Object.values(ascensionUpgradesDatabase).map((u) => (
            <AscensionUpgradeItem key={u.id} upgrade={u} />
          ))}
        </View>
      </ScrollView>

      {/* Timeline теперь находится за пределами ScrollView, внизу */}
      <EvolutionTimeline />
    </View>
  );
}

// --- ИЗМЕНЕНИЕ: Обновляем стили для новой структуры ---
const styles = StyleSheet.create({
  // Главный контейнер: занимает весь экран
  container: { flex: 1, backgroundColor: "#fff" },
  // Контейнер для скролла: имеет внутренние отступы
  scrollContentContainer: { padding: 15 },
  headerContainer: { alignItems: "center", marginBottom: 20 },
  header: { fontSize: 28, fontWeight: "bold" },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
  },
  upgradeTitle: { fontSize: 16, fontWeight: "bold", color: Colors.primary },
  upgradeDescription: { fontSize: 14, color: Colors.darkGray },
  buyButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  buyButtonText: { color: Colors.primary, fontWeight: "bold", fontSize: 16 },
  disabledButton: { backgroundColor: Colors.lightGray },
  evolutionSection: {
    // Убираем margin и добавляем границу сверху
    paddingVertical: 10,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  sectionHeader: {
    fontSize: 18, // Уменьшаем размер для компактности
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: Colors.primary,
  },
  timelineContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 10,
  },
  pokemonIconContainer: {
    alignItems: "center",
    marginHorizontal: 10,
    width: 80,
  },
  // Добавляем стиль для неактивной рамки, чтобы размеры совпадали
  inactivePokemonBorder: {
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "transparent", // Прозрачная рамка
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
    backgroundColor: "#fff",
  },
  lockedImage: {
    tintColor: "gray",
    opacity: 0.6,
  },
  lockIconContainer: {
    position: "absolute",
    top: 20,
    left: 19,
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  pokemonNameText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.darkGray,
    textAlign: "center",
  },
  upgradeDelta: {
    opacity: 0.7,
    paddingTop: 3,
    fontSize: 10,
    fontWeight: "700",
    color: Colors.accentText,
  },
  unlockText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.darkGray,
  },
  lockedCard: {
    opacity: 0.65,
  },
  buyButton1: {
    backgroundColor: Colors.accent,
    paddingLeft: 30,
    paddingRight: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  buyButton1Disabled: {
    backgroundColor: Colors.lightGray
  }
});
