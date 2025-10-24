import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Colors from '../constants/Colors';
import { useGame } from '../context/GameContext';


const SettingRow = ({ label, value, onValueChange }: { label: string, value: boolean, onValueChange: (value: boolean) => void }) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Switch
      trackColor={{ false: "#767577", true: Colors.success }}
      thumbColor={value ? "#e4ffcbff" : "#f4f3f4"}
      onValueChange={onValueChange}
      value={value}
    />
  </View>
);

export default function ModalScreen() {
  const { gameState, updateSettings, resetGame } = useGame();
  const router = useRouter();

  const handleResetPress = () => {
    
    Alert.alert(
      "Сброс прогресса", 
      "Вы уверены, что хотите сбросить весь прогресс? Это действие нельзя будет отменить.", 
      [
        
        {
          text: "Отмена",
          style: "cancel", 
        },
        {
          text: "Сбросить",
          onPress: async () => {
            await resetGame(); 
            router.back(); 
            Toast.show({ 
              type: 'gameToast',
              text1: 'Прогресс сброшен!',
              text2: 'Вы можете начать игру заново.',
            });
          },
          style: "destructive", 
        },
      ]
    );
  };
  if (!gameState) {
    return <View style={styles.container}><Text>Загрузка...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Настройки</Text>
      
      <View style={styles.settingsGroup}>
        <SettingRow 
          label="Звуковые эффекты"
          value={gameState.settings.isSoundEnabled}
          onValueChange={(value) => updateSettings({ isSoundEnabled: value })}
        />
        <SettingRow 
          label="Вибрация"
          value={gameState.settings.isVibrationEnabled}
          onValueChange={(value) => updateSettings({ isVibrationEnabled: value })}
        />
      </View>
      
      <Pressable style={styles.resetButton} onPress={handleResetPress} testID="reset-progress-button">
        <Text style={styles.resetButtonText}>Сбросить прогресс</Text>
      </Pressable>
      
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  separator: { marginVertical: 30, height: 1, width: '80%', backgroundColor: '#eee' },
  text: { fontSize: 16, textAlign: 'center' },
  resetButton: {
    marginTop: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.danger, 
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  settingsGroup: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginVertical: 30,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingLabel: {
    fontSize: 18,
  },
});