-- Lesson 12: minimal safety foundation before activity chat.
-- Reports and blocks are private operational data. Clients can submit through
-- narrowly scoped RPCs but cannot read or mutate the tables directly.

create table private.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete cascade,
  reason text not null,
  details text not null default '',
  created_at timestamptz not null default now(),
  constraint safety_reports_target check (reported_user_id is not null or activity_id is not null),
  constraint safety_reports_reason check (char_length(btrim(reason)) between 3 and 80),
  constraint safety_reports_details check (char_length(details) <= 1000),
  constraint safety_reports_not_self check (reported_user_id is null or reporter_user_id <> reported_user_id)
);

create unique index safety_reports_one_open_user_report
  on private.safety_reports (reporter_user_id, reported_user_id, activity_id)
  where reported_user_id is not null;

create table private.user_blocks (
  blocker_user_id uuid not null references public.profiles (id) on delete cascade,
  blocked_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  constraint user_blocks_not_self check (blocker_user_id <> blocked_user_id)
);

revoke all on table private.safety_reports, private.user_blocks from public, anon, authenticated;
alter table private.safety_reports enable row level security;
alter table private.user_blocks enable row level security;

create function public.report_safety_issue(
  p_reported_user_id uuid default null,
  p_activity_id uuid default null,
  p_reason text default null,
  p_details text default ''
)
returns table (reported boolean)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;
  if p_reported_user_id is null and p_activity_id is null then
    raise exception using errcode = '22023', message = 'A user or activity target is required.';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 80 then
    raise exception using errcode = '22023', message = 'Reason must be between 3 and 80 characters.';
  end if;
  if p_details is null or char_length(p_details) > 1000 then
    raise exception using errcode = '22023', message = 'Details must be at most 1000 characters.';
  end if;
  if p_reported_user_id = v_actor_id then
    raise exception using errcode = '22023', message = 'You cannot report yourself.';
  end if;
  insert into private.safety_reports (reporter_user_id, reported_user_id, activity_id, reason, details)
  values (v_actor_id, p_reported_user_id, p_activity_id, btrim(p_reason), p_details)
  on conflict (reporter_user_id, reported_user_id, activity_id)
    where reported_user_id is not null
    do update set reason = excluded.reason, details = excluded.details;
  return query select true;
end;
$$;

comment on function public.report_safety_issue(uuid, uuid, text, text) is
  'Accepts one idempotent authenticated safety report without exposing operational records.';

create function public.block_user(p_blocked_user_id uuid)
returns table (blocked boolean)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;
  if p_blocked_user_id is null or p_blocked_user_id = v_actor_id then
    raise exception using errcode = '22023', message = 'A different user is required.';
  end if;
  insert into private.user_blocks (blocker_user_id, blocked_user_id)
  values (v_actor_id, p_blocked_user_id)
  on conflict (blocker_user_id, blocked_user_id) do nothing;
  return query select true;
end;
$$;

comment on function public.block_user(uuid) is
  'Creates an idempotent private block relationship for the authenticated caller.';

create function public.unblock_user(p_blocked_user_id uuid)
returns table (unblocked boolean)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;
  delete from private.user_blocks
  where blocker_user_id = v_actor_id and blocked_user_id = p_blocked_user_id;
  return query select true;
end;
$$;

revoke execute on function public.report_safety_issue(uuid, uuid, text, text), public.block_user(uuid), public.unblock_user(uuid)
  from public, anon, authenticated;
grant execute on function public.report_safety_issue(uuid, uuid, text, text), public.block_user(uuid), public.unblock_user(uuid)
  to authenticated;
