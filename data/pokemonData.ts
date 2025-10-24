
export interface PokemonData {
  id: string; 
  name: string; 
  image: any; 
  evolvesTo?: string; 
  evolutionLevel?: number; 
  evolutionStage: number;
  cry?: any;
}



export const pokemonDatabase: Record<string, PokemonData> = {
  'eevee': {
    id: 'eevee',
    name: 'Иивии',
    image: require('../assets/images/eevee1.png'), 
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
    cry: require('../assets/sounds/cries/espeon.mp3'),
  },
  'umbreon': {
    id: 'umbreon',
    name: 'Умбреон',
    evolvesTo: 'sylveon',
    image: require('../assets/images/eevee3.png'),
    evolutionLevel: 18,
    evolutionStage: 3,
    cry: require('../assets/sounds/cries/umbreon.mp3'),
  },
  'sylveon': {
    id: 'sylveon',
    name: 'Сильвеон',
    image: require('../assets/images/eevee4.png'),
    evolutionLevel: 25,
    evolutionStage: 4,
    cry: require('../assets/sounds/cries/sylveon.mp3'),
  }
};