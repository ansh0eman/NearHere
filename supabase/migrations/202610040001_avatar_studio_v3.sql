-- Avatar Studio v3 is a bounded, local-art reference. It never stores a URL,
-- upload, account identifier, or exact location. Existing v1 readers remain
-- safe: an unknown v3 projection falls back to its stable seed client-side.

create or replace function public.save_my_avatar_v3(
  p_expected_revision integer,
  p_appearance_id text
)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_profile public.profiles;
  fallback_id text;
  immutable_seed text;
begin
  if owner_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  select * into current_profile from public.profiles where id = owner_id for update;
  if not found then
    raise exception 'Profile unavailable' using errcode = '42501';
  end if;
  if p_expected_revision is distinct from current_profile.profile_revision then
    raise exception 'Profile changed. Reload before saving.' using errcode = 'P0001';
  end if;
  immutable_seed := current_profile.avatar_config ->> 'seed';
  if immutable_seed !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Avatar identity is unavailable' using errcode = '23514';
  end if;
  fallback_id := case p_appearance_id
    when 'kenney-01' then 'v1-01'
    when 'kenney-02' then 'v1-02'
    when 'kenney-03' then 'v1-03'
    when 'kenney-04' then 'v1-04'
    when 'kenney-05' then 'v1-05'
    when 'kenney-06' then 'v1-06'
    when 'kenney-07' then 'v1-01'
    when 'kenney-08' then 'v1-02'
    else null
  end;
  if fallback_id is null then
    raise exception 'Invalid character appearance' using errcode = '22023';
  end if;
  update public.profiles
  set avatar_config = jsonb_build_object(
    'version', 3,
    'seed', immutable_seed,
    'catalogVersion', 1,
    'appearanceId', p_appearance_id,
    'fallbackAvatarId', fallback_id
  )
  where id = owner_id
  returning * into current_profile;
  return current_profile;
end;
$$;
revoke all on function public.save_my_avatar_v3(integer, text) from public, anon;
grant execute on function public.save_my_avatar_v3(integer, text) to authenticated;

-- Metadata saves must not silently replace a chosen v3 appearance with a v1
-- avatar ID. The client uses the dedicated command above for Studio changes.
create or replace function public.update_my_profile_v2(p_expected_revision integer, p_changes jsonb)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); current_profile public.profiles; next_name text;
  next_bio text; next_city text; next_interests text[]; next_avatar jsonb;
  trim_chars constant text := U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
begin
  if owner_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or exists (
    select 1 from jsonb_object_keys(p_changes) as k(key)
    where key not in ('display_name', 'bio', 'city_label', 'interests', 'avatar_id')
  ) then raise exception 'Invalid profile fields' using errcode = '22023'; end if;
  select * into current_profile from public.profiles where id = owner_id for update;
  if not found then raise exception 'Profile unavailable' using errcode = '42501'; end if;
  if p_expected_revision is distinct from current_profile.profile_revision then
    raise exception 'Profile changed. Reload before saving.' using errcode = 'P0001';
  end if;
  next_name := current_profile.display_name; next_bio := current_profile.bio;
  next_city := current_profile.city_label; next_interests := current_profile.interests;
  next_avatar := current_profile.avatar_config;
  if p_changes ? 'display_name' then
    if jsonb_typeof(p_changes -> 'display_name') <> 'string' then raise exception 'Invalid display name' using errcode = '22023'; end if;
    next_name := btrim(p_changes ->> 'display_name', trim_chars);
  end if;
  if next_name is null or char_length(next_name) not between 2 and 40 then raise exception 'Display name must have 2 to 40 characters' using errcode = '22023'; end if;
  if p_changes ? 'bio' then
    if jsonb_typeof(p_changes -> 'bio') not in ('string', 'null') then raise exception 'Invalid biography' using errcode = '22023'; end if;
    next_bio := nullif(btrim(p_changes ->> 'bio', trim_chars), '');
  end if;
  if p_changes ? 'city_label' then
    if jsonb_typeof(p_changes -> 'city_label') not in ('string', 'null') then raise exception 'Invalid city' using errcode = '22023'; end if;
    next_city := nullif(btrim(p_changes ->> 'city_label', trim_chars), '');
  end if;
  if char_length(next_bio) > 160 or char_length(next_city) > 80 then raise exception 'Profile text is too long' using errcode = '22023'; end if;
  if p_changes ? 'interests' then
    if jsonb_typeof(p_changes -> 'interests') <> 'array' then raise exception 'Invalid interests' using errcode = '22023'; end if;
    if jsonb_array_length(p_changes -> 'interests') > 8 or exists (
      select 1 from jsonb_array_elements(p_changes -> 'interests') as i(value)
      where jsonb_typeof(value) <> 'string' or value #>> '{}' not in ('walk', 'coffee', 'sports', 'study', 'coworking', 'creative', 'other')
    ) then raise exception 'Invalid interests' using errcode = '22023'; end if;
    select coalesce(array_agg(distinct value order by value), '{}'::text[]) into next_interests from jsonb_array_elements_text(p_changes -> 'interests');
  end if;
  if p_changes ? 'avatar_id' then
    if next_avatar ->> 'version' = '3' then raise exception 'Use Avatar Studio to change this character' using errcode = 'P0001'; end if;
    if jsonb_typeof(p_changes -> 'avatar_id') <> 'string' or p_changes ->> 'avatar_id' not in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06') then raise exception 'Invalid character' using errcode = '22023'; end if;
    next_avatar := next_avatar || jsonb_build_object('version', 1, 'avatarId', p_changes ->> 'avatar_id');
  end if;
  update public.profiles set display_name = next_name, bio = next_bio, city_label = next_city, interests = next_interests, avatar_config = next_avatar, onboarding_status = 'complete'
  where id = owner_id returning * into current_profile;
  return current_profile;
