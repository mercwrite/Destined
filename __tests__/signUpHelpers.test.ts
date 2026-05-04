// Tests for pure helpers duplicated here (sign-up.tsx inlines them)
function calcAge(year: string, month: string, day: string): number {
  const dob = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function isValidDate(year: string, month: string, day: string): boolean {
  const y = parseInt(year, 10);
  const mo = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (isNaN(y) || isNaN(mo) || isNaN(d)) return false;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

describe('isValidDate', () => {
  it('returns true for a valid date', () => {
    expect(isValidDate('1995', '3', '15')).toBe(true);
  });
  it('returns false for Feb 30', () => {
    expect(isValidDate('2000', '2', '30')).toBe(false);
  });
  it('returns false for month 13', () => {
    expect(isValidDate('2000', '13', '1')).toBe(false);
  });
  it('returns false for empty strings', () => {
    expect(isValidDate('', '', '')).toBe(false);
  });
  it('returns false for day 0', () => {
    expect(isValidDate('2000', '1', '0')).toBe(false);
  });
});

describe('calcAge', () => {
  it('returns a positive age for a past birth year', () => {
    expect(calcAge('1990', '5', '15')).toBeGreaterThan(0);
  });
  it('returns age < 18 for someone born 10 years ago', () => {
    const year = String(new Date().getFullYear() - 10);
    expect(calcAge(year, '6', '15')).toBeLessThan(18);
  });
  it('returns age >= 18 for someone born 25 years ago', () => {
    const year = String(new Date().getFullYear() - 25);
    expect(calcAge(year, '1', '1')).toBeGreaterThanOrEqual(18);
  });
});
