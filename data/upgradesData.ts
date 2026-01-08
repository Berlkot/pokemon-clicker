export interface Upgrade {
  id: string
  title: string
  description: string
  baseCost: number,
  icon: string,
  effect: {
    type:
      | 'add_to_click'
      | 'add_passive_from_click_percentage'
      | 'add_to_xp_click'
      | 'add_xp_passive_from_xp_click_percentage'
    value: number
  }
}

export const upgradesDatabase: Record<string, Upgrade> = {
  stronger_click: {
    id: 'stronger_click',
    icon: 'hand-pointer',
    title: 'Усиленный клик',
    description: '+1 к энергии за клик',
    baseCost: 75, 
    effect: { type: 'add_to_click', value: 1 },
  },

  pikachu_helper: {
    id: 'pikachu_helper',
    icon: 'bolt',
    title: 'Помощник Пикачу',
    description: 'Пассивно генерирует 10% от вашей силы клика в секунду',
    baseCost: 350, 
    effect: { type: 'add_passive_from_click_percentage', value: 0.1 },
  },

  trainer_study: {
    id: 'trainer_study',
    icon: 'atlas',
    title: 'Тренерская подготовка',
    description: '+1 к опыту за клик',
    baseCost: 120,
    effect: { type: 'add_to_xp_click', value: 1 },
  },
  xp_helper: {
    id: 'xp_helper',
    icon: 'black-tie',
    title: 'Наставник',
    description: 'Пассивно генерирует 5% от вашего XP за клик в секунду',
    baseCost: 450,
    effect: { type: 'add_xp_passive_from_xp_click_percentage', value: 0.05 },
  },
}
