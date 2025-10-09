import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Об игре</Text>
      <View style={styles.separator} />
      <Text style={styles.text}>
        Это кликер Эволюция Покемонов. Нажимайте на покемона, чтобы копить Энергию Эволюции, и помогайте ему развиваться!
      </Text>

      {}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
    backgroundColor: '#eee',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});