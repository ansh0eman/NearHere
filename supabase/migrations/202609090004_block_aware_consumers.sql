-- Lesson 15: apply private blocks to public discovery and host projections.
-- Anonymous discovery remains available; authenticated callers do not see
-- activities hosted by either side of a private block relationship.

create or replace function public.nearby_activities(
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
  join_mode public.activity_join_mode
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_query_point extensions.geography(Point, 4326);
  v_actor_id uuid := (select auth.uid());
begin
  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception using errcode = '22023', message = 'Invalid discovery coordinates.';
  end if;
  if p_radius_m < 100 or p_radius_m > 20000 then
    raise exception using errcode = '22023', message = 'Discovery radius must be between 100 and 20000 metres.';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Discovery limit must be between 1 and 100.';
  end if;
  v_query_point := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
  return query
    select a.id, a.kind, a.title, a.description, a.status, a.starts_at, a.ends_at,
      extensions.st_y(a.public_point::extensions.geometry),
      extensions.st_x(a.public_point::extensions.geometry), a.privacy_radius_m,
      extensions.st_distance(a.public_point, v_query_point), p.display_name,
      (select count(*)::integer from public.activity_memberships m where m.activity_id = a.id and m.status = 'accepted'),
      a.capacity::integer, a.join_mode
    from public.activities a
    join public.profiles p on p.id = a.host_user_id
    where a.status = 'published' and a.ends_at > now()
      and a.starts_at <= coalesce(p_starts_before, now() + interval '7 days')
      and (p_kinds is null or a.kind = any (p_kinds))
      and extensions.st_dwithin(a.public_point, v_query_point, p_radius_m)
      and (v_actor_id is null or not exists (
        select 1 from private.user_blocks block
        where (block.blocker_user_id = v_actor_id and block.blocked_user_id = a.host_user_id)
           or (block.blocker_user_id = a.host_user_id and block.blocked_user_id = v_actor_id)
      ))
    order by extensions.st_distance(a.public_point, v_query_point), a.starts_at, a.id
    limit p_limit;
end;
$$;

create or replace function public.host_activity_participants(p_activity_id uuid)
returns table (
  participant_user_id uuid,
  participant_display_name text,
  membership_status public.activity_membership_status,
  joined_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;
  if not exists (select 1 from public.activities a where a.id = p_activity_id and a.host_user_id = v_actor_id) then
    raise exception using errcode = '42501', message = 'Activity is not hosted by the caller.';
  end if;
  return query
    select m.user_id, p.display_name, m.status, m.joined_at
    from public.activity_memberships m
    join public.profiles p on p.id = m.user_id
    where m.activity_id = p_activity_id
      and m.role = 'participant'
      and m.status in ('accepted', 'waitlisted')
      and not exists (
        select 1 from private.user_blocks block
        where (block.blocker_user_id = v_actor_id and block.blocked_user_id = m.user_id)
           or (block.blocker_user_id = m.user_id and block.blocked_user_id = v_actor_id)
      )
    order by m.status, m.joined_at nulls last, m.created_at, m.user_id;
end;
$$;
