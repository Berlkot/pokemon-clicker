export type MinigameReward = 
  | { type: 'xp_boost'; value: number } 
  | { type: 'buff'; buffType: 'xp_multiplier' | 'crit_chance_boost'; multiplier: number; duration: number }; 


interface MinigameData {
  name: string;
  instructions: string;
  id: string; 
  type: 'whack-a-mole' | 'simon-says' | 'connect-pairs';
  
}

export const minigameDatabase: Record<string, MinigameData> = {
  'umbreon': {
    id: 'umbreon',
    type: 'whack-a-mole',
    name: 'Магия Эспеона',
    instructions: 'Запомни и повтори последовательность свечения кристаллов!',
  },
  'espeon': {
    id: 'espeon',
    type: 'simon-says',
    name: 'Магия Эспеона',
    instructions: 'Запомни и повтори последовательность свечения кристаллов!',
  },
  'sylveon': {
    id: 'sylveon',
    type: 'connect-pairs',
    name: 'Ленты Сильвеона',
    instructions: 'Соедини бантики одного цвета. Следи, чтобы ленты не пересекались друг с другом!',
  },
};