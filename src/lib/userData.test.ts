import { describe, expect, it } from 'vitest';
import { defaultSettings, normalizeSettings, normalizeTree } from './userData';

describe('normalizeSettings', () => {
  it('falls back to defaults for missing or broken values', () => {
    expect(normalizeSettings(null)).toEqual(defaultSettings);
    expect(normalizeSettings({ theme: 'neon' as never }).theme).toBe('dark');
  });

  it('keeps only string app ids', () => {
    expect(normalizeSettings({ installedApps: ['clock', 3 as never] }).installedApps).toEqual(['clock']);
  });
});

describe('normalizeTree', () => {
  it('accepts folder nodes only', () => {
    const folder = { name: '/', type: 'folder' as const, modified: '2026-01-01', children: {} };
    expect(normalizeTree(folder)).toBe(folder);
    expect(normalizeTree({ name: 'a', type: 'file', modified: '' })).toBeNull();
    expect(normalizeTree(null)).toBeNull();
  });
});
