// app/(tabs)/_layout.tsx

import React from 'react';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useGame } from '../../context/GameContext';
import Colors from '../../constants/Colors';
import { pokemonDatabase } from '../../data/pokemonData';

// Компонент иконки (без изменений)
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

// Внутренний компонент для доступа к контексту (без изменений)
export default function TabsLayout() {
  const { gameState } = useGame();

const pokemonData = gameState ? pokemonDatabase[gameState.currentPokemonId] : undefined;
const activeColor = pokemonData ? Colors.stageAccentColors[pokemonData.evolutionStage - 1] : Colors.primary;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,

        // --- НОВЫЕ СТИЛИ ДЛЯ РЕШЕНИЯ ПРОБЛЕМЫ ---
        
        // 1. Устанавливаем цвет для НЕАКТИВНЫХ иконок и текста.
        // Полупрозрачный белый будет хорошо смотреться на темном фоне.
        tabBarInactiveTintColor: 'rgba(83, 83, 83, 0.5)',

        // 2. Стилизуем саму панель навигации (футер).
        tabBarStyle: {
          backgroundColor: "#fff", // <-- Устанавливаем наш синий фон
          borderTopWidth: 0, // Убираем тонкую серую линию сверху для чистоты вида
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Игра',
          tabBarIcon: ({ color }) => <TabBarIcon name="gamepad" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color="gray"
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
        options={{
          title: 'Улучшения',
          tabBarIcon: ({ color }) => <TabBarIcon name="arrow-up" color={color} />,
        }}
      />
    </Tabs>
  );
}
