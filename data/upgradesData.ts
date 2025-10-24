export interface Upgrade {
  id: string;
  title: string;
  description: string;
  baseCost: number; 
  effect: {
    
    type: 'add_to_click' | 'add_passive_from_click_percentage'; 
    value: number;
  };
}

export const upgradesDatabase: Record<string, Upgrade> = {
  'stronger_click': {
    id: 'stronger_click',
    title: 'Усиленный клик',
    description: '+1 к энергии за клик',
    baseCost: 100,
    effect: {
      type: 'add_to_click', 
      value: 1,
    },
  },
  'pikachu_helper': {
    id: 'pikachu_helper',
    title: 'Помощник Пикачу',
    
    description: 'Пассивно генерирует 10% от вашей силы клика в секунду', 
    baseCost: 500,
    effect: {
      type: 'add_passive_from_click_percentage', 
      value: 0.1, 
    },
  },
};