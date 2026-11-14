// アカウントごとのデータ（ファイル構成・設定）を Supabase と同期します。
// - 読み込み: 初回ログイン時にサーバーから取得し、無ければ既定値を作成します。
// - 保存: 変更はまず端末に退避し（閉じても失われないように）、少し待ってからまとめて送信します。
// - 競合: アカウントごとに 1 端末で使う想定の last-write-wins です。
import { createDefaultFS, today, type FSNode } from '@/lib/fs';
import { supabase } from '@/lib/supabase';
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
    // 端末の容量が足りない場合はクラウド送信だけに頼る
  }
}

function clearPendingFs(userId: string): void {
  try {
    localStorage.removeItem(pendingFsKey(userId));
  } catch {
    // 何もしない（次回読み込み時に同じ内容を送り直すだけ）
  }
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function fetchAccountData(userId: string): Promise<AccountData> {
  const [fsResult, settingsResult] = await Promise.all([
    supabase.from('user_filesystems').select('tree').eq('user_id', userId).maybeSingle(),
    supabase.from('user_settings').select('wallpaper_id, installed_apps, theme').eq('user_id', userId).maybeSingle(),
  ]);
  assertNoError(fsResult.error);
  assertNoError(settingsResult.error);

  const pending = readPendingFs(userId);
  const cloudTree = normalizeTree(fsResult.data?.tree);

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

  const row = settingsResult.data as { wallpaper_id: string; installed_apps: string[]; theme: string } | null;
  const settings = row
    ? normalizeSettings({ wallpaperId: row.wallpaper_id, installedApps: row.installed_apps, theme: row.theme as UserSettings['theme'] })
    : defaultSettings;

  return { fs, settings, needsSync };
}

async function saveFileSystem(userId: string, tree: FSNode): Promise<void> {
  const { error } = await supabase
    .from('user_filesystems')
    .upsert({ user_id: userId, tree }, { onConflict: 'user_id' });
  assertNoError(error);
}

async function saveSettings(userId: string, settings: UserSettings): Promise<void> {
  const { error } = await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      wallpaper_id: settings.wallpaperId,
      installed_apps: settings.installedApps,
      theme: settings.theme,
    },
    { onConflict: 'user_id' },
  );
  assertNoError(error);
}

/**
 * 変更を一定時間まとめて送信する同期オブジェクトを作ります。
 * 送信は直列（前の保存が終わってから次を送る）なので、古い内容で新しい内容を上書きしません。
 */
export function createAccountSyncer(
  userId: string,
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
        await saveFileSystem(userId, snapshot.tree);
        // 送信中に新しい変更が入っていなければ、端末の退避データを消す
        if (snapshot.version === fsVersion) clearPendingFs(userId);
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
        await saveSettings(userId, snapshot);
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
      writePendingFs(userId, tree);
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