end;
$$;
revoke all on function public.update_my_profile_v2(integer, jsonb) from public, anon;
grant execute on function public.update_my_profile_v2(integer, jsonb) to authenticated;

-- Replacing only the JSON projection retains the established discovery/detail/
-- plans authorization functions and their exact-location/block behavior.
create or replace function public.nearby_activities_with_avatars(p_latitude double precision, p_longitude double precision, p_radius_m integer default 5000, p_kinds public.activity_kind[] default null, p_starts_before timestamptz default null, p_limit integer default 50)
returns table (id uuid, kind public.activity_kind, title text, description text, status public.activity_status, starts_at timestamptz, ends_at timestamptz, public_latitude double precision, public_longitude double precision, privacy_radius_m integer, distance_m double precision, host_display_name text, participant_count integer, capacity integer, join_mode public.activity_join_mode, host_avatar_config jsonb, viewer_is_host boolean)
language sql stable security definer set search_path = '' as $$
  select nearby.id, nearby.kind, nearby.title, nearby.description, nearby.status, nearby.starts_at, nearby.ends_at, nearby.public_latitude, nearby.public_longitude, nearby.privacy_radius_m, nearby.distance_m, nearby.host_display_name, nearby.participant_count, nearby.capacity, nearby.join_mode,
    case
      when profile.avatar_config->>'version' = '3'
        and profile.avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and profile.avatar_config->>'catalogVersion' = '1'
        and profile.avatar_config->>'appearanceId' in ('kenney-01', 'kenney-02', 'kenney-03', 'kenney-04', 'kenney-05', 'kenney-06', 'kenney-07', 'kenney-08')
        and profile.avatar_config->>'fallbackAvatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06')
      then jsonb_build_object('version', 3, 'seed', profile.avatar_config->>'seed', 'catalogVersion', 1, 'appearanceId', profile.avatar_config->>'appearanceId', 'fallbackAvatarId', profile.avatar_config->>'fallbackAvatarId')
      when profile.avatar_config->>'version' = '1' then jsonb_strip_nulls(jsonb_build_object('version', 1,
        'seed', case when profile.avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then profile.avatar_config->>'seed' else null end,
        'avatarId', case when profile.avatar_config->>'avatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06') then profile.avatar_config->>'avatarId' else null end))
      else null end, coalesce(activity.host_user_id = (select auth.uid()), false)
  from public.nearby_activities(p_latitude, p_longitude, p_radius_m, p_kinds, p_starts_before, p_limit) nearby
  join public.activities activity on activity.id = nearby.id join public.profiles profile on profile.id = activity.host_user_id;
