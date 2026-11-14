import { CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BootScreen from '@/components/os/BootScreen';
import Desktop from '@/components/os/Desktop';
import { useAccountData } from '@/hooks/useAccountData';
import type { AccountUser } from '@/lib/accountAuth';

interface AccountSessionProps {
  user: AccountUser;
  onSignOut: () => Promise<void>;
}

/** サインイン中のアカウントのデータを読み込み、準備できたらデスクトップを表示します。 */
export default function AccountSession({ user, onSignOut }: AccountSessionProps) {
  const { state, retry } = useAccountData(user.id);

  if (state.status === 'loading') {
    return <BootScreen message="アカウントのデータを読み込んでいます" />;
  }

  if (state.status === 'error') {
    return (
      <div className="w-screen h-[100dvh] flex items-center justify-center bg-background p-6">
        <div className="ios-glass max-w-sm w-full rounded-2xl p-6 text-center space-y-4">
          <CloudOff className="mx-auto text-muted-foreground" size={36} />
          <h2 className="text-base font-semibold">データを読み込めませんでした</h2>
          <p className="text-xs text-muted-foreground break-words">{state.message}</p>
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={retry}><RefreshCw size={14} />再試行</Button>
            <Button size="sm" variant="secondary" onClick={() => void onSignOut()}><LogOut size={14} />サインアウト</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Desktop
      userName={user.username}
      initialFs={state.data.fs}
      initialSettings={state.data.settings}
      syncer={state.syncer}
      onSignOut={async () => {
        // サインアウト前に未送信の変更をすべて保存する
        await state.syncer.flush();
        await onSignOut();
      }}
    />
  );
}
