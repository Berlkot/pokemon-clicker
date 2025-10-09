export interface Upgrade {
  id: string;
  title: string;
  description: string;
  baseCost: number; // Начальная стоимость
  effect: {
    type: 'add_click' | 'add_passive'; // Тип эффекта
    value: number; // На сколько увеличивать
  };
}

export const upgradesDatabase: Record<string, Upgrade> = {
  'stronger_click': {
    id: 'stronger_click',
    title: 'Усиленный клик',
    description: '+1 к энергии за клик',
    baseCost: 100,
    effect: {
      type: 'add_click',
      value: 1,
    },
  },
  'pikachu_helper': {
    id: 'pikachu_helper',
    title: 'Помощник Пикачу',
    description: '+1 к энергии в секунду',
    baseCost: 500,
    effect: {
      type: 'add_passive',
      value: 1,
    },
  },
  // Добавьте другие улучшения здесь
};