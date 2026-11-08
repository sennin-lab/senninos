import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { FSNode } from '@/lib/fs';

export interface UserSettings {
  wallpaperId: string;
  installedApps: string[];
}

export const defaultSettings: UserSettings = { wallpaperId: 'mountain', installedApps: [] };

const treeKey = (userId: string) => `senninos-fs:${userId}`;
const dirtyKey = (userId: string) => `senninos-fs-dirty:${userId}`;
const settingsKey = (userId: string) => `senninos-settings:${userId}`;

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readCachedFileSystem(userId: string): FSNode | null {
  const tree = readStored<FSNode>(treeKey(userId));
  return tree && tree.type === 'folder' && tree.children ? tree : null;
}

export function cacheFileSystem(userId: string, tree: FSNode): void {
  if (!writeStored(treeKey(userId), tree)) {
    toast.error('ファイルを保存できません。ブラウザの空き容量を確認してください');
  }
}

export function isFileSystemDirty(userId: string): boolean {
  return localStorage.getItem(dirtyKey(userId)) === '1';
}

export function markFileSystemDirty(userId: string): void {
  localStorage.setItem(dirtyKey(userId), '1');
}

export function clearFileSystemDirty(userId: string): void {
  localStorage.removeItem(dirtyKey(userId));
}

export async function loadFileSystem(userId: string): Promise<FSNode | null> {
  const { data, error } = await supabase
    .from('user_filesystems')
    .select('tree')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const tree = data?.tree as unknown as FSNode | undefined;
  return tree && tree.type === 'folder' && tree.children ? tree : null;
}

export async function saveFileSystem(userId: string, tree: FSNode): Promise<void> {
  const { error } = await supabase
    .from('user_filesystems')
    .upsert({ user_id: userId, tree: tree as unknown as Json }, { onConflict: 'user_id' });
  if (error) throw error;
}

export function readCachedSettings(userId: string): UserSettings | null {
  return readStored<UserSettings>(settingsKey(userId));
}

export function cacheSettings(userId: string, settings: UserSettings): void {
  writeStored(settingsKey(userId), settings);
}

export async function loadSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('wallpaper_id, installed_apps')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return defaultSettings;
  return { wallpaperId: data.wallpaper_id, installedApps: data.installed_apps };
}

export async function saveSettings(userId: string, patch: Partial<UserSettings>): Promise<void> {
  const row: { user_id: string; wallpaper_id?: string; installed_apps?: string[] } = { user_id: userId };
  if (patch.wallpaperId !== undefined) row.wallpaper_id = patch.wallpaperId;
  if (patch.installedApps !== undefined) row.installed_apps = patch.installedApps;
  const { error } = await supabase.from('user_settings').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}
