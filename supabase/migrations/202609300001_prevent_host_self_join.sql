-- A host already has the accepted host membership created with the activity.
-- Rejecting a self-join keeps that ownership invariant explicit, rather than
-- presenting it as a successful participant-join retry.
create or replace function public.join_activity(p_activity_id uuid)
returns table (membership_status public.activity_membership_status, participant_count integer)
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_host_id uuid;
  v_capacity integer;
  v_join_mode public.activity_join_mode;
  v_existing_role public.activity_membership_role;
  v_existing_status public.activity_membership_status;
  v_next_status public.activity_membership_status;
  v_accepted_count integer;
begin
  if v_actor_id is null then raise exception using errcode = '28000', message = 'Authentication required.'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_actor_id and p.onboarding_status = 'complete') then
    raise exception using errcode = 'P0001', message = 'Complete your profile before joining.';
  end if;
  select a.host_user_id, a.capacity::integer, a.join_mode into v_host_id, v_capacity, v_join_mode
  from public.activities a where a.id = p_activity_id and a.status = 'published' and a.ends_at > now() for update;
  if not found then raise exception using errcode = 'P0002', message = 'Activity is unavailable.'; end if;
  if v_actor_id = v_host_id then
    raise exception using errcode = 'P0004', message = 'A host cannot join their own activity.';
  end if;
  if exists (
    select 1 from private.user_blocks block
    where (block.blocker_user_id = v_actor_id and block.blocked_user_id = v_host_id)
       or (block.blocker_user_id = v_host_id and block.blocked_user_id = v_actor_id)
  ) then raise exception using errcode = '42501', message = 'Activity unavailable because of a block.'; end if;
  select m.role, m.status into v_existing_role, v_existing_status
  from public.activity_memberships m where m.activity_id = p_activity_id and m.user_id = v_actor_id;
  if v_existing_role = 'host' then raise exception using errcode = 'P0004', message = 'A host cannot join their own activity.'; end if;
  if v_existing_status in ('accepted', 'pending', 'waitlisted') then
    return query select v_existing_status, count(*)::integer
      from public.activity_memberships m where m.activity_id = p_activity_id and m.status = 'accepted'; return;
  end if;
  if v_existing_status in ('rejected', 'removed') then raise exception using errcode = 'P0003', message = 'Membership is blocked.'; end if;
  select count(*)::integer into v_accepted_count from public.activity_memberships m
    where m.activity_id = p_activity_id and m.status = 'accepted';
  if v_join_mode = 'approval' then v_next_status := 'pending';
  elsif v_accepted_count < v_capacity then v_next_status := 'accepted';
  else v_next_status := 'waitlisted'; end if;
  insert into public.activity_memberships (activity_id, user_id, role, status, joined_at)
  values (p_activity_id, v_actor_id, 'participant', v_next_status, case when v_next_status = 'accepted' then now() else null end)
  on conflict (activity_id, user_id) do update set role = 'participant', status = excluded.status, joined_at = excluded.joined_at, created_at = now();
  return query select v_next_status, count(*)::integer
    from public.activity_memberships m where m.activity_id = p_activity_id and m.status = 'accepted';
end;
$$;

-- Nearby discovery needs only a caller-specific ownership flag. It intentionally
-- does not reveal the host account ID to anonymous or other viewers.
drop function public.nearby_activities_with_avatars(
  double precision, double precision, integer, public.activity_kind[], timestamptz, integer
);

create function public.nearby_activities_with_avatars(
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
  join_mode public.activity_join_mode, host_avatar_config jsonb, viewer_is_host boolean
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
        and (
          profile.avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          or profile.avatar_config->>'avatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06')
        )
      then jsonb_strip_nulls(jsonb_build_object(
        'version', 1,
        'seed', case when profile.avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then profile.avatar_config->>'seed' else null end,
        'avatarId', case when profile.avatar_config->>'avatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06') then profile.avatar_config->>'avatarId' else null end
      ))
      else null
    end,
    coalesce(activity.host_user_id = (select auth.uid()), false)
  from public.nearby_activities(p_latitude, p_longitude, p_radius_m, p_kinds, p_starts_before, p_limit) as nearby
  join public.activities as activity on activity.id = nearby.id
  join public.profiles as profile on profile.id = activity.host_user_id;
$$;

revoke execute on function public.nearby_activities_with_avatars(
  double precision, double precision, integer, public.activity_kind[], timestamptz, integer
) from public, anon, authenticated;
grant execute on function public.nearby_activities_with_avatars(
  double precision, double precision, integer, public.activity_kind[], timestamptz, integer
) to anon, authenticated;
