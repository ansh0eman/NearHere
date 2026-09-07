-- Lesson 20: bounded operational observability for protected writes.

create table private.observability_events (
  id bigint generated always as identity primary key,
  severity text not null default 'info',
  event_name text not null,
  actor_user_id uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint observability_severity check (severity in ('info', 'warn', 'error')),
  constraint observability_event_name check (char_length(event_name) between 3 and 80),
  constraint observability_metadata_object check (jsonb_typeof(metadata) = 'object')
);
create index observability_events_recent on private.observability_events (created_at desc, id desc);
revoke all on table private.observability_events from public, anon, authenticated;
alter table private.observability_events enable row level security;

create function private.record_observability_event(
  p_severity text, p_event_name text, p_actor_user_id uuid, p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_severity not in ('info', 'warn', 'error') or char_length(p_event_name) not between 3 and 80 then return; end if;
  insert into private.observability_events (severity, event_name, actor_user_id, metadata)
  values (p_severity, p_event_name, p_actor_user_id, case when jsonb_typeof(p_metadata) = 'object' then p_metadata else '{}'::jsonb end);
end;
$$;
revoke all on function private.record_observability_event(text, text, uuid, jsonb) from public, anon, authenticated;

create or replace function private.enforce_rate_limit(p_scope text, p_limit integer, p_window interval, p_actor uuid)
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
    perform private.record_observability_event('warn', 'rate_limit_exceeded', p_actor, jsonb_build_object('scope', p_scope, 'limit', p_limit));
    raise exception using errcode = 'P0004', message = 'Rate limit exceeded. Please try again later.';
  end if;
  insert into private.rate_limit_events (actor_user_id, scope) values (p_actor, p_scope);
end;
$$;

create function public.operator_observability_events(p_limit integer default 100)
returns table (event_id bigint, severity text, event_name text, actor_user_id uuid, metadata jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null or not private.is_operator(v_actor_id) then raise exception using errcode = '42501', message = 'Operator access required.'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then raise exception using errcode = '22023', message = 'Limit must be between 1 and 200.'; end if;
  return query select e.id, e.severity, e.event_name, e.actor_user_id, e.metadata, e.created_at
    from private.observability_events e order by e.created_at desc, e.id desc limit p_limit;
end;
$$;
revoke execute on function public.operator_observability_events(integer) from public, anon, authenticated;
grant execute on function public.operator_observability_events(integer) to authenticated;
