import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { useGame } from '../context/GameContext'; // <-- Импортируем хук
import { useRouter } from 'expo-router'; // <-- Для закрытия модального окна
import Toast from 'react-native-toast-message'; // <-- Для уведомления
import Colors from '../constants/Colors';

export default function ModalScreen() {
  const { resetGame } = useGame(); // <-- Получаем нашу функцию
  const router = useRouter(); // <-- Получаем роутер

  const handleResetPress = () => {
    // Показываем диалоговое окно для подтверждения
    Alert.alert(
      "Сброс прогресса", // Заголовок
      "Вы уверены, что хотите сбросить весь прогресс? Это действие нельзя будет отменить.", // Сообщение
      [
        // Кнопки
        {
          text: "Отмена",
          style: "cancel", // На iOS эта кнопка будет выглядеть стандартно для отмены
        },
        {
          text: "Сбросить",
          onPress: async () => {
            await resetGame(); // Вызываем сброс
            router.back(); // Закрываем модальное окно
            Toast.show({ // Показываем уведомление
              type: 'gameToast',
              text1: 'Прогресс сброшен!',
              text2: 'Вы можете начать игру заново.',
            });
          },
          style: "destructive", // На iOS эта кнопка будет красного цвета
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Об игре</Text>
      <View style={styles.separator} />
      <Text style={styles.text}>
        Это кликер Эволюция Покемонов. Нажимайте на покемона, чтобы копить Энергию Эволюции, и помогайте ему развиваться!
      </Text>

      {/* --- НАША НОВАЯ КНОПКА --- */}
      <Pressable style={styles.resetButton} onPress={handleResetPress}>
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
    backgroundColor: Colors.danger, // Используем наш красный цвет
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});