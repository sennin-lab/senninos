// ブラウザ内だけで完結するアカウント管理。外部サービス（Supabase など）は使いません。
// パスワードは PBKDF2-SHA256 でハッシュ化し、平文は保存しません。
// 注意: 保存先は利用中のブラウザの localStorage なので、別の端末やブラウザとは共有されません。
import { credentialsSchema } from './usernameAuth';

const ACCOUNTS_KEY = 'senninos-accounts';
const SESSION_KEY = 'senninos-session';
const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export interface LocalUser {
  id: string;
  username: string;
}

interface StoredAccount {
  id: string;
  username: string;
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
}

export class AuthError extends Error {}

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), char => char.charCodeAt(0));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new AuthError('このアドレスではアカウント機能を利用できません。HTTPS でアクセスしてください');
  }
  return subtle;
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const subtle = getSubtle();
  const key = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
}

function readAccounts(): StoredAccount[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    throw new AuthError('アカウントを保存できません。ブラウザの保存領域を確認してください');
  }
}

function writeSession(user: LocalUser): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    throw new AuthError('ログイン状態を保存できません。ブラウザの保存領域を確認してください');
  }
}

function readSession(): LocalUser | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Partial<LocalUser> | null;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.username === 'string') {
      return { id: parsed.id, username: parsed.username };
    }
  } catch {
    // 壊れたセッション情報は無視して未ログイン扱いにする
  }
  return null;
}

function parseCredentials(username: string, password: string): { username: string; password: string } {
  const parsed = credentialsSchema.safeParse({ username, password });
  if (!parsed.success) throw new AuthError(parsed.error.issues[0].message);
  return parsed.data;
}

/** 新しいアカウントを作成し、そのままログイン状態にします。 */
export async function registerAccount(username: string, password: string): Promise<LocalUser> {
  const creds = parseCredentials(username, password);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasswordHash(creds.password, salt, PBKDF2_ITERATIONS);

  // ハッシュ計算中に別タブで同名が作られることもあるため、保存直前に再確認する
  const accounts = readAccounts();
  if (accounts.some(account => account.username === creds.username)) {
    throw new AuthError('このユーザー名は既に使用されています');
  }
  const account: StoredAccount = {
    id: newId(),
    username: creds.username,
    salt: toBase64(salt),
    hash: toBase64(hash),
    iterations: PBKDF2_ITERATIONS,
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...accounts, account]);
  const user = { id: account.id, username: account.username };
  writeSession(user);
  return user;
}

/** ユーザー名とパスワードを確認し、成功したらログイン状態にします。 */
export async function authenticate(username: string, password: string): Promise<LocalUser> {
  const creds = parseCredentials(username, password);
  const account = readAccounts().find(item => item.username === creds.username);
  // アカウントの有無に関わらずハッシュ計算を行い、応答時間から存在を推測されにくくする
  const salt = account ? fromBase64(account.salt) : new Uint8Array(SALT_BYTES);
  const hash = await derivePasswordHash(creds.password, salt, account?.iterations ?? PBKDF2_ITERATIONS);
  if (!account || !constantTimeEqual(hash, fromBase64(account.hash))) {
    throw new AuthError('ユーザー名またはパスワードが正しくありません');
  }
  const user = { id: account.id, username: account.username };
  writeSession(user);
  return user;
}

/** 現在のログイン中ユーザーを返します。アカウントが無くなっていれば null。 */
export function getCurrentUser(): LocalUser | null {
  const session = readSession();
  if (!session) return null;
  const account = readAccounts().find(item => item.id === session.id);
  return account ? { id: account.id, username: account.username } : null;
}

export function endSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // 保存領域にアクセスできない場合も、画面上はログアウトさせる
  }
}