$$;

create or replace function public.avatar_projection(p_avatar_config jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select case
    when p_avatar_config->>'version' = '3'
      and p_avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and p_avatar_config->>'catalogVersion' = '1'
      and p_avatar_config->>'appearanceId' in ('kenney-01', 'kenney-02', 'kenney-03', 'kenney-04', 'kenney-05', 'kenney-06', 'kenney-07', 'kenney-08')
      and p_avatar_config->>'fallbackAvatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06')
    then jsonb_build_object('version', 3, 'seed', p_avatar_config->>'seed', 'catalogVersion', 1, 'appearanceId', p_avatar_config->>'appearanceId', 'fallbackAvatarId', p_avatar_config->>'fallbackAvatarId')
    when p_avatar_config->>'version' = '1' then jsonb_strip_nulls(jsonb_build_object('version', 1,
      'seed', case when p_avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_avatar_config->>'seed' else null end,
      'avatarId', case when p_avatar_config->>'avatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06') then p_avatar_config->>'avatarId' else null end))
    else null end;
$$;
revoke all on function public.avatar_projection(jsonb) from public, anon, authenticated;

create or replace function public.activity_detail_with_avatar(p_activity_id uuid)
returns table (id uuid, kind public.activity_kind, title text, description text, status public.activity_status, starts_at timestamptz, ends_at timestamptz, public_latitude double precision, public_longitude double precision, privacy_radius_m integer, host_display_name text, participant_count integer, capacity integer, join_mode public.activity_join_mode, membership_role public.activity_membership_role, membership_status public.activity_membership_status, exact_latitude double precision, exact_longitude double precision, host_avatar_config jsonb)
language sql stable security definer set search_path = '' as $$
  select detail.id, detail.kind, detail.title, detail.description, detail.status, detail.starts_at, detail.ends_at, detail.public_latitude, detail.public_longitude, detail.privacy_radius_m, detail.host_display_name, detail.participant_count, detail.capacity, detail.join_mode, detail.membership_role, detail.membership_status, detail.exact_latitude, detail.exact_longitude, public.avatar_projection(profile.avatar_config)
  from public.activity_detail(p_activity_id) detail join public.activities activity on activity.id = detail.id join public.profiles profile on profile.id = activity.host_user_id;
$$;

create or replace function public.my_plans_with_avatars(p_limit integer default 50)
returns table (id uuid, kind public.activity_kind, title text, description text, status public.activity_status, starts_at timestamptz, ends_at timestamptz, public_latitude double precision, public_longitude double precision, privacy_radius_m integer, host_display_name text, participant_count integer, capacity integer, join_mode public.activity_join_mode, membership_role public.activity_membership_role, membership_status public.activity_membership_status, exact_latitude double precision, exact_longitude double precision, host_avatar_config jsonb)
language sql stable security definer set search_path = '' as $$
  select plan.id, plan.kind, plan.title, plan.description, plan.status, plan.starts_at, plan.ends_at, plan.public_latitude, plan.public_longitude, plan.privacy_radius_m, plan.host_display_name, plan.participant_count, plan.capacity, plan.join_mode, plan.membership_role, plan.membership_status, plan.exact_latitude, plan.exact_longitude, public.avatar_projection(profile.avatar_config)
  from public.my_plans(p_limit) plan join public.activities activity on activity.id = plan.id join public.profiles profile on profile.id = activity.host_user_id;
$$;

revoke execute on function public.nearby_activities_with_avatars(double precision, double precision, integer, public.activity_kind[], timestamptz, integer) from public, anon, authenticated;
grant execute on function public.nearby_activities_with_avatars(double precision, double precision, integer, public.activity_kind[], timestamptz, integer) to anon, authenticated;
revoke execute on function public.activity_detail_with_avatar(uuid) from public, anon, authenticated;
grant execute on function public.activity_detail_with_avatar(uuid) to anon, authenticated;
revoke execute on function public.my_plans_with_avatars(integer) from public, anon, authenticated;
grant execute on function public.my_plans_with_avatars(integer) to authenticated;
