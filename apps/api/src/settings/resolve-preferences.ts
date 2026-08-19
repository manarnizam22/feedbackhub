import type { Preferences } from '@feedbackhub/types';

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  language: 'en',
  defaultSort: 'newest',
  defaultFilters: {},
  notifyOnComment: true,
};

type PreferencesRow = {
  theme: string;
  language: string;
  defaultSort: string;
  defaultFilters: unknown;
  notifyOnComment: boolean;
} | null;

/* Server-side resolution (ADR-0009): global defaults overlaid with whatever the
   user has stored. A missing row means pure defaults; unknown stored values fall
   back to the default rather than breaking the client. */
export function resolvePreferences(row: PreferencesRow): Preferences {
  if (!row) {
    return DEFAULT_PREFERENCES;
  }
  const theme = (['light', 'dark', 'system'] as const).find((v) => v === row.theme);
  const defaultSort = (['newest', 'oldest', 'votes', 'comments'] as const).find(
    (v) => v === row.defaultSort,
  );
  const filters =
    typeof row.defaultFilters === 'object' && row.defaultFilters !== null
      ? (row.defaultFilters as Preferences['defaultFilters'])
      : DEFAULT_PREFERENCES.defaultFilters;
  return {
    theme: theme ?? DEFAULT_PREFERENCES.theme,
    language: row.language || DEFAULT_PREFERENCES.language,
    defaultSort: defaultSort ?? DEFAULT_PREFERENCES.defaultSort,
    defaultFilters: filters,
    notifyOnComment: row.notifyOnComment,
  };
}
