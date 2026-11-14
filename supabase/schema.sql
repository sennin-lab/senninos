-- SenniNOS: Supabase Auth を使わず、ユーザー名とパスワードだけでアカウントを管理するスキーマ。
-- SQL Editor で全体を一度実行してください（何度実行しても安全です）。

create extension if not exists pgcrypto with schema extensions;

-- 以前の Supabase Auth 版のトリガーが残っている場合は削除（使わなくなるため）
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- アカウント（パスワードは bcrypt でハッシュ化して保存）
create table if not exists public.senni_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint senni_accounts_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

-- ログインセッション（トークン本体ではなく SHA-256 のハッシュを保存）
create table if not exists public.senni_sessions (
  token_hash text primary key,
  account_id uuid not null references public.senni_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

-- アカウントごとのデータ（ファイル構成・設定）
create table if not exists public.senni_user_data (
  account_id uuid primary key references public.senni_accounts (id) on delete cascade,
  tree jsonb,
  wallpaper_id text not null default 'mountain' check (char_length(wallpaper_id) between 1 and 40),
  installed_apps text[] not null default '{}',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  updated_at timestamptz not null default now()
);

alter table public.senni_accounts enable row level security;
alter table public.senni_sessions enable row level security;
alter table public.senni_user_data enable row level security;
-- ポリシーは作成しません。テーブルへの直接アクセスは全面的に拒否し、下の関数だけを経由させます。

create or replace function public.senni_token_hash(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
$$;

-- トークンから有効なセッションのアカウント ID を取り出す（期限切れや不正なトークンは null）
create or replace function public.senni_account_from_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid;
begin
  if p_token is null or char_length(p_token) < 32 then
    return null;
  end if;
  select s.account_id into v_account
  from public.senni_sessions s
  where s.token_hash = public.senni_token_hash(p_token)
    and s.expires_at > now();
  return v_account;
end;
$$;

create or replace function public.senni_issue_session(p_account uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into public.senni_sessions (token_hash, account_id)
  values (public.senni_token_hash(v_token), p_account);
  return v_token;
end;
$$;

-- 新規登録。成功するとログイン済みのセッショントークンを返します。
create or replace function public.senni_register(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := lower(trim(p_username));
  v_id uuid;
  v_token text;
begin
  if v_name !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'INVALID_USERNAME';
  end if;
  if char_length(p_password) < 8 or char_length(p_password) > 128 then
    raise exception 'WEAK_PASSWORD';
  end if;
  if exists (select 1 from public.senni_accounts where username = v_name) then
    raise exception 'USERNAME_TAKEN';
  end if;

  insert into public.senni_accounts (username, password_hash)
  values (v_name, extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
  returning id into v_id;

  insert into public.senni_user_data (account_id) values (v_id);
  v_token := public.senni_issue_session(v_id);
  return jsonb_build_object('token', v_token, 'id', v_id, 'username', v_name);
end;
$$;

-- サインイン。
create or replace function public.senni_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.senni_accounts%rowtype;
  v_token text;
begin
  select * into a from public.senni_accounts where username = lower(trim(p_username));
  if not found then
    raise exception 'INVALID_CREDENTIALS';
  end if;
  if extensions.crypt(p_password, a.password_hash) <> a.password_hash then
    raise exception 'INVALID_CREDENTIALS';
  end if;
  v_token := public.senni_issue_session(a.id);
  return jsonb_build_object('token', v_token, 'id', a.id, 'username', a.username);
end;
$$;

create or replace function public.senni_logout(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.senni_sessions where token_hash = public.senni_token_hash(p_token)
$$;

-- 現在のセッションのユーザーを返す（無効なら null）
create or replace function public.senni_me(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.senni_account_from_token(p_token);
  v_name text;
begin
  if v_account is null then
    return null;
  end if;
  select username into v_name from public.senni_accounts where id = v_account;
  return jsonb_build_object('id', v_account, 'username', v_name);
end;
$$;

-- 自分のデータを読み込む
create or replace function public.senni_load(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.senni_account_from_token(p_token);
  d public.senni_user_data%rowtype;
begin
  if v_account is null then
    raise exception 'UNAUTHORIZED';
  end if;
  select * into d from public.senni_user_data where account_id = v_account;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'tree', d.tree,
    'wallpaperId', d.wallpaper_id,
    'installedApps', to_jsonb(d.installed_apps),
    'theme', d.theme
  );
end;
$$;

-- ファイル構成を保存（なければ作成）
create or replace function public.senni_save_fs(p_token text, p_tree jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.senni_account_from_token(p_token);
begin
  if v_account is null then
    raise exception 'UNAUTHORIZED';
  end if;
  if jsonb_typeof(p_tree) <> 'object' then
    raise exception 'INVALID_TREE';
  end if;
  insert into public.senni_user_data (account_id, tree)
  values (v_account, p_tree)
  on conflict (account_id) do update set tree = excluded.tree, updated_at = now();
end;
$$;

-- 壁紙・インストール済みアプリ・テーマを保存
create or replace function public.senni_save_settings(
  p_token text,
  p_wallpaper_id text,
  p_installed_apps text[],
  p_theme text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.senni_account_from_token(p_token);
begin
  if v_account is null then
    raise exception 'UNAUTHORIZED';
  end if;
  insert into public.senni_user_data (account_id, wallpaper_id, installed_apps, theme)
  values (v_account, p_wallpaper_id, coalesce(p_installed_apps, '{}'), p_theme)
  on conflict (account_id) do update set
    wallpaper_id = excluded.wallpaper_id,
    installed_apps = excluded.installed_apps,
    theme = excluded.theme,
    updated_at = now();
end;
$$;

-- 公開する関数の権限。anon（公開キー）からは関数の呼び出しだけを許可します。
revoke all on public.senni_accounts, public.senni_sessions, public.senni_user_data from public, anon, authenticated;

revoke execute on function public.senni_token_hash(text) from public, anon, authenticated;
revoke execute on function public.senni_account_from_token(text) from public, anon, authenticated;
revoke execute on function public.senni_issue_session(uuid) from public, anon, authenticated;

revoke execute on function public.senni_register(text, text) from public;
revoke execute on function public.senni_login(text, text) from public;
revoke execute on function public.senni_logout(text) from public;
revoke execute on function public.senni_me(text) from public;
revoke execute on function public.senni_load(text) from public;
revoke execute on function public.senni_save_fs(text, jsonb) from public;
revoke execute on function public.senni_save_settings(text, text, text[], text) from public;

grant execute on function public.senni_register(text, text) to anon, authenticated;
grant execute on function public.senni_login(text, text) to anon, authenticated;
grant execute on function public.senni_logout(text) to anon, authenticated;
grant execute on function public.senni_me(text) to anon, authenticated;
grant execute on function public.senni_load(text) to anon, authenticated;
grant execute on function public.senni_save_fs(text, jsonb) to anon, authenticated;
grant execute on function public.senni_save_settings(text, text, text[], text) to anon, authenticated;
