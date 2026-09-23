-- The avatar projection is public, so return only the allowlisted fields used
-- by the sprite picker. profile.avatar_config may grow private/non-public keys
-- in the future; never serialize the full JSON value through discovery.
create or replace function public.nearby_activities_with_avatars(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_m integer default 5000,
  p_kinds public.activity_kind[] default null,
  p_starts_before timestamptz default null,
  p_limit integer default 50
)
returns table (
  id uuid, kind public.activity_kind, title text, description text,
  status public.activity_status, starts_at timestamptz, ends_at timestamptz,
  public_latitude double precision, public_longitude double precision,
  privacy_radius_m integer, distance_m double precision,
  host_display_name text, participant_count integer, capacity integer,
  join_mode public.activity_join_mode, host_avatar_config jsonb
)
language sql stable security definer set search_path = ''
as $$
  select nearby.id, nearby.kind, nearby.title, nearby.description,
    nearby.status, nearby.starts_at, nearby.ends_at,
    nearby.public_latitude, nearby.public_longitude, nearby.privacy_radius_m,
    nearby.distance_m, nearby.host_display_name, nearby.participant_count,
    nearby.capacity, nearby.join_mode,
    case
      when profile.avatar_config->>'version' = '1'
       and profile.avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then jsonb_build_object('version', 1, 'seed', profile.avatar_config->>'seed')
      else null
    end
  from public.nearby_activities(
    p_latitude, p_longitude, p_radius_m, p_kinds, p_starts_before, p_limit
  ) as nearby
  join public.activities as activity on activity.id = nearby.id
  join public.profiles as profile on profile.id = activity.host_user_id;
$$;

revoke execute on function public.nearby_activities_with_avatars(
  double precision, double precision, integer, public.activity_kind[], timestamptz, integer
) from public, anon, authenticated;
grant execute on function public.nearby_activities_with_avatars(
  double precision, double precision, integer, public.activity_kind[], timestamptz, integer
) to anon, authenticated;
