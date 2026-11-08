create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wallpaper_id text not null default 'mountain' check (char_length(wallpaper_id) between 1 and 40),
  installed_apps text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_filesystems (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tree jsonb not null check (jsonb_typeof(tree) = 'object'),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

drop trigger if exists user_filesystems_set_updated_at on public.user_filesystems;
create trigger user_filesystems_set_updated_at
  before update on public.user_filesystems
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)))
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_filesystems enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "user_settings: read own" on public.user_settings;
create policy "user_settings: read own"
  on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_settings: insert own" on public.user_settings;
create policy "user_settings: insert own"
  on public.user_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings: update own" on public.user_settings;
create policy "user_settings: update own"
  on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings: delete own" on public.user_settings;
create policy "user_settings: delete own"
  on public.user_settings for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_filesystems: read own" on public.user_filesystems;
create policy "user_filesystems: read own"
  on public.user_filesystems for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_filesystems: insert own" on public.user_filesystems;
create policy "user_filesystems: insert own"
  on public.user_filesystems for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_filesystems: update own" on public.user_filesystems;
create policy "user_filesystems: update own"
  on public.user_filesystems for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_filesystems: delete own" on public.user_filesystems;
create policy "user_filesystems: delete own"
  on public.user_filesystems for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.user_settings, public.user_filesystems from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings, public.user_filesystems to authenticated;
