

import { GameProvider } from '@/context/GameContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Colors from '../constants/Colors';

export { ErrorBoundary } from 'expo-router';
export const unstable_settings = { initialRouteName: '(tabs)' };
SplashScreen.preventAutoHideAsync();


const toastConfig = {
  gameToast: ({ text1, text2 }: any) => (
    <View style={{
      width: '90%',
      marginTop: 10,
      paddingHorizontal: 15,
      paddingVertical: 10,
      backgroundColor: '#fff',
      borderRadius: 8,
      borderLeftColor: Colors.accent,
      borderLeftWidth: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.success }}>
        {text1}
      </Text>
      {text2 && <Text style={{ fontSize: 14, color: Colors.primary, marginTop: 3 }}>{text2}</Text>}
    </View>
  ),
};


export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

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
    
    <GameProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Настройки' }} />
      </Stack>
      <Toast config={toastConfig} position="top" topOffset={60} />
    </GameProvider>
  );
}