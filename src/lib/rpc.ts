// Supabase の関数（supabase/schema.sql の senni_*）を呼び出す共通処理。
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export class RpcError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'RpcError';
  }
}

// データベース側の raise exception で返す、アプリ独自のエラーコード
const APP_ERROR_CODES = ['USERNAME_TAKEN', 'INVALID_CREDENTIALS', 'INVALID_USERNAME', 'WEAK_PASSWORD', 'UNAUTHORIZED', 'INVALID_TREE'];

function classify(message: string): string {
  const known = APP_ERROR_CODES.find(code => message.includes(code));
  if (known) return known;
  if (/could not find the function|PGRST202/i.test(message)) return 'NOT_INSTALLED';
  if (/invalid api key|no api key/i.test(message)) return 'BAD_KEY';
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'NETWORK';
  return 'UNKNOWN';
}

export async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured) throw new RpcError('NOT_CONFIGURED', 'Supabase の設定がありません');
  let response;
  try {
    response = await supabase.rpc(fn, args);
  } catch (error) {
    throw new RpcError('NETWORK', error instanceof Error ? error.message : 'network error');
  }
  if (response.error) {
    const message = response.error.message ?? '';
    throw new RpcError(classify(message), message);
  }
  return response.data as T;
}
