-- Lesson 4: establish the application profile that corresponds to a
-- private Supabase Auth user. This migration intentionally does not duplicate
-- phone numbers or authentication credentials into the public schema.

create type public.onboarding_status as enum ('needs_profile', 'complete');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  onboarding_status public.onboarding_status not null default 'needs_profile',
  avatar_config jsonb not null default '{}'::jsonb,
  interests text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_length
    check (
      display_name is null
      or char_length(btrim(display_name)) between 2 and 40
    ),
  constraint profiles_avatar_config_is_object
    check (jsonb_typeof(avatar_config) = 'object'),
  constraint profiles_interests_limit
    check (cardinality(interests) <= 20),
  constraint profiles_complete_requires_display_name
    check (onboarding_status = 'needs_profile' or display_name is not null)
);

comment on table public.profiles is
  'NearHere application profile paired one-to-one with auth.users.';
comment on column public.profiles.display_name is
  'Public label. Null means minimal profile onboarding is incomplete.';
comment on column public.profiles.avatar_config is
  'Versionable custom-avatar configuration; empty until the builder is designed.';

-- `search_path = ''` prevents a security-definer function from resolving an
-- attacker-controlled object with the same unqualified name.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

revoke execute on function public.handle_new_auth_user()
  from public, anon, authenticated;

create function public.set_profile_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

revoke execute on function public.set_profile_updated_at()
  from public, anon, authenticated;

-- Tables created through raw SQL do not receive RLS automatically.
alter table public.profiles enable row level security;

-- `public` is the PostgreSQL schema name; it does not mean anonymous internet
-- access. Discovery will later use an API-shaped projection containing only the
-- host fields required by that response.
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- The stable identity and server timestamps are not client-writable. Column
-- grants below restrict the writable surface even before the policy runs.
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, onboarding_status, avatar_config, interests)
  on table public.profiles to authenticated;
