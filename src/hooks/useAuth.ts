import { useCallback, useEffect, useState } from 'react';
import {
  authenticate, endSession, getVerifiedUser, registerAccount, toAccountUser, type AccountUser,
} from '@/lib/accountAuth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthResult = { error: { message: string } | null };
type AuthState = { status: 'loading' } | { status: 'ready'; user: AccountUser | null };

const toResult = (error: unknown): AuthResult => ({
  error: { message: error instanceof Error ? error.message : 'エラーが発生しました。もう一度お試しください' },
});

/** Supabase Auth のサインイン状態を管理します。 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ status: 'ready', user: null });
      return;
    }
    let active = true;

    // 起動時はサーバーで検証してから状態を確定させる
    getVerifiedUser()
      .then(user => { if (active) setState({ status: 'ready', user }); })
      .catch(() => { if (active) setState({ status: 'ready', user: null }); });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({ status: 'ready', user: session?.user ? toAccountUser(session.user) : null });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
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
