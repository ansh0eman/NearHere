-- Lesson 16: blocking affects future participation and private access.
-- Existing membership rows remain durable for auditability; the actor must
-- explicitly leave/remove. Exact points and new joins are immediately gated.

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
  if exists (
    select 1 from private.user_blocks block
    where (block.blocker_user_id = v_actor_id and block.blocked_user_id = v_host_id)
       or (block.blocker_user_id = v_host_id and block.blocked_user_id = v_actor_id)
  ) then
    raise exception using errcode = '42501', message = 'Activity unavailable because of a block.';
  end if;
  select m.role, m.status into v_existing_role, v_existing_status
  from public.activity_memberships m where m.activity_id = p_activity_id and m.user_id = v_actor_id;
  if v_existing_role = 'host' then
    return query select 'accepted'::public.activity_membership_status, count(*)::integer
      from public.activity_memberships m where m.activity_id = p_activity_id and m.status = 'accepted'; return;
  end if;
  if v_existing_status in ('accepted', 'pending', 'waitlisted') then
    return query select v_existing_status, count(*)::integer
      from public.activity_memberships m where m.activity_id = p_activity_id and m.status = 'accepted'; return;
  end if;
  if v_existing_status in ('rejected', 'removed') then
    raise exception using errcode = 'P0003', message = 'Membership is blocked.';
  end if;
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

create or replace function public.activity_detail(p_activity_id uuid)
returns table (
  id uuid, kind public.activity_kind, title text, description text,
  status public.activity_status, starts_at timestamptz, ends_at timestamptz,
  public_latitude double precision, public_longitude double precision,
  privacy_radius_m integer, host_display_name text, participant_count integer,
  capacity integer, join_mode public.activity_join_mode,
  membership_role public.activity_membership_role,
  membership_status public.activity_membership_status,
  exact_latitude double precision, exact_longitude double precision
)
language plpgsql stable security definer set search_path = ''
as $$
declare v_actor_id uuid := (select auth.uid());
begin
  if p_activity_id is null then raise exception using errcode = '22023', message = 'Activity ID is required.'; end if;
  if not exists (select 1 from public.activities activity where activity.id = p_activity_id) then
    raise exception using errcode = 'P0002', message = 'Activity not found.';
  end if;
  return query
    select activity.id, activity.kind, activity.title, activity.description, activity.status,
      activity.starts_at, activity.ends_at,
      extensions.st_y(activity.public_point::extensions.geometry), extensions.st_x(activity.public_point::extensions.geometry),
      activity.privacy_radius_m, host.display_name,
      (select count(*)::integer from public.activity_memberships accepted where accepted.activity_id = activity.id and accepted.status = 'accepted'),
      activity.capacity::integer, activity.join_mode, membership.role, membership.status,
      case when membership.status = 'accepted' and activity.status = 'published' and activity.ends_at > now()
        and not exists (select 1 from private.user_blocks block where (block.blocker_user_id = v_actor_id and block.blocked_user_id = activity.host_user_id) or (block.blocker_user_id = activity.host_user_id and block.blocked_user_id = v_actor_id))
        then extensions.st_y(location.meeting_point::extensions.geometry) else null end,
      case when membership.status = 'accepted' and activity.status = 'published' and activity.ends_at > now()
        and not exists (select 1 from private.user_blocks block where (block.blocker_user_id = v_actor_id and block.blocked_user_id = activity.host_user_id) or (block.blocker_user_id = activity.host_user_id and block.blocked_user_id = v_actor_id))
        then extensions.st_x(location.meeting_point::extensions.geometry) else null end
    from public.activities activity join public.profiles host on host.id = activity.host_user_id
    left join public.activity_memberships membership on membership.activity_id = activity.id and membership.user_id = v_actor_id
    left join private.activity_locations location on location.activity_id = activity.id
      and membership.status = 'accepted' and activity.status = 'published' and activity.ends_at > now()
    where activity.id = p_activity_id;
end;
$$;
