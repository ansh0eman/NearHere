-- Lesson 7 follow-up: preserve moderation decisions and make host handling
-- explicit. Migration 003 is already deployed, so this forward-only migration
-- replaces the function without rewriting database history.

create or replace function public.join_activity(p_activity_id uuid)
returns table (
  membership_status public.activity_membership_status,
  participant_count integer
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_capacity integer;
  v_join_mode public.activity_join_mode;
  v_existing_role public.activity_membership_role;
  v_existing_status public.activity_membership_status;
  v_next_status public.activity_membership_status;
  v_accepted_count integer;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_actor_id
      and p.onboarding_status = 'complete'
  ) then
    raise exception using errcode = 'P0001', message = 'Complete your profile before joining.';
  end if;

  select a.capacity::integer, a.join_mode
    into v_capacity, v_join_mode
    from public.activities as a
    where a.id = p_activity_id
      and a.status = 'published'
      and a.ends_at > now()
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Activity is unavailable.';
  end if;

  select m.role, m.status
    into v_existing_role, v_existing_status
    from public.activity_memberships as m
    where m.activity_id = p_activity_id
      and m.user_id = v_actor_id;

  -- The host is already an accepted member. Check the role independently so
  -- future maintenance cannot accidentally convert a host into a participant.
  if v_existing_role = 'host' then
    return query
      select
        'accepted'::public.activity_membership_status,
        count(*)::integer
      from public.activity_memberships as m
      where m.activity_id = p_activity_id
        and m.status = 'accepted';
    return;
  end if;

  if v_existing_status in ('accepted', 'pending', 'waitlisted') then
    return query
      select
        v_existing_status,
        count(*)::integer
      from public.activity_memberships as m
      where m.activity_id = p_activity_id
        and m.status = 'accepted';
    return;
  end if;

  -- A host or moderator must explicitly reverse rejection/removal. Treating
  -- these states like a voluntary leave would bypass that decision.
  if v_existing_status in ('rejected', 'removed') then
    raise exception using errcode = 'P0003', message = 'Membership is blocked.';
  end if;

  select count(*)::integer
    into v_accepted_count
    from public.activity_memberships as m
    where m.activity_id = p_activity_id
      and m.status = 'accepted';

  if v_join_mode = 'approval' then
    v_next_status := 'pending';
  elsif v_accepted_count < v_capacity then
    v_next_status := 'accepted';
  else
    v_next_status := 'waitlisted';
  end if;

  insert into public.activity_memberships (
    activity_id,
    user_id,
    role,
    status,
    joined_at
  )
  values (
    p_activity_id,
    v_actor_id,
    'participant',
    v_next_status,
    case when v_next_status = 'accepted' then now() else null end
  )
  on conflict (activity_id, user_id) do update
    set role = 'participant',
        status = excluded.status,
        joined_at = excluded.joined_at,
        created_at = now();

  return query
    select
      v_next_status,
      count(*)::integer
    from public.activity_memberships as m
    where m.activity_id = p_activity_id
      and m.status = 'accepted';
end;
$$;
