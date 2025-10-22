const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx"];

export function formatNumber(number: number): string {
  if (number === null || typeof number === 'undefined') {
    return '0';
  }

  // Для очень маленьких чисел, показываем как есть или с 2 знаками
  if (number < 1000) {
    if (number > 0 && number % 1 !== 0) {
      return number.toFixed(2);
    }
    return Math.floor(number).toString();
  }

  // --- ЛОГИКА ОПРЕДЕЛЕНИЯ РАЗРЯДА ---
  let tier = Math.floor(Math.log10(number) / 3);
  
  // Масштабируем число
  let scaled = number / Math.pow(10, tier * 3);

  // Если после масштабирования и округления мы получили 1000 или больше
  // (например, для 999_999 scaled будет 999.99, а для 999_995 он округлится до 1000.00),
  // то мы переходим на следующий разряд.
  if (parseFloat(scaled.toFixed(2)) >= 1000) {
    scaled /= 1000;
    tier += 1;
  }
  
  // Если число слишком большое, показываем в экспоненциальной форме
  if (tier >= SUFFIXES.length) {
    return number.toExponential(2);
  }

  const suffix = SUFFIXES[tier];

  return scaled.toFixed(2) + suffix;
}