// app/_layout.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Эта часть кода предотвращает автоматическое скрытие экрана-заставки
// до того, как все ресурсы (например, шрифты) будут загружены.
export {
  // Catches any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    // Stack навигатор является основой для переходов между экранами.
    // Он работает как стопка карт: новый экран кладется поверх старого.
    <Stack>
      {/* 
        Основной экран приложения - это группа (tabs).
        Мы скрываем его заголовок, так как навигация будет осуществляться через табы.
      */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* 
        Это модальный экран. `presentation: 'modal'` заставляет его
        появляться снизу вверх, как это принято для настроек.
      */}
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Настройки' }} />
    </Stack>
  );
}