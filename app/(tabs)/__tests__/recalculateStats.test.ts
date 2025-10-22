import { recalculateStats } from '../upgrades';

describe('recalculateStats', () => {
  it('should return base stats when no upgrades are purchased', () => {
    const upgrades = {};
    const stats = recalculateStats(upgrades);
    
    expect(stats.newEnergyPerClick).toBe(1);
    expect(stats.newEnergyPerSecond).toBe(0);
  });

  it('should correctly calculate energy per click with upgrades', () => {
    // 3 апгрейда "stronger_click"
    const upgrades = { 'stronger_click': 3 }; 
    const stats = recalculateStats(upgrades);

    // Базовый 1 + 3 * 1 = 4
    expect(stats.newEnergyPerClick).toBe(4);
    expect(stats.newEnergyPerSecond).toBe(0);
  });

  it('should correctly calculate energy per second based on energy per click', () => {
    // 2 апгрейда клика и 1 апгрейд пассивки
    const upgrades = { 'stronger_click': 2, 'pikachu_helper': 1 };
    const stats = recalculateStats(upgrades);

    // Сила клика = 1 (база) + 2 = 3
    expect(stats.newEnergyPerClick).toBe(3);
    // Пассивный доход = 1 (уровень) * 0.1 (эффект) * 3 (сила клика) = 0.3
    expect(stats.newEnergyPerSecond).toBeCloseTo(0.3); // Используем .toBeCloseTo() для чисел с плавающей точкой
  });

  it('should have zero passive income if click is upgraded but passive is not', () => {
    const upgrades = { 'stronger_click': 10 };
    const stats = recalculateStats(upgrades);
    
    expect(stats.newEnergyPerClick).toBe(11);
    expect(stats.newEnergyPerSecond).toBe(0);
  });
});