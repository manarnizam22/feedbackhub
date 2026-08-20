import type { Preferences } from '@feedbackhub/types';

const media = window.matchMedia('(prefers-color-scheme: dark)');
let current: Preferences['theme'] = 'system';

function render(): void {
  const dark = current === 'dark' || (current === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
}

media.addEventListener('change', render);

export function applyTheme(theme: Preferences['theme']): void {
  current = theme;
  render();
}
