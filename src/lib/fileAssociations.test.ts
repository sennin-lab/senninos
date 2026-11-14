import { describe, expect, it } from 'vitest';
import { getExtension, resolveFileOpener } from './fileAssociations';

describe('getExtension', () => {
  it('returns lowercase extensions and ignores dotfiles', () => {
    expect(getExtension('Readme.TXT')).toBe('txt');
    expect(getExtension('.gitignore')).toBe('');
    expect(getExtension('name.')).toBe('');
    expect(getExtension('archive.tar.gz')).toBe('gz');
  });
});

describe('resolveFileOpener', () => {
  it('opens text files in Notepad', () => {
    expect(resolveFileOpener('notes.txt')?.appId).toBe('notepad');
    expect(resolveFileOpener('LICENSE')?.appId).toBe('notepad');
  });

  it('opens code files in the code editor', () => {
    expect(resolveFileOpener('App.tsx')?.appId).toBe('codeeditor');
    expect(resolveFileOpener('index.html')?.appId).toBe('codeeditor');
  });

  it('opens images and Senni documents in their viewers', () => {
    expect(resolveFileOpener('photo.PNG')?.appId).toBe('imageviewer');
    expect(resolveFileOpener('report.sdoc')?.appId).toBe('documentviewer');
  });

  it('returns null for formats this desktop cannot open', () => {
    expect(resolveFileOpener('track01.mp3')).toBeNull();
    expect(resolveFileOpener('sheet.xlsx')).toBeNull();
  });
});
