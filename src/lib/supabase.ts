import { createClient } from '@supabase/supabase-js';

// 接続先は環境変数だけで指定します（コードに既定値は持たせません。プロジェクトの取り違えを防ぐため）。
const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** 接続先と anon キーの両方が設定されているか */
export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0;

// Supabase Auth は使わないため、セッションの保存と自動更新は無効にします。
// このクライアントは関数（RPC）を呼ぶためだけに使います。
export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://not-configured.invalid',
  isSupabaseConfigured ? anonKey : 'not-configured',
  {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  },
);
