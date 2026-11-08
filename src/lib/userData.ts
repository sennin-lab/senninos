// ユーザーごとのデータを、このブラウザの localStorage に保存します（外部サービスは使いません）。
import type { FSNode } from '@/lib/fs';

export interface UserSettings {
  wallpaperId: string;
  installedApps: string[];
}

export const defaultSettings: UserSettings = { wallpaperId: 'mountain', installedApps: [] };

const treeKey = (userId: string) => `senninos-fs:${userId}`;
const settingsKey = (userId: string) => `senninos-settings:${userId}`;

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** 保存できたら true。容量超過や保存領域の無効化では false。 */
function writeStored(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadFileSystem(userId: string): FSNode | null {
  const tree = readStored<FSNode>(treeKey(userId));
  return tree && tree.type === 'folder' && tree.children ? tree : null;
}

export function saveFileSystem(userId: string, tree: FSNode): boolean {
  return writeStored(treeKey(userId), tree);
}

export function loadSettings(userId: string): UserSettings {
  const stored = readStored<Partial<UserSettings>>(settingsKey(userId));
  return {
    wallpaperId: typeof stored?.wallpaperId === 'string' ? stored.wallpaperId : defaultSettings.wallpaperId,
    installedApps: Array.isArray(stored?.installedApps) ? stored.installedApps : defaultSettings.installedApps,
  };
}

export function saveSettings(userId: string, settings: UserSettings): boolean {
  return writeStored(settingsKey(userId), settings);
}
