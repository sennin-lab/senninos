import { describe, expect, it } from 'vitest';
import {
  DOCUMENTS_DIR, byteLength, createDefaultFS, formatSize, listChildren, makeDirectoryNode, normalizePath,
  readFileContent, removeNode, resolveNode, writeFileNode,
} from './fs';

const date = '2026-01-02';

describe('normalizePath', () => {
  it('resolves relative and parent segments against the working directory', () => {
    expect(normalizePath('/Users/User', '../Documents')).toBe('/Users/Documents');
    expect(normalizePath('/Users/User', './Desktop/')).toBe('/Users/User/Desktop');
    expect(normalizePath('/Users/User', '')).toBe('/Users/User');
  });
  it('accepts Windows-style absolute paths', () => {
    expect(normalizePath('/Users/User', 'C:\\Users\\User\\Desktop')).toBe('/Users/User/Desktop');
    expect(normalizePath('/Users/User', 'C:\\')).toBe('/');
  });
});

describe('virtual file system', () => {
  it('ships a default home with documents', () => {
    const root = createDefaultFS(date);
    expect(readFileContent(root, `${DOCUMENTS_DIR}/readme.txt`)).toContain('Welcome to SenniNOS!');
    expect(resolveNode(root, '/Users/User/Missing')).toBeNull();
  });
  it('creates missing folders when writing a file without mutating the original tree', () => {
    const root = createDefaultFS(date);
    const next = writeFileNode(root, '/Users/User/Notes/2026/plan.txt', 'hello', date);
    expect(readFileContent(next, '/Users/User/Notes/2026/plan.txt')).toBe('hello');
    expect(resolveNode(root, '/Users/User/Notes')).toBeNull();
  });
  it('refuses to overwrite a folder with a file and to write through a file', () => {
    const root = createDefaultFS(date);
    expect(() => writeFileNode(root, '/Users/User/Documents', 'x', date)).toThrow('フォルダーです');
    expect(() => writeFileNode(root, '/Users/User/Documents/readme.txt/inner.txt', 'x', date)).toThrow('フォルダーではありません');
  });
  it('removes files and reports missing targets', () => {
    const root = createDefaultFS(date);
    const next = removeNode(root, '/Users/User/Documents/notes.txt', date);
    expect(resolveNode(next, '/Users/User/Documents/notes.txt')).toBeNull();
    expect(() => removeNode(root, '/Users/User/nothing.txt', date)).toThrow('見つかりませんでした');
    expect(() => removeNode(root, '/', date)).toThrow('削除できません');
  });
  it('lists folders before files in natural order', () => {
    const root = writeFileNode(makeDirectoryNode(createDefaultFS(date), '/Users/User/Zeta', date), '/Users/User/aaa.txt', 'a', date);
    const names = listChildren(root, '/Users/User').map(node => node.name);
    expect(names.slice(0, 2)).toEqual(['Desktop', 'Documents']);
    expect(names.indexOf('Zeta')).toBeLessThan(names.indexOf('aaa.txt'));
  });
  it('measures UTF-8 bytes and formats sizes', () => {
    expect(byteLength('あ')).toBe(3);
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(undefined)).toBe('--');
  });
});
