-- Lesson 7: make joining an activity a single capacity-safe database action.
-- The activity row is locked while capacity is checked so two simultaneous
-- requests cannot both claim the final place.

create function public.join_activity(p_activity_id uuid)
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

  -- FOR UPDATE serializes join decisions for the same activity. Requests for
  -- different activities can still proceed concurrently.
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

  select m.status
    into v_existing_status
    from public.activity_memberships as m
    where m.activity_id = p_activity_id
      and m.user_id = v_actor_id;

  -- Joining is idempotent. Network retries return the durable state instead
  -- of duplicating membership or consuming capacity twice.
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
        joined_at = excluded.joined_at;

  return query
    select
      v_next_status,
      count(*)::integer
    from public.activity_memberships as m
    where m.activity_id = p_activity_id
      and m.status = 'accepted';
end;
$$;

revoke execute on function public.join_activity(uuid)
  from public, anon, authenticated;
grant execute on function public.join_activity(uuid)
  to authenticated;
