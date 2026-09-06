-- Lesson 10: add one activity-detail read model and a host-owned cancellation
-- command. Public activity facts remain browseable without an account, while
-- caller-specific membership and exact coordinates are projected by the
-- database instead of exposing either backing table directly.

create function public.activity_detail(p_activity_id uuid)
returns table (
  id uuid,
  kind public.activity_kind,
  title text,
  description text,
  status public.activity_status,
  starts_at timestamptz,
  ends_at timestamptz,
  public_latitude double precision,
  public_longitude double precision,
  privacy_radius_m integer,
  host_display_name text,
  participant_count integer,
  capacity integer,
  join_mode public.activity_join_mode,
  membership_role public.activity_membership_role,
  membership_status public.activity_membership_status,
  exact_latitude double precision,
  exact_longitude double precision
)
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
begin
  if p_activity_id is null then
    raise exception using errcode = '22023', message = 'Activity ID is required.';
  end if;

  if not exists (
    select 1
    from public.activities as activity
    where activity.id = p_activity_id
  ) then
    raise exception using errcode = 'P0002', message = 'Activity not found.';
  end if;

  return query
    select
      activity.id,
      activity.kind,
      activity.title,
      activity.description,
      activity.status,
      activity.starts_at,
      activity.ends_at,
      extensions.st_y(activity.public_point::extensions.geometry),
      extensions.st_x(activity.public_point::extensions.geometry),
      activity.privacy_radius_m,
      host.display_name,
      (
        select count(*)::integer
        from public.activity_memberships as accepted
        where accepted.activity_id = activity.id
          and accepted.status = 'accepted'
      ),
      activity.capacity::integer,
      activity.join_mode,
      membership.role,
      membership.status,
      case
        when membership.status = 'accepted'
          and activity.status = 'published'
          and activity.ends_at > now()
          then extensions.st_y(location.meeting_point::extensions.geometry)
        else null
      end,
      case
        when membership.status = 'accepted'
          and activity.status = 'published'
          and activity.ends_at > now()
          then extensions.st_x(location.meeting_point::extensions.geometry)
        else null
      end
    from public.activities as activity
    join public.profiles as host on host.id = activity.host_user_id
    left join public.activity_memberships as membership
      on membership.activity_id = activity.id
      and membership.user_id = v_actor_id
    left join private.activity_locations as location
      on location.activity_id = activity.id
      and membership.status = 'accepted'
      and activity.status = 'published'
      and activity.ends_at > now()
    where activity.id = p_activity_id;
end;
$$;

comment on function public.activity_detail(uuid) is
  'Returns public activity detail plus caller membership, releasing exact coordinates only to accepted members of an active published activity.';

revoke execute on function public.activity_detail(uuid)
  from public, anon, authenticated;
grant execute on function public.activity_detail(uuid)
  to anon, authenticated;

create function public.cancel_activity(p_activity_id uuid)
returns table (
  activity_id uuid,
  status public.activity_status,
  cancelled_at timestamptz
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_status public.activity_status;
  v_ends_at timestamptz;
  v_cancelled_at timestamptz;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  if p_activity_id is null then
    raise exception using errcode = '22023', message = 'Activity ID is required.';
  end if;

  -- The host predicate authorizes and the row lock serializes cancellation
  -- against Join, Leave, and host decisions for this activity.
  select activity.status, activity.ends_at, activity.cancelled_at
    into v_status, v_ends_at, v_cancelled_at
    from public.activities as activity
    where activity.id = p_activity_id
      and activity.host_user_id = v_actor_id
    for update;

  if not found then
    raise exception using errcode = '42501', message = 'Activity is not hosted by the caller.';
  end if;

  -- Retrying the same command returns the original durable cancellation time.
  if v_status = 'cancelled' then
    return query select p_activity_id, v_status, v_cancelled_at;
    return;
  end if;

  if v_status <> 'published' or v_ends_at <= now() then
    raise exception using errcode = 'P0003', message = 'Only an active published activity can be cancelled.';
  end if;

  update public.activities as activity
    set status = 'cancelled',
        cancelled_at = now()
    where activity.id = p_activity_id
    returning activity.status, activity.cancelled_at
      into v_status, v_cancelled_at;

  return query select p_activity_id, v_status, v_cancelled_at;
end;
$$;

comment on function public.cancel_activity(uuid) is
  'Lets the host atomically cancel a published activity; retries return the original cancellation result.';

revoke execute on function public.cancel_activity(uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_activity(uuid)
  to authenticated;
