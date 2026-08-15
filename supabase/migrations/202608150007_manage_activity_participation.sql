-- Lesson 9: complete the first participation state machine with transactional
-- leave, host approval/rejection, and deterministic waitlist promotion.
--
-- Capacity is an invariant shared by join, approve, and leave. Every operation
-- that can consume or release a place locks the parent activity row first. That
-- gives one serialization point per activity without blocking participation in
-- unrelated activities.

create index activity_memberships_participant_queue
  on public.activity_memberships (activity_id, status, created_at, user_id)
  where role = 'participant'
    and status in ('pending', 'waitlisted');

comment on index public.activity_memberships_participant_queue is
  'Supports host request reads and deterministic FIFO waitlist promotion.';

create function public.leave_activity(p_activity_id uuid)
returns table (
  membership_status public.activity_membership_status,
  participant_count integer,
  waitlist_promoted boolean
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_activity_status public.activity_status;
  v_ends_at timestamptz;
  v_role public.activity_membership_role;
  v_status public.activity_membership_status;
  v_promoted_user_id uuid;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  -- This is the shared serialization point for every capacity-affecting
  -- operation on one activity. The row is locked even when a pending or
  -- waitlisted member leaves so the state transition has one ordering rule.
  select a.status, a.ends_at
    into v_activity_status, v_ends_at
    from public.activities as a
    where a.id = p_activity_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Activity not found.';
  end if;

  select m.role, m.status
    into v_role, v_status
    from public.activity_memberships as m
    where m.activity_id = p_activity_id
      and m.user_id = v_actor_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Activity membership not found.';
  end if;

  -- Hosting is ownership, not an ordinary participant membership. A later
  -- cancel/transfer-host workflow must handle it explicitly.
  if v_role = 'host' then
    raise exception using errcode = 'P0003', message = 'A host cannot leave their own activity.';
  end if;

  -- Retried requests return the durable terminal state without another write.
  if v_status = 'left' then
    return query
      select
        'left'::public.activity_membership_status,
        count(*)::integer,
        false
      from public.activity_memberships as accepted
      where accepted.activity_id = p_activity_id
        and accepted.status = 'accepted';
    return;
  end if;

  if v_status in ('rejected', 'removed') then
    raise exception using errcode = 'P0003', message = 'Membership cannot transition to left.';
  end if;

  update public.activity_memberships as membership
    set status = 'left',
        joined_at = null
    where membership.activity_id = p_activity_id
      and membership.user_id = v_actor_id;

  -- Only an accepted departure creates a place. Promote the oldest durable
  -- waitlist entry; user_id is the deterministic tie-breaker for equal clocks.
  -- Ended or cancelled activities never reveal exact locations to a new member.
  if v_status = 'accepted'
    and v_activity_status = 'published'
    and v_ends_at > now() then
    select queued.user_id
      into v_promoted_user_id
      from public.activity_memberships as queued
      where queued.activity_id = p_activity_id
        and queued.role = 'participant'
        and queued.status = 'waitlisted'
      order by queued.created_at, queued.user_id
      limit 1
      for update;

    if found then
      update public.activity_memberships as promoted
        set status = 'accepted',
            joined_at = now()
        where promoted.activity_id = p_activity_id
          and promoted.user_id = v_promoted_user_id;
    end if;
  end if;

  return query
    select
      'left'::public.activity_membership_status,
      count(*)::integer,
      v_promoted_user_id is not null
    from public.activity_memberships as accepted
    where accepted.activity_id = p_activity_id
      and accepted.status = 'accepted';
end;
$$;

comment on function public.leave_activity(uuid) is
  'Leaves a participant membership and atomically promotes the FIFO waitlist when an active place opens.';

revoke execute on function public.leave_activity(uuid)
  from public, anon, authenticated;
grant execute on function public.leave_activity(uuid)
  to authenticated;

create function public.decide_activity_request(
  p_activity_id uuid,
  p_requester_user_id uuid,
  p_decision text
)
returns table (
  membership_status public.activity_membership_status,
  participant_count integer
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_activity_status public.activity_status;
  v_ends_at timestamptz;
  v_capacity integer;
  v_request_role public.activity_membership_role;
  v_request_status public.activity_membership_status;
  v_next_status public.activity_membership_status;
  v_accepted_count integer;
  v_decision text := lower(btrim(p_decision));
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  if v_decision is null or v_decision not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'Decision must be approve or reject.';
  end if;

  -- Scoping the lock by host_user_id both authorizes the actor and serializes
  -- this decision with joins, leaves, and other host decisions.
  select a.status, a.ends_at, a.capacity::integer
    into v_activity_status, v_ends_at, v_capacity
    from public.activities as a
    where a.id = p_activity_id
      and a.host_user_id = v_actor_id
    for update;

  if not found then
    raise exception using errcode = '42501', message = 'Activity is not hosted by the caller.';
  end if;

  select request.role, request.status
    into v_request_role, v_request_status
    from public.activity_memberships as request
    where request.activity_id = p_activity_id
      and request.user_id = p_requester_user_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Membership request not found.';
  end if;

  if v_request_role <> 'participant' then
    raise exception using errcode = 'P0003', message = 'Host membership cannot be moderated.';
  end if;

  -- A retry of the same decision is safe. `waitlisted` is a successful host
  -- approval whose place is deferred until capacity opens.
  if (v_decision = 'approve' and v_request_status in ('accepted', 'waitlisted'))
    or (v_decision = 'reject' and v_request_status = 'rejected') then
    return query
      select
        v_request_status,
        count(*)::integer
      from public.activity_memberships as accepted
      where accepted.activity_id = p_activity_id
        and accepted.status = 'accepted';
    return;
  end if;

  if v_request_status <> 'pending' then
    raise exception using errcode = 'P0003', message = 'Only a pending request can be decided.';
  end if;

  if v_decision = 'reject' then
    v_next_status := 'rejected';
  else
    if v_activity_status <> 'published' or v_ends_at <= now() then
      raise exception using errcode = 'P0002', message = 'Activity is unavailable for approval.';
    end if;

    select count(*)::integer
      into v_accepted_count
      from public.activity_memberships as accepted
      where accepted.activity_id = p_activity_id
        and accepted.status = 'accepted';

    if v_accepted_count < v_capacity then
      v_next_status := 'accepted';
    else
      v_next_status := 'waitlisted';
    end if;
  end if;

  update public.activity_memberships as request
    set status = v_next_status,
        joined_at = case when v_next_status = 'accepted' then now() else null end
    where request.activity_id = p_activity_id
      and request.user_id = p_requester_user_id;

  return query
    select
      v_next_status,
      count(*)::integer
    from public.activity_memberships as accepted
    where accepted.activity_id = p_activity_id
      and accepted.status = 'accepted';
end;
$$;

comment on function public.decide_activity_request(uuid, uuid, text) is
  'Lets an activity host approve or reject one pending request without exceeding capacity.';

revoke execute on function public.decide_activity_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.decide_activity_request(uuid, uuid, text)
  to authenticated;

-- This is a read model rather than a table grant: the host receives only the
-- identity and timestamp necessary to make a decision, never private location.
create function public.host_pending_activity_requests(
  p_activity_id uuid,
  p_limit integer default 50
)
returns table (
  requester_user_id uuid,
  requester_display_name text,
  requested_at timestamptz
)
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Request limit must be between 1 and 100.';
  end if;

  if not exists (
    select 1
    from public.activities as activity
    where activity.id = p_activity_id
      and activity.host_user_id = v_actor_id
  ) then
    raise exception using errcode = '42501', message = 'Activity is not hosted by the caller.';
  end if;

  return query
    select
      request.user_id,
      requester.display_name,
      request.created_at
    from public.activity_memberships as request
    join public.profiles as requester on requester.id = request.user_id
    where request.activity_id = p_activity_id
      and request.role = 'participant'
      and request.status = 'pending'
    order by request.created_at, request.user_id
    limit p_limit;
end;
$$;

comment on function public.host_pending_activity_requests(uuid, integer) is
  'Returns the bounded FIFO pending-request queue only to the activity host.';

revoke execute on function public.host_pending_activity_requests(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.host_pending_activity_requests(uuid, integer)
  to authenticated;
