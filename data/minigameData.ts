export type MinigameReward = 
  | { type: 'xp_boost'; value: number } 
  | { type: 'buff'; buffType: 'xp_multiplier' | 'crit_chance_boost'; multiplier: number; duration: number }; 


interface MinigameData {
  id: string; 
  type: 'whack-a-mole' | 'simon-says' | 'connect-pairs';
  
}

export const minigameDatabase: Record<string, MinigameData> = {
  'umbreon': {
    id: 'umbreon',
    type: 'whack-a-mole',
  },
  'espeon': {
    id: 'espeon',
    type: 'simon-says',
  },
  'sylveon': {
    id: 'sylveon',
    type: 'connect-pairs',
  },
};