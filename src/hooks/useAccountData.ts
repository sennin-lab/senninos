import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createAccountSyncer, fetchAccountData, type AccountData, type AccountSyncer } from '@/lib/cloudData';

const SYNC_TOAST_ID = 'cloud-sync';

type AccountState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: AccountData; syncer: AccountSyncer };

/** サインインしたユーザーのデータを Supabase から読み込み、変更を同期します。 */
export function useAccountData(userId: string) {
  const [state, setState] = useState<AccountState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchAccountData(userId)
      .then(data => {
        if (cancelled) return;
        const syncer = createAccountSyncer(userId, (ok, message) => {
          if (ok) {
            toast.dismiss(SYNC_TOAST_ID);
          } else {
            toast.error(`クラウドへの保存に失敗しました。自動で再試行します（${message ?? ''}）`, { id: SYNC_TOAST_ID, duration: 6000 });
          }
        });
        if (data.needsSync) syncer.queueFileSystem(data.fs);
        setState({ status: 'ready', data, syncer });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : '通信に失敗しました' });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const syncer = state.status === 'ready' ? state.syncer : null;

  // ページを閉じる・タブを隠す・アンマウントのタイミングで未送信の変更を送信します
  useEffect(() => {
    if (!syncer) return;
    const flush = () => { void syncer.flush(); };
    const handleVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibility);
      flush();
    };
  }, [syncer]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt(value => value + 1);
  };

  return { state, retry };
}
