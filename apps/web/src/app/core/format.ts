const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
];

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' });

export function relativeTime(iso: string): string {
  const delta = new Date(iso).getTime() - Date.now();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(delta) >= ms) {
      return formatter.format(Math.round(delta / ms), unit);
    }
  }
  return 'just now';
}
