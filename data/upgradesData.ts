export interface Upgrade {
  id: string;
  title: string;
  description: string;
  baseCost: number; // Начальная стоимость
  effect: {
    // Изменим тип на более конкретный
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
      type: 'add_to_click', // <-- Старый тип
      value: 1,
    },
  },
  'pikachu_helper': {
    id: 'pikachu_helper',
    title: 'Помощник Пикачу',
    // <-- Новое описание, объясняющее механику
    description: 'Пассивно генерирует 10% от вашей силы клика в секунду', 
    baseCost: 500,
    effect: {
      type: 'add_passive_from_click_percentage', // <-- Новый тип
      value: 0.1, // <-- 10%
    },
  },
};