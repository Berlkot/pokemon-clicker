// Определяем интерфейс для статических данных каждого покемона.
export interface PokemonData {
  id: string; // Уникальный идентификатор, например 'bulbasaur'
  name: string; // Отображаемое имя
  image: any; // Здесь мы храним require(), т.к. этот файл не будет сериализоваться
  evolvesTo?: string; // ID покемона, в которого он эволюционирует
  evolutionLevel?: number; // Уровень, на котором происходит эволюция
  evolutionStage: number;
}

// Наш "словарь" или "справочник" покемонов.
// Ключ объекта - это ID покемона для быстрого доступа.
export const pokemonDatabase: Record<string, PokemonData> = {
  'eevee': {
    id: 'eevee',
    name: 'Иивии',
    image: require('../assets/images/eevee1.png'), // Предполагается, что у вас есть картинки 001.png, 002.png и т.д.
    evolvesTo: 'espeon',
    evolutionLevel: 5,
    evolutionStage: 1,
  },
  'espeon': {
    id: 'espeon',
    name: 'Эспион',
    image: require('../assets/images/eevee2.png'),
    evolvesTo: 'umbreon',
    evolutionLevel: 10,
    evolutionStage: 2,
  },
  'umbreon': {
    id: 'umbreon',
    name: 'Умбреон',
    image: require('../assets/images/eevee3.png'),
    evolutionLevel: 18,
    evolutionStage: 3,
  },
  'sylveon': {
    id: 'sylveon',
    name: 'Сильвеон',
    image: require('../assets/images/eevee4.png'),
    evolutionLevel: 18,
    evolutionStage: 3,
  }
  // ... сюда можно добавить других покемонов
};