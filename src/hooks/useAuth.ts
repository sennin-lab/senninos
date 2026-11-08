import { useCallback, useState } from 'react';
import {
  authenticate, endSession, getCurrentUser, registerAccount, type LocalUser,
} from '@/lib/localAuth';

type AuthResult = { error: { message: string } | null };

const toResult = (error: unknown): AuthResult => ({
  error: { message: error instanceof Error ? error.message : 'エラーが発生しました。もう一度お試しください' },
});

/** ブラウザ内のアカウントでサインイン状態を管理します（Supabase Auth は使いません）。 */
export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(() => getCurrentUser());

  const signIn = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      setUser(await authenticate(username, password));
      return { error: null };
    } catch (error) {
      return toResult(error);
    }
  }, []);

  const signUp = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      setUser(await registerAccount(username, password));
      return { error: null };
    } catch (error) {
      return toResult(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    endSession();
    setUser(null);
  }, []);

  return { user, signIn, signUp, signOut };
}
