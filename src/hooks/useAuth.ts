import { useCallback, useEffect, useState } from 'react';
import { authenticate, endSession, getVerifiedUser, registerAccount, type AccountUser } from '@/lib/accountAuth';

type AuthResult = { error: { message: string } | null };
type AuthState = { status: 'loading' } | { status: 'ready'; user: AccountUser | null };

const toResult = (error: unknown): AuthResult => ({
  error: { message: error instanceof Error ? error.message : 'エラーが発生しました。もう一度お試しください' },
});

/** ユーザー名とパスワードのサインイン状態を管理します。 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    // 起動時に保存済みセッションをサーバーで確認してから表示を決める
    getVerifiedUser()
      .then(user => { if (active) setState({ status: 'ready', user }); })
      .catch(() => { if (active) setState({ status: 'ready', user: null }); });
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      const user = await authenticate(username, password);
      setState({ status: 'ready', user });
      return { error: null };
    } catch (error) {
      return toResult(error);
    }
  }, []);

  const signUp = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      const user = await registerAccount(username, password);
      setState({ status: 'ready', user });
      return { error: null };
    } catch (error) {
      return toResult(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    await endSession();
    setState({ status: 'ready', user: null });
  }, []);

  return {
    status: state.status,
    user: state.status === 'ready' ? state.user : null,
    signIn,
    signUp,
    signOut,
  };
}
