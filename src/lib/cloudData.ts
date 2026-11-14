// アカウントごとのデータ（ファイル構成・設定）を Supabase と同期します（RPC 経由）。
// - 読み込み: サインイン時に取得。データが無ければ既定値を作成して保存します。
// - 保存: 変更は端末に退避してから、少し待ってまとめて送信します。
// - 競合: last-write-wins（最後に保存された内容が優先）です。
import type { AccountUser } from '@/lib/accountAuth';
import { callRpc } from '@/lib/rpc';
import { createDefaultFS, today, type FSNode } from '@/lib/fs';
import { defaultSettings, normalizeSettings, normalizeTree, type UserSettings } from '@/lib/userData';

export interface AccountData {
  fs: FSNode;
  settings: UserSettings;
  /** 端末側に未送信の変更があり、サーバーへ送り直す必要があるか */
  needsSync: boolean;
}

export interface AccountSyncer {
  queueFileSystem: (tree: FSNode) => void;
  queueSettings: (settings: UserSettings) => void;
  /** 未送信の変更をすぐに送信します（サインアウトやページを閉じる直前に使用）。 */
  flush: () => Promise<void>;
}

interface LoadedData {
  tree: unknown;
  wallpaperId: string;
  installedApps: string[];
  theme: string;
}

const DEBOUNCE_MS = 800;
const RETRY_MS = 5000;
const pendingFsKey = (userId: string) => `senninos-pending-fs:${userId}`;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : '不明なエラー');

function readPendingFs(userId: string): FSNode | null {
  try {
    return normalizeTree(JSON.parse(localStorage.getItem(pendingFsKey(userId)) ?? 'null'));
  } catch {
    return null;
  }
}

function writePendingFs(userId: string, tree: FSNode): void {
  try {
    localStorage.setItem(pendingFsKey(userId), JSON.stringify(tree));
  } catch {
    // 端末の容量が足りない場合はサーバー送信だけに頼る
  }
}

function clearPendingFs(userId: string): void {
  try {
    localStorage.removeItem(pendingFsKey(userId));
  } catch {
    // 次回読み込み時に同じ内容を送り直すだけなので無視してよい
  }
}

export async function fetchAccountData(user: AccountUser): Promise<AccountData> {
  const loaded = await callRpc<LoadedData | null>('senni_load', { p_token: user.token });

  const pending = readPendingFs(user.id);
  const cloudTree = normalizeTree(loaded?.tree);

  let fs: FSNode;
  let needsSync = false;
  if (pending) {
    // 前回の未送信分があれば、サーバーの古い内容より優先して送り直す
    fs = pending;
    needsSync = true;
  } else if (cloudTree) {
    fs = cloudTree;
  } else {
    fs = createDefaultFS(today());
    needsSync = true;
  }

  const settings = loaded
    ? normalizeSettings({ wallpaperId: loaded.wallpaperId, installedApps: loaded.installedApps, theme: loaded.theme as UserSettings['theme'] })
    : defaultSettings;

  return { fs, settings, needsSync };
}

/**
 * 変更を一定時間まとめて送信する同期オブジェクトを作ります。
 * 送信は直列（前の保存が終わってから次を送る）なので、古い内容で新しい内容を上書きしません。
 */
export function createAccountSyncer(
  user: AccountUser,
  onStatus: (ok: boolean, message?: string) => void,
): AccountSyncer {
  let fsVersion = 0;
  let pendingFs: { tree: FSNode; version: number } | null = null;
  let pendingSettings: UserSettings | null = null;
  let fsTimer: ReturnType<typeof setTimeout> | undefined;
  let settingsTimer: ReturnType<typeof setTimeout> | undefined;
  let queue: Promise<void> = Promise.resolve();

  const enqueue = (job: () => Promise<void>): Promise<void> => {
    queue = queue
      .then(job)
      .then(() => onStatus(true), (error: unknown) => onStatus(false, messageOf(error)));
    return queue;
  };

  const pushFs = (): Promise<void> => {
    clearTimeout(fsTimer);
    fsTimer = undefined;
    const snapshot = pendingFs;
    if (!snapshot) return queue;
    pendingFs = null;
    return enqueue(async () => {
      try {
        await callRpc('senni_save_fs', { p_token: user.token, p_tree: snapshot.tree });
        // 送信中に新しい変更が入っていなければ、端末の退避データを消す
        if (snapshot.version === fsVersion) clearPendingFs(user.id);
      } catch (error) {
        if (!pendingFs) pendingFs = snapshot;
        clearTimeout(fsTimer);
        fsTimer = setTimeout(pushFs, RETRY_MS);
        throw error;
      }
    });
  };

  const pushSettings = (): Promise<void> => {
    clearTimeout(settingsTimer);
    settingsTimer = undefined;
    const snapshot = pendingSettings;
    if (!snapshot) return queue;
    pendingSettings = null;
    return enqueue(async () => {
      try {
        await callRpc('senni_save_settings', {
          p_token: user.token,
          p_wallpaper_id: snapshot.wallpaperId,
          p_installed_apps: snapshot.installedApps,
          p_theme: snapshot.theme,
        });
      } catch (error) {
        if (!pendingSettings) pendingSettings = snapshot;
        clearTimeout(settingsTimer);
        settingsTimer = setTimeout(pushSettings, RETRY_MS);
        throw error;
      }
    });
  };

  return {
    queueFileSystem(tree) {
      fsVersion += 1;
      pendingFs = { tree, version: fsVersion };
      writePendingFs(user.id, tree);
      clearTimeout(fsTimer);
      fsTimer = setTimeout(pushFs, DEBOUNCE_MS);
    },
    queueSettings(settings) {
      pendingSettings = settings;
      clearTimeout(settingsTimer);
      settingsTimer = setTimeout(pushSettings, DEBOUNCE_MS);
    },
    flush() {
      pushFs();
      pushSettings();
      return queue;
    },
  };
}
