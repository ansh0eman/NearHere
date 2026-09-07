-- Lesson 18: user-facing block command without exposing host identity fields.

create function public.block_activity_host(p_activity_id uuid)
returns table (blocked boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_host_id uuid;
begin
  if v_actor_id is null then raise exception using errcode = '28000', message = 'Authentication required.'; end if;
  select host_user_id into v_host_id from public.activities where id = p_activity_id;
  if not found then raise exception using errcode = 'P0002', message = 'Activity not found.'; end if;
  if v_host_id = v_actor_id then raise exception using errcode = '22023', message = 'You cannot block yourself.'; end if;
  insert into private.user_blocks (blocker_user_id, blocked_user_id)
  values (v_actor_id, v_host_id)
  on conflict (blocker_user_id, blocked_user_id) do nothing;
  return query select true;
end;
$$;

revoke execute on function public.block_activity_host(uuid) from public, anon, authenticated;
grant execute on function public.block_activity_host(uuid) to authenticated;
