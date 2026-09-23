-- Lesson 17: immutable safety audit events.
-- Triggers capture safety state changes at the database boundary so a client
-- cannot forget to log a report, block, or operator decision.

create table private.safety_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  report_id uuid references private.safety_reports (id) on delete set null,
  subject_user_id uuid references public.profiles (id) on delete set null,
  activity_id uuid references public.activities (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint safety_audit_event_type check (event_type in ('report_created', 'report_reviewed', 'user_blocked', 'user_unblocked')),
  constraint safety_audit_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index safety_audit_events_created_at on private.safety_audit_events (created_at desc, id desc);
create index safety_audit_events_report on private.safety_audit_events (report_id, created_at desc);
revoke all on table private.safety_audit_events from public, anon, authenticated;
alter table private.safety_audit_events enable row level security;

create function private.record_safety_audit_event()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_table_name = 'safety_reports' then
    if tg_op = 'INSERT' then
      insert into private.safety_audit_events (actor_user_id, event_type, report_id, subject_user_id, activity_id, metadata)
      values (new.reporter_user_id, 'report_created', new.id, new.reported_user_id, new.activity_id,
        jsonb_build_object('reason', new.reason, 'status', new.status));
    elsif tg_op = 'UPDATE' and (old.status is distinct from new.status or old.resolution is distinct from new.resolution) then
      insert into private.safety_audit_events (actor_user_id, event_type, report_id, subject_user_id, activity_id, metadata)
      values (new.reviewed_by, 'report_reviewed', new.id, new.reported_user_id, new.activity_id,
        jsonb_build_object('from_status', old.status, 'to_status', new.status, 'resolution_present', new.resolution is not null));
    end if;
  elsif tg_table_name = 'user_blocks' then
    insert into private.safety_audit_events (actor_user_id, event_type, subject_user_id, metadata)
    values (coalesce(new.blocker_user_id, old.blocker_user_id),
      case when tg_op = 'DELETE' then 'user_unblocked' else 'user_blocked' end,
      coalesce(new.blocked_user_id, old.blocked_user_id), '{}'::jsonb);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.record_safety_audit_event() from public, anon, authenticated;
create trigger safety_reports_audit_event
  after insert or update of status, resolution on private.safety_reports
  for each row execute function private.record_safety_audit_event();
create trigger user_blocks_audit_event
  after insert or delete on private.user_blocks
  for each row execute function private.record_safety_audit_event();

create function public.operator_safety_audit_events(p_limit integer default 100)
returns table (
  event_id uuid,
  actor_user_id uuid,
  event_type text,
  report_id uuid,
  subject_user_id uuid,
  activity_id uuid,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null or not private.is_operator(v_actor_id) then
    raise exception using errcode = '42501', message = 'Operator access required.';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception using errcode = '22023', message = 'Limit must be between 1 and 200.';
  end if;
  return query select e.id, e.actor_user_id, e.event_type, e.report_id, e.subject_user_id,
    e.activity_id, e.metadata, e.created_at
    from private.safety_audit_events e order by e.created_at desc, e.id desc limit p_limit;
end;
$$;

revoke execute on function public.operator_safety_audit_events(integer) from public, anon, authenticated;
grant execute on function public.operator_safety_audit_events(integer) to authenticated;
