-- A username is a public-facing label, not an authentication credential.
-- Ownership and authorization continue to use auth.users.id.
alter table public.profiles
  add column username text,
  add constraint profiles_username_canonical
    check (
      username is null
      or username collate "C" ~ '^[a-z][a-z0-9_]{2,19}$'
    );

create unique index profiles_username_unique
  on public.profiles (username)
  where username is not null;

comment on column public.profiles.username is
  'Optional canonical public handle. Claimed once by its owner; authentication identity remains profiles.id.';

-- Keep direct table writes closed; the narrowly-scoped RPC below is the only
-- path that can claim this column. Existing profile fields retain their grants.
revoke update (username) on table public.profiles from public, anon, authenticated;

create function public.claim_my_username(
  p_username text,
  p_expected_revision integer
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  current_profile public.profiles;
  next_username text;
  trim_chars constant text := U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
begin
  if owner_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_username is null then
    raise exception 'Username is required' using errcode = '22023';
  end if;

  next_username := lower(btrim(p_username, trim_chars));
  if next_username collate "C" !~ '^[a-z][a-z0-9_]{2,19}$' then
    raise exception 'Use 3-20 characters: lowercase letters, numbers, and underscore; start with a letter.'
      using errcode = '22023';
  end if;
  if next_username = any(array[
    'admin', 'administrator', 'help', 'moderator', 'nearhere', 'official',
    'root', 'staff', 'support', 'system'
  ]) then
    raise exception 'This username is reserved' using errcode = '22023';
  end if;

  select * into current_profile
    from public.profiles
    where id = owner_id
    for update;
  if not found then
    raise exception 'Profile unavailable' using errcode = '42501';
  end if;
  if p_expected_revision is distinct from current_profile.profile_revision then
    raise exception 'Profile changed. Reload before claiming a username.'
      using errcode = 'P0001';
  end if;
  if current_profile.username is not null then
    if current_profile.username = next_username then
      return current_profile;
    end if;
    raise exception 'A username can only be claimed once' using errcode = 'P0001';
  end if;

  update public.profiles
    set username = next_username
    where id = owner_id
    returning * into current_profile;
  return current_profile;
exception
  when unique_violation then
    raise exception 'This username is unavailable' using errcode = 'P0001';
end;
$$;

revoke all on function public.claim_my_username(text, integer) from public, anon;
grant execute on function public.claim_my_username(text, integer) to authenticated;
