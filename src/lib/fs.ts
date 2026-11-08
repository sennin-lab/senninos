export interface FSNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  size?: number;
  modified: string;
  children?: Record<string, FSNode>;
}

export class FsError extends Error {}

export const HOME_DIR = '/Users/User';
export const DEFAULT_CWD = HOME_DIR;
export const DESKTOP_DIR = `${HOME_DIR}/Desktop`;
export const DOCUMENTS_DIR = `${HOME_DIR}/Documents`;
export const DOWNLOADS_DIR = `${HOME_DIR}/Downloads`;
export const PICTURES_DIR = `${HOME_DIR}/Pictures`;
export const MUSIC_DIR = `${HOME_DIR}/Music`;
export const VIDEOS_DIR = `${HOME_DIR}/Videos`;

const pad = (value: number) => String(value).padStart(2, '0');

export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function formatSize(bytes?: number): string {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

export const splitSegments = (path: string): string[] => path.split('/').filter(Boolean);

export function normalizePath(cwd: string, target: string): string {
  const unified = target.replace(/\\/g, '/');
  const absolute = unified.startsWith('/') || /^[A-Za-z]:/.test(unified);
  const relative = unified.replace(/^[A-Za-z]:/, '');
  const base = absolute ? [] : splitSegments(cwd);
  for (const part of splitSegments(relative)) {
    if (part === '..') base.pop();
    else if (part !== '.') base.push(part);
  }
  return `/${base.join('/')}`;
}

export function createFolder(name: string, date: string): FSNode {
  return { name, type: 'folder', modified: date, children: {} };
}

export function createFile(name: string, content: string, date: string): FSNode {
  return { name, type: 'file', content, size: byteLength(content), modified: date };
}

function createPlaceholder(name: string, size: number, date: string): FSNode {
  return { name, type: 'file', size, modified: date };
}

export function createDefaultFS(date = today()): FSNode {
  const userHome: FSNode = {
    name: 'User',
    type: 'folder',
    modified: date,
    children: {
      Desktop: createFolder('Desktop', date),
      Documents: {
        ...createFolder('Documents', date),
        children: {
          'readme.txt': createFile('readme.txt', 'Welcome to SenniNOS!\nこのフォルダーにドキュメントや表計算などを保存できます。', date),
          'notes.txt': createFile('notes.txt', 'Important notes go here.', date),
        },
      },
      Downloads: createFolder('Downloads', date),
      Music: { ...createFolder('Music', date), children: { 'track01.mp3': createPlaceholder('track01.mp3', 4200000, date) } },
      Pictures: {
        ...createFolder('Pictures', date),
        children: {
          'wallpaper.jpg': createPlaceholder('wallpaper.jpg', 2100000, date),
          'screenshot.png': createPlaceholder('screenshot.png', 890000, date),
        },
      },
      Videos: { ...createFolder('Videos', date), children: { 'demo.mp4': createPlaceholder('demo.mp4', 24000000, date) } },
    },
  };
  return {
    name: '/',
    type: 'folder',
    modified: date,
    children: {
      Users: { ...createFolder('Users', date), children: { User: userHome } },
      'Program Files': { ...createFolder('Program Files', date), children: { SenniNOS: createFolder('SenniNOS', date) } },
      System: {
        ...createFolder('System', date),
        children: { 'config.sys': createFile('config.sys', 'OS=SenniNOS\nVERSION=1.0.0\nKERNEL=WebKernel', date) },
      },
    },
  };
}

export function resolveNode(root: FSNode, path: string): FSNode | null {
  let current: FSNode = root;
  for (const part of splitSegments(path)) {
    if (current.type !== 'folder' || !current.children?.[part]) return null;
    current = current.children[part];
  }
  return current;
}

export function listChildren(root: FSNode, path: string): FSNode[] {
  const node = resolveNode(root, path);
  if (!node || node.type !== 'folder') return [];
  return Object.values(node.children ?? {}).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, 'ja');
  });
}

export function readFileContent(root: FSNode, path: string): string | null {
  const node = resolveNode(root, path);
  if (!node || node.type !== 'file') return null;
  return node.content ?? '';
}

function mutate(node: FSNode, parts: string[], date: string, apply: (folder: FSNode) => FSNode): FSNode {
  if (parts.length === 0) return apply(node);
  const [head, ...rest] = parts;
  const existing = node.children?.[head];
  if (existing && existing.type !== 'folder') throw new FsError(`${head} はフォルダーではありません`);
  const child = mutate(existing ?? createFolder(head, date), rest, date, apply);
  return { ...node, modified: date, children: { ...node.children, [head]: child } };
}

export function writeFileNode(root: FSNode, path: string, content: string, date = today()): FSNode {
  const parts = splitSegments(path);
  const name = parts.pop();
  if (!name) throw new FsError('ファイル名を指定してください');
  return mutate(root, parts, date, folder => {
    if (folder.children?.[name]?.type === 'folder') throw new FsError(`${name} はフォルダーです`);
    return { ...folder, modified: date, children: { ...folder.children, [name]: createFile(name, content, date) } };
  });
}

export function makeDirectoryNode(root: FSNode, path: string, date = today()): FSNode {
  return mutate(root, splitSegments(path), date, folder => folder);
}

export function removeNode(root: FSNode, path: string, date = today()): FSNode {
  const parts = splitSegments(path);
  const name = parts.pop();
  if (!name) throw new FsError('ルートフォルダーは削除できません');
  const parent = resolveNode(root, `/${parts.join('/')}`);
  if (!parent || parent.type !== 'folder' || !parent.children?.[name]) throw new FsError(`${path}: 見つかりませんでした`);
  return mutate(root, parts, date, folder => {
    const { [name]: _removed, ...remaining } = folder.children ?? {};
    return { ...folder, modified: date, children: remaining };
  });
}
