import { formatNumber } from '../formatNumber';

// describe - это группа тестов для одного модуля
describe('formatNumber', () => {
  // it (или test) - это описание конкретного тестового случая
  it('should format numbers less than 1000 without a suffix', () => {
    // expect - это утверждение. Мы "ожидаем", что результат будет определенным.
    // .toBe() - это "матчер", который проверяет строгое равенство.
    expect(formatNumber(123)).toBe('123');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(0)).toBe('0');
  });

  it('should format thousands with a "K" suffix', () => {
    expect(formatNumber(1000)).toBe('1.00K');
    expect(formatNumber(12345)).toBe('12.35K');
    expect(formatNumber(999999)).toBe('1.00M'); // Jest поможет найти ошибку - 999_999 должно быть 999.99K
  });

  it('should format millions with an "M" suffix', () => {
    expect(formatNumber(1000000)).toBe('1.00M');
    expect(formatNumber(54321098)).toBe('54.32M');
  });
  
  it('should format billions with a "B" suffix', () => {
    expect(formatNumber(1230000000)).toBe('1.23B');
  });

  it('should handle edge cases and special numbers', () => {
    expect(formatNumber(1001)).toBe('1.00K');
    expect(formatNumber(null as any)).toBe('0'); // Проверяем обработку null
    expect(formatNumber(undefined as any)).toBe('0'); // Проверяем обработку undefined
  });
});