-- Lesson 11: host-only participant removal with atomic FIFO promotion.
-- The activity row is the same serialization point used by Join, Leave, and
-- host decisions, so removal cannot race a capacity decision.

create function public.remove_activity_participant(
  p_activity_id uuid,
  p_participant_user_id uuid
)
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
  v_target_role public.activity_membership_role;
  v_target_status public.activity_membership_status;
  v_promoted_user_id uuid;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  select a.status, a.ends_at
    into v_activity_status, v_ends_at
    from public.activities as a
    where a.id = p_activity_id
      and a.host_user_id = v_actor_id
    for update;

  if not found then
    raise exception using errcode = '42501', message = 'Activity is not hosted by the caller.';
  end if;

  select m.role, m.status
    into v_target_role, v_target_status
    from public.activity_memberships as m
    where m.activity_id = p_activity_id
      and m.user_id = p_participant_user_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Participant membership not found.';
  end if;

  if v_target_role <> 'participant' then
    raise exception using errcode = 'P0003', message = 'The activity host cannot be removed.';
  end if;

  if v_target_status = 'removed' then
    return query
      select 'removed'::public.activity_membership_status,
        count(*)::integer, false
      from public.activity_memberships as m
      where m.activity_id = p_activity_id and m.status = 'accepted';
    return;
  end if;

  if v_target_status not in ('accepted', 'waitlisted') then
    raise exception using errcode = 'P0003', message = 'Only an accepted or waitlisted participant can be removed.';
  end if;

  update public.activity_memberships as m
    set status = 'removed', joined_at = null
    where m.activity_id = p_activity_id
      and m.user_id = p_participant_user_id;

  if v_target_status = 'accepted'
    and v_activity_status = 'published'
    and v_ends_at > now() then
    select queued.user_id into v_promoted_user_id
      from public.activity_memberships as queued
      where queued.activity_id = p_activity_id
        and queued.role = 'participant'
        and queued.status = 'waitlisted'
      order by queued.created_at, queued.user_id
      limit 1
      for update;

    if found then
      update public.activity_memberships as promoted
        set status = 'accepted', joined_at = now()
        where promoted.activity_id = p_activity_id
          and promoted.user_id = v_promoted_user_id;
    end if;
  end if;

  return query
    select 'removed'::public.activity_membership_status,
      count(*)::integer,
      v_promoted_user_id is not null
    from public.activity_memberships as m
    where m.activity_id = p_activity_id and m.status = 'accepted';
end;
$$;

comment on function public.remove_activity_participant(uuid, uuid) is
  'Allows an activity host to remove an accepted or waitlisted participant and atomically promote the FIFO waitlist.';

revoke execute on function public.remove_activity_participant(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.remove_activity_participant(uuid, uuid)
  to authenticated;
