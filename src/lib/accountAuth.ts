// メールアドレスを使わない、ユーザー名とパスワードのアカウント。
// 登録・サインイン・セッション確認は Supabase 側の関数（senni_*）で行います。
import { isSupabaseConfigured } from '@/lib/supabase';
import { callRpc, RpcError } from '@/lib/rpc';
import { credentialsSchema } from '@/lib/usernameAuth';

export interface AccountUser {
  id: string;
  username: string;
  /** サーバーの関数を呼ぶための、セッションのトークン */
  token: string;
}

export class AuthError extends Error {}

interface SessionPayload {
  token: string;
  id: string;
  username: string;
}

const SESSION_KEY = 'senninos-session';

function readSession(): AccountUser | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Partial<AccountUser> | null;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.username === 'string' && typeof parsed.token === 'string') {
      return { id: parsed.id, username: parsed.username, token: parsed.token };
    }
  } catch {
    // 壊れたセッション情報は無視して未ログイン扱いにする
  }
  return null;
}

function writeSession(user: AccountUser): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    throw new AuthError('ログイン状態を保存できません。ブラウザの保存領域を確認してください');
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // 画面上はログアウトさせる
  }
}

const toUser = (payload: SessionPayload): AccountUser => ({ id: payload.id, username: payload.username, token: payload.token });

function parseCredentials(username: string, password: string): { username: string; password: string } {
  const parsed = credentialsSchema.safeParse({ username, password });
  if (!parsed.success) throw new AuthError(parsed.error.issues[0].message);
  return parsed.data;
}

function ensureConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new AuthError('サーバーの設定が完了していません。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください');
  }
}

function describeError(error: unknown): string {
  if (!(error instanceof RpcError)) return error instanceof Error ? error.message : 'エラーが発生しました';
  switch (error.code) {
    case 'USERNAME_TAKEN': return 'このユーザー名は既に使用されています';
    case 'INVALID_CREDENTIALS': return 'ユーザー名またはパスワードが正しくありません';
    case 'INVALID_USERNAME': return 'ユーザー名は3〜24文字の半角英数字と _ で入力してください';
    case 'WEAK_PASSWORD': return 'パスワードは8〜128文字で入力してください';
    case 'UNAUTHORIZED': return 'セッションが切れました。再度サインインしてください';
    case 'NOT_INSTALLED': return 'データベースの準備ができていません。supabase/schema.sql を SQL Editor で実行してください';
    case 'BAD_KEY': return 'anon キーが正しくありません。VITE_SUPABASE_ANON_KEY を確認し、再ビルド・再デプロイしてください';
    case 'NETWORK': return 'サーバーに接続できません。VITE_SUPABASE_URL と通信環境を確認してください';
    default:
      console.error('[SenniNOS auth]', error);
      return `アカウントの処理に失敗しました: ${error.message}`;
  }
}

/** 新しいアカウントを作成し、そのままサインインします。 */
export async function registerAccount(username: string, password: string): Promise<AccountUser> {
  ensureConfigured();
  const creds = parseCredentials(username, password);
  try {
    const payload = await callRpc<SessionPayload>('senni_register', { p_username: creds.username, p_password: creds.password });
    const user = toUser(payload);
    writeSession(user);
    return user;
  } catch (error) {
    throw new AuthError(describeError(error));
  }
}

/** ユーザー名とパスワードでサインインします。 */
export async function authenticate(username: string, password: string): Promise<AccountUser> {
  ensureConfigured();
  const creds = parseCredentials(username, password);
  try {
    const payload = await callRpc<SessionPayload>('senni_login', { p_username: creds.username, p_password: creds.password });
    const user = toUser(payload);
    writeSession(user);
    return user;
  } catch (error) {
    throw new AuthError(describeError(error));
  }
}

/**
 * 保存されたセッションをサーバーに問い合わせて検証します。
 * 期限切れや失効済みなら破棄して null を返します。通信エラーの場合は例外を投げます。
 */
export async function getVerifiedUser(): Promise<AccountUser | null> {
  if (!isSupabaseConfigured) return null;
  const stored = readSession();
  if (!stored) return null;
  let me: { id: string; username: string } | null;
  try {
    me = await callRpc<{ id: string; username: string } | null>('senni_me', { p_token: stored.token });
  } catch (error) {
    if (error instanceof RpcError && error.code === 'NETWORK') throw error;
    clearSession();
    return null;
  }
  if (!me) {
    clearSession();
    return null;
  }
  const user = { id: me.id, username: me.username, token: stored.token };
  writeSession(user);
  return user;
}

/** サインアウト。サーバー側のセッションも失効させます。 */
export async function endSession(): Promise<void> {
  const stored = readSession();
  clearSession();
  if (stored && isSupabaseConfigured) {
    try {
      await callRpc('senni_logout', { p_token: stored.token });
    } catch {
      // ローカルは削除済み。サーバー側はセッションの期限切れで無効になる
    }
  }
}
