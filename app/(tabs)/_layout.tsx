// app/(tabs)/_layout.tsx

import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { GameProvider } from '@/context/GameContext';

// Вспомогательная функция для рендеринга иконки.
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <GameProvider>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'blue', // Цвет активной иконки
      }}>
      {/* 
        Первая вкладка. `name="index"` ссылается на файл `index.tsx`.
        В `options` мы задаем её название и иконку.
      */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Игра',
          tabBarIcon: ({ color }) => <TabBarIcon name="gamepad" color={color} />,
          // Здесь мы можем добавить кнопку в заголовок, например, для вызова модального окна настроек.
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
      {/* 
        Вторая вкладка. `name="upgrades"` ссылается на файл `upgrades.tsx`.
      */}
      <Tabs.Screen
        name="upgrades"
        options={{
          title: 'Улучшения',
          tabBarIcon: ({ color }) => <TabBarIcon name="arrow-up" color={color} />,
        }}
      />
    </Tabs>
    </GameProvider>
  );
}