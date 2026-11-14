// アカウントに紐づくデータの型と、読み込んだ値の検証。実際の保存・読み込みは cloudData.ts が行います。
import type { FSNode } from '@/lib/fs';

export interface UserSettings {
  wallpaperId: string;
  installedApps: string[];
  theme: 'dark' | 'light';
}

export const defaultSettings: UserSettings = { wallpaperId: 'mountain', installedApps: [], theme: 'dark' };

/** サーバーから受け取った設定を、想定どおりの形に整えます（壊れた値は既定値に戻す）。 */
export function normalizeSettings(input: Partial<UserSettings> | null | undefined): UserSettings {
  return {
    wallpaperId: typeof input?.wallpaperId === 'string' && input.wallpaperId ? input.wallpaperId : defaultSettings.wallpaperId,
    installedApps: Array.isArray(input?.installedApps)
      ? input.installedApps.filter((id): id is string => typeof id === 'string')
      : defaultSettings.installedApps,
    theme: input?.theme === 'light' ? 'light' : 'dark',
  };
}

/** フォルダー構造として使えるものだけを返します。それ以外は null。 */
export function normalizeTree(value: unknown): FSNode | null {
  if (!value || typeof value !== 'object') return null;
  const node = value as FSNode;
  return node.type === 'folder' && node.children && typeof node.children === 'object' ? node : null;
}
