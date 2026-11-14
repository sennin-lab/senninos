// Supabase Auth によるアカウント管理。ユーザー名とパスワードだけで登録・サインインできるよう、
// ユーザー名から内部用のメールアドレス（<username>@ACCOUNT_EMAIL_DOMAIN）を作ります。
// 注意: Supabase の Authentication 設定で「Confirm email」をオフにしてください（README 参照）。
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { credentialsSchema } from '@/lib/usernameAuth';

const ACCOUNT_EMAIL_DOMAIN = 'accounts.senninos.app';

export interface AccountUser {
  id: string;
  username: string;
}

export class AuthError extends Error {}

const toEmail = (username: string) => `${username}@${ACCOUNT_EMAIL_DOMAIN}`;

export function toAccountUser(user: User): AccountUser {
  const metaName = user.user_metadata?.username;
  const username = typeof metaName === 'string' && metaName ? metaName : (user.email?.split('@')[0] ?? 'user');
  return { id: user.id, username };
}

function parseCredentials(username: string, password: string): { username: string; password: string } {
  const parsed = credentialsSchema.safeParse({ username, password });
  if (!parsed.success) throw new AuthError(parsed.error.issues[0].message);
  return parsed.data;
}

function ensureConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new AuthError('サーバーの設定が完了していません。VITE_SUPABASE_ANON_KEY を設定してください');
  }
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'ユーザー名またはパスワードが正しくありません';
  if (/already (registered|been registered)|user already exists/i.test(message)) return 'このユーザー名は既に使用されています';
  if (/rate limit|too many requests/i.test(message)) return '試行回数が多すぎます。少し時間をおいてから再度お試しください';
  if (/failed to fetch|network|load failed/i.test(message)) return 'サーバーに接続できません。通信環境を確認してください';
  return 'アカウントの処理に失敗しました。もう一度お試しください';
}

/** 新しいアカウントを作成し、そのままサインインします。 */
export async function registerAccount(username: string, password: string): Promise<AccountUser> {
  ensureConfigured();
  const creds = parseCredentials(username, password);
  const { data, error } = await supabase.auth.signUp({
    email: toEmail(creds.username),
    password: creds.password,
    options: { data: { username: creds.username } },
  });
  if (error) throw new AuthError(translateAuthError(error.message));
  // 既存のメールアドレスの場合、Supabase は identities が空のユーザーを返す（情報漏えい防止の仕様）
  if (data.user && data.user.identities?.length === 0) {
    throw new AuthError('このユーザー名は既に使用されています');
  }
  if (!data.user || !data.session) {
    throw new AuthError('メール確認が有効になっています。Supabase の Authentication 設定で「Confirm email」をオフにしてください');
  }
  return toAccountUser(data.user);
}

/** ユーザー名とパスワードでサインインします。 */
export async function authenticate(username: string, password: string): Promise<AccountUser> {
  ensureConfigured();
  const creds = parseCredentials(username, password);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toEmail(creds.username),
    password: creds.password,
  });
  if (error || !data.user) throw new AuthError(translateAuthError(error?.message ?? ''));
  return toAccountUser(data.user);
}

/**
 * 保存されているセッションをサーバーに問い合わせて検証します。
 * ローカルに残った期限切れ・失効済みのセッションは信用せず、無効なら破棄します。
 */
export async function getVerifiedUser(): Promise<AccountUser | null> {
  if (!isSupabaseConfigured) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }
  return toAccountUser(data.user);
}

export async function endSession(): Promise<void> {
  await supabase.auth.signOut();
}
