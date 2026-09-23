-- Lesson 19: database-enforced rate limits for sensitive writes.
-- These are abuse guards, not billing/analytics counters. They fail closed
-- for the protected write and use a transaction advisory lock per actor/scope
-- so two concurrent requests cannot both pass the same stale count.

create table private.rate_limit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references public.profiles (id) on delete cascade,
  scope text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_events_lookup on private.rate_limit_events (actor_user_id, scope, created_at desc);
revoke all on table private.rate_limit_events from public, anon, authenticated;
alter table private.rate_limit_events enable row level security;

create function private.enforce_rate_limit(p_scope text, p_limit integer, p_window interval, p_actor uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_count integer; v_lock_key bigint;
begin
  if p_actor is null then return; end if;
  v_lock_key := hashtextextended(p_scope || ':' || p_actor::text, 0);
  perform pg_advisory_xact_lock(v_lock_key);
  select count(*)::integer into v_count from private.rate_limit_events
    where actor_user_id = p_actor and scope = p_scope and created_at >= now() - p_window;
  if v_count >= p_limit then
    raise exception using errcode = 'P0004', message = 'Rate limit exceeded. Please try again later.';
  end if;
  insert into private.rate_limit_events (actor_user_id, scope) values (p_actor, p_scope);
end;
$$;
revoke all on function private.enforce_rate_limit(text, integer, interval, uuid) from public, anon, authenticated;

create function private.rate_limit_sensitive_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_scope text; v_limit integer; v_window interval;
begin
  if tg_table_name = 'activity_messages' then v_scope := 'activity_message'; v_limit := 30; v_window := interval '1 minute';
  elsif tg_table_name = 'safety_reports' then v_scope := 'safety_report'; v_limit := 10; v_window := interval '1 hour';
  elsif tg_table_name = 'user_blocks' then v_scope := 'user_block'; v_limit := 20; v_window := interval '1 hour';
  elsif tg_table_name = 'activity_memberships' and new.role = 'participant' then v_scope := 'join_activity'; v_limit := 20; v_window := interval '1 minute';
  else return new;
  end if;
  perform private.enforce_rate_limit(v_scope, v_limit, v_window, v_actor);
  return new;
end;
$$;
revoke all on function private.rate_limit_sensitive_write() from public, anon, authenticated;

create trigger activity_messages_rate_limit after insert on private.activity_messages
  for each row execute function private.rate_limit_sensitive_write();
create trigger safety_reports_rate_limit after insert on private.safety_reports
  for each row execute function private.rate_limit_sensitive_write();
create trigger user_blocks_rate_limit after insert on private.user_blocks
  for each row execute function private.rate_limit_sensitive_write();
create trigger activity_memberships_rate_limit after insert on public.activity_memberships
  for each row execute function private.rate_limit_sensitive_write();
