import { recalculateStats } from '../upgrades';

describe('recalculateStats', () => {
  it('should return base stats when no upgrades are purchased', () => {
    const upgrades = {};
    const stats = recalculateStats(upgrades);
    
    expect(stats.newEnergyPerClick).toBe(1);
    expect(stats.newEnergyPerSecond).toBe(0);
  });

  it('should correctly calculate energy per click with upgrades', () => {
    
    const upgrades = { 'stronger_click': 3 }; 
    const stats = recalculateStats(upgrades);

    
    expect(stats.newEnergyPerClick).toBe(4);
    expect(stats.newEnergyPerSecond).toBe(0);
  });

  it('should correctly calculate energy per second based on energy per click', () => {
    
    const upgrades = { 'stronger_click': 2, 'pikachu_helper': 1 };
    const stats = recalculateStats(upgrades);

    
    expect(stats.newEnergyPerClick).toBe(3);
    
    expect(stats.newEnergyPerSecond).toBeCloseTo(0.3); 
  });

  it('should have zero passive income if click is upgraded but passive is not', () => {
    const upgrades = { 'stronger_click': 10 };
    const stats = recalculateStats(upgrades);
    
    expect(stats.newEnergyPerClick).toBe(11);
    expect(stats.newEnergyPerSecond).toBe(0);
  });
});