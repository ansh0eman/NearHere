-- Lesson 11b: host-safe participant projection for moderation controls.
create function public.host_activity_participants(p_activity_id uuid)
returns table (
  participant_user_id uuid,
  participant_display_name text,
  membership_status public.activity_membership_status,
  joined_at timestamptz
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
  if not exists (
    select 1 from public.activities as a
    where a.id = p_activity_id and a.host_user_id = v_actor_id
  ) then
    raise exception using errcode = '42501', message = 'Activity is not hosted by the caller.';
  end if;
  return query
    select m.user_id, p.display_name, m.status, m.joined_at
    from public.activity_memberships as m
    join public.profiles as p on p.id = m.user_id
    where m.activity_id = p_activity_id
      and m.role = 'participant'
      and m.status in ('accepted', 'waitlisted')
    order by m.status, m.joined_at nulls last, m.created_at, m.user_id;
end;
$$;

comment on function public.host_activity_participants(uuid) is
  'Returns host-safe accepted and waitlisted participant identities without private location data.';

revoke execute on function public.host_activity_participants(uuid)
  from public, anon, authenticated;
grant execute on function public.host_activity_participants(uuid)
  to authenticated;
