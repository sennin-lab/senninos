import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// URL は公開情報なので既定値を持たせています。anon（publishable）キーは秘密ではありませんが、
// 環境ごとに差し替えられるよう環境変数から読み込みます（.env.example を参照）。
const DEFAULT_SUPABASE_URL = 'https://mdsoknhzuocrgesnuhcn.supabase.co';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** anon キーが設定されているか。未設定のときはログイン画面で案内を出します。 */
export const isSupabaseConfigured = anonKey.length > 0;

export const supabase: SupabaseClient = createClient(url, anonKey || 'not-configured', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
