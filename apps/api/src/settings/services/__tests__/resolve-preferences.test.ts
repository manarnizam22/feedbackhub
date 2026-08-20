import { describe, expect, it } from 'vitest';

import { DEFAULT_PREFERENCES, resolvePreferences } from '../resolve-preferences.js';

describe('resolvePreferences', () => {
  it('missing row resolves to pure defaults', () => {
    expect(resolvePreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });

  it('stored overrides win over defaults', () => {
    const resolved = resolvePreferences({
      theme: 'dark',
      language: 'de',
      defaultSort: 'votes',
      defaultFilters: { categoryId: 'a1000000-0000-4000-8000-000000000001' },
      notifyOnComment: false,
    });
    expect(resolved.theme).toBe('dark');
    expect(resolved.language).toBe('de');
    expect(resolved.defaultSort).toBe('votes');
    expect(resolved.defaultFilters.categoryId).toBe('a1000000-0000-4000-8000-000000000001');
    expect(resolved.notifyOnComment).toBe(false);
  });

  it('unknown stored values fall back to defaults instead of breaking the client', () => {
    const resolved = resolvePreferences({
      theme: 'hotdog',
      language: '',
      defaultSort: 'random',
      defaultFilters: 'garbage',
      notifyOnComment: true,
    });
    expect(resolved.theme).toBe('system');
    expect(resolved.language).toBe('en');
    expect(resolved.defaultSort).toBe('newest');
    expect(resolved.defaultFilters).toEqual({});
  });
});
