-- The mobile client renders a sent message immediately. Its runtime contract
-- requires the same safe author projection as activity_messages(), so the
-- write receipt must include author_display_name too.

drop function public.send_activity_message(uuid, text);

create function public.send_activity_message(p_activity_id uuid, p_body text)
returns table (
  id uuid,
  activity_id uuid,
  author_user_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_body text := btrim(p_body);
begin
  if v_actor_id is null then raise exception using errcode = '28000', message = 'Authentication required.'; end if;
  if v_body is null or char_length(v_body) not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'Message must be between 1 and 1000 characters.';
  end if;
  if not exists (
    select 1 from public.activities as a
    join public.activity_memberships as m on m.activity_id = a.id
      and m.user_id = v_actor_id and m.status = 'accepted'
    where a.id = p_activity_id and a.status = 'published' and a.ends_at > now()
  ) then
    raise exception using errcode = '42501', message = 'Only an accepted member can send activity messages.';
  end if;

  return query
    with inserted as (
      insert into private.activity_messages (activity_id, author_user_id, body)
      values (p_activity_id, v_actor_id, v_body)
      returning activity_messages.id, activity_messages.activity_id,
        activity_messages.author_user_id, activity_messages.body,
        activity_messages.created_at
    )
    select inserted.id, inserted.activity_id, inserted.author_user_id,
      profile.display_name, inserted.body, inserted.created_at
    from inserted
    join public.profiles as profile on profile.id = inserted.author_user_id;
end;
$$;

revoke execute on function public.send_activity_message(uuid, text) from public, anon;
grant execute on function public.send_activity_message(uuid, text) to authenticated;
