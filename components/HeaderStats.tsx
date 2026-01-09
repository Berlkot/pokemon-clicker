import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View, Image } from "react-native";
import Colors from "../constants/Colors";
import { useGame } from "../context/GameContext";
import { formatNumber } from "../utils/formatNumber";

const HeaderStats = () => {
  const { gameState } = useGame();

  if (!gameState) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <FontAwesome5 name="gem" size={16} color="white" />
        <Text style={styles.statText}>
          {formatNumber(gameState.evolutionEnergy)}
          {gameState.energyPerSecond > 0 && (
            <Text style={styles.statPassive}>
              {" "}
              +{formatNumber(gameState.energyPerSecond)}/s
            </Text>
          )}
        </Text>
      </View>
      {gameState.ascensionCount > 0 && (
        <View style={styles.statItem}>
          <Image
            source={require("../assets/images/ascension.png")}
            style={styles.ascensionIcon}
          />
          <Text style={styles.statText}>
            {formatNumber(gameState.ascensionCurrency)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  statText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 5,
  },
  statPassive: {
    color: "#fff4ae8a",
  },
  ascensionIcon: { width: 16, height: 16, marginRight: 6 },
});

export default HeaderStats;
