// utils/formatNumber.ts

// Суффиксы для тысяч, миллионов, миллиардов и т.д.
const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx"];

export function formatNumber(number: number): string {
  // Обработка особых случаев, например, при загрузке
  if (number === null || typeof number === 'undefined') {
    return '0';
  }

  // Если число достаточно маленькое, просто округляем и возвращаем
  if (number < 1000) {
    return Math.floor(number).toString();
  }

  // Вычисляем, какой суффикс использовать, на основе количества разрядов
  const tier = Math.floor(Math.log10(number) / 3);

  // Если число слишком большое, показываем в экспоненциальной форме
  if (tier >= SUFFIXES.length) {
    return number.toExponential(2);
  }

  // Получаем нужный суффикс (K, M, B...)
  const suffix = SUFFIXES[tier];
  
  // Масштабируем число (например, 1 500 000 / 1 000 000 = 1.5)
  const scale = Math.pow(10, tier * 3);
  const scaled = number / scale;

  // Возвращаем отформатированную строку с 2 знаками после запятой
  return scaled.toFixed(2) + suffix;
}