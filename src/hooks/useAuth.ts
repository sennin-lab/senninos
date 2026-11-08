import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { credentialsSchema, usernameToEmail } from '@/lib/usernameAuth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let generation = 0;
    const verify = async (nextSession: Session | null) => {
      const current = ++generation;
      if (!nextSession) {
        if (active) { setSession(null); setUser(null); setLoading(false); }
        return;
      }
      const { data, error } = await supabase.auth.getUser();
      if (!active || current !== generation) return;
      setUser(error ? null : data.user);
      setSession(error ? null : nextSession);
      setLoading(false);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => { if (active) void verify(nextSession); }, 0);
    });
    void supabase.auth.getSession().then(({ data }) => verify(data.session));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (username: string, password: string) => {
    const parsed = credentialsSchema.safeParse({ username, password });
    if (!parsed.success) return { error: { message: parsed.error.issues[0].message } };
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(parsed.data.username), password });
    return { error };
  };

  const signUp = async (username: string, password: string) => {
    const parsed = credentialsSchema.safeParse({ username, password });
    if (!parsed.success) return { error: { message: parsed.error.issues[0].message } };
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(parsed.data.username),
      password,
      options: { emailRedirectTo: window.location.origin, data: { username: parsed.data.username } },
    });
    if (!error && !data.session) return { error: { message: '登録が完了しましたが、ログイン設定の確認が必要です。' } };
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { user, session, loading, signIn, signUp, signOut };
}
