-- Owner-only details. Public biography publishing is deliberately unavailable
-- until profile-content reporting and moderation have an accepted path.
alter table public.profiles
  add column bio text,
  add column city_label text,
  add column public_profile_enabled boolean not null default false,
  add column profile_revision integer not null default 0,
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 160),
  add constraint profiles_city_length check (city_label is null or char_length(city_label) <= 80);

-- Protect identity and concurrency even for the temporarily supported v1
-- direct-column writer. Legacy edits advance revision; they cannot change seed.
create or replace function public.set_profile_updated_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.avatar_config -> 'seed' is distinct from old.avatar_config -> 'seed' then
    raise exception 'Avatar identity cannot be changed' using errcode = '23514';
  end if;
  new.profile_revision = old.profile_revision + 1;
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.set_profile_updated_at() from public, anon, authenticated;

create function public.update_my_profile_v2(p_expected_revision integer, p_changes jsonb)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_profile public.profiles;
  next_name text;
  next_bio text;
  next_city text;
  next_interests text[];
  next_avatar jsonb;
  trim_chars constant text := U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
begin
  if owner_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_changes) as k(key)
                where key not in ('display_name', 'bio', 'city_label', 'interests', 'avatar_id')) then
    raise exception 'Invalid profile fields' using errcode = '22023';
  end if;
  select * into current_profile from public.profiles where id = owner_id for update;
  if not found then
    raise exception 'Profile unavailable' using errcode = '42501';
  end if;
  if p_expected_revision is distinct from current_profile.profile_revision then
    raise exception 'Profile changed. Reload before saving.' using errcode = 'P0001';
  end if;
  next_name := current_profile.display_name;
  next_bio := current_profile.bio;
  next_city := current_profile.city_label;
  next_interests := current_profile.interests;
  next_avatar := current_profile.avatar_config;
  if p_changes ? 'display_name' then
    if jsonb_typeof(p_changes -> 'display_name') <> 'string' then
      raise exception 'Invalid display name' using errcode = '22023';
    end if;
    next_name := btrim(p_changes ->> 'display_name', trim_chars);
  end if;
  if next_name is null or char_length(next_name) not between 2 and 40 then
    raise exception 'Display name must have 2 to 40 characters' using errcode = '22023';
  end if;
  if p_changes ? 'bio' then
    if jsonb_typeof(p_changes -> 'bio') not in ('string', 'null') then
      raise exception 'Invalid biography' using errcode = '22023';
    end if;
    next_bio := nullif(btrim(p_changes ->> 'bio', trim_chars), '');
  end if;
  if p_changes ? 'city_label' then
    if jsonb_typeof(p_changes -> 'city_label') not in ('string', 'null') then
      raise exception 'Invalid city' using errcode = '22023';
    end if;
    next_city := nullif(btrim(p_changes ->> 'city_label', trim_chars), '');
  end if;
  if char_length(next_bio) > 160 or char_length(next_city) > 80 then
    raise exception 'Profile text is too long' using errcode = '22023';
  end if;
  if p_changes ? 'interests' then
    if jsonb_typeof(p_changes -> 'interests') <> 'array' then
      raise exception 'Invalid interests' using errcode = '22023';
    end if;
    if jsonb_array_length(p_changes -> 'interests') > 8 or exists (
      select 1 from jsonb_array_elements(p_changes -> 'interests') as i(value)
      where jsonb_typeof(value) <> 'string'
         or value #>> '{}' not in ('walk', 'coffee', 'sports', 'study', 'coworking', 'creative', 'other')
    ) then
      raise exception 'Invalid interests' using errcode = '22023';
    end if;
    select coalesce(array_agg(distinct value order by value), '{}'::text[])
      into next_interests from jsonb_array_elements_text(p_changes -> 'interests');
  end if;
  if p_changes ? 'avatar_id' then
    if jsonb_typeof(p_changes -> 'avatar_id') <> 'string'
       or p_changes ->> 'avatar_id' not in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06') then
      raise exception 'Invalid character' using errcode = '22023';
    end if;
    next_avatar := next_avatar || jsonb_build_object('version', 1, 'avatarId', p_changes ->> 'avatar_id');
  end if;
  update public.profiles set display_name = next_name, bio = next_bio,
    city_label = next_city, interests = next_interests, avatar_config = next_avatar,
    onboarding_status = 'complete'
  where id = owner_id returning * into current_profile;
  return current_profile;
end;
$$;
revoke all on function public.update_my_profile_v2(integer, jsonb) from public, anon;
grant execute on function public.update_my_profile_v2(integer, jsonb) to authenticated;
-- No new direct UPDATE grants. Existing owner SELECT policy also covers these
-- fields; no public discovery/detail projection is expanded by this migration.
