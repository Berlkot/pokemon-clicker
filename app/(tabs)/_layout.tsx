import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, Tabs } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

import HeaderStats from "../../components/HeaderStats";
import Colors from "../../constants/Colors";
import { useGame } from "../../context/GameContext";
import { pokemonDatabase } from "../../data/pokemonData";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabsLayout() {
  const { gameState } = useGame();

  const pokemonData = gameState
    ? pokemonDatabase[gameState.currentPokemonId]
    : undefined;
  const activeColor = pokemonData
    ? Colors.stageAccentColors[pokemonData.evolutionStage - 1]
    : Colors.primary;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.5)",

        tabBarStyle: {
          backgroundColor: Colors.primary,
          borderTopWidth: 0,
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: "white",
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: (e) => {
            if (gameState?.activeMinigameId) {
              e.preventDefault();
            }
          },
        }}
        options={{
          title: "Игра",
          headerTitle: () => <HeaderStats />,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="gamepad" color={color} />
          ),

          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable
              onPress={(e) => {
                if (gameState?.activeMinigameId) {
                  e.preventDefault();
                }
              }}
              >
                {({ pressed }) => (
                  <FontAwesome
                    name="cog"
                    size={24}
                    color="white"
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="upgrades"
        listeners={{
          tabPress: (e) => {
            if (gameState?.activeMinigameId) {
              e.preventDefault();
            }
          },
        }}
        options={{
          title: "Улучшения",
          headerTitle: () => <HeaderStats />,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="arrow-up" color={color} />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="cog"
                    size={24}
                    color="white"
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
    </Tabs>
  );
}
