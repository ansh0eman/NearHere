-- Hosts are accepted members too. Chat authorization must use status, not the
-- participant role, while still excluding pending/waitlisted callers.

create or replace function public.send_activity_message(p_activity_id uuid, p_body text)
returns table (id uuid, activity_id uuid, author_user_id uuid, body text, created_at timestamptz)
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
    insert into private.activity_messages (activity_id, author_user_id, body)
    values (p_activity_id, v_actor_id, v_body)
    returning activity_messages.id, activity_messages.activity_id, activity_messages.author_user_id,
      activity_messages.body, activity_messages.created_at;
end;
$$;

create or replace function public.activity_messages(p_activity_id uuid, p_limit integer default 50)
returns table (id uuid, activity_id uuid, author_user_id uuid, author_display_name text, body text, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null then raise exception using errcode = '28000', message = 'Authentication required.'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Message limit must be between 1 and 100.';
  end if;
  if not exists (
    select 1 from public.activities as a
    join public.activity_memberships as m on m.activity_id = a.id
      and m.user_id = v_actor_id and m.status = 'accepted'
    where a.id = p_activity_id
  ) then
    raise exception using errcode = '42501', message = 'Only an accepted member can read activity messages.';
  end if;
  return query
    select message.id, message.activity_id, message.author_user_id, profile.display_name,
      message.body, message.created_at
    from private.activity_messages as message
    join public.profiles as profile on profile.id = message.author_user_id
    where message.activity_id = p_activity_id
      and not exists (
        select 1 from private.user_blocks as block
        where (block.blocker_user_id = v_actor_id and block.blocked_user_id = message.author_user_id)
           or (block.blocker_user_id = message.author_user_id and block.blocked_user_id = v_actor_id)
      )
    order by message.created_at, message.id
    limit p_limit;
end;
$$;
