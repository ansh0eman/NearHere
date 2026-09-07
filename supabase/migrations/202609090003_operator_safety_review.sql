-- Lesson 14: operator-only safety review.
-- Reports stay private. An empty operator table means nobody can review until
-- an explicit, audited operator account is provisioned outside the client.

create table private.operator_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.safety_reports
  add column status text not null default 'open',
  add column reviewed_by uuid references private.operator_accounts (user_id),
  add column reviewed_at timestamptz,
  add column resolution text,
  add constraint safety_reports_status check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  add constraint safety_reports_resolution_length check (resolution is null or char_length(resolution) <= 1000);

create index safety_reports_operator_queue
  on private.safety_reports (status, created_at desc);

revoke all on table private.operator_accounts from public, anon, authenticated;
alter table private.operator_accounts enable row level security;

create function private.is_operator(p_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from private.operator_accounts
    where user_id = p_user_id
  );
$$;

revoke all on function private.is_operator(uuid) from public, anon, authenticated;

create function public.operator_safety_reports(
  p_status text default 'open',
  p_limit integer default 50
)
returns table (
  report_id uuid,
  reporter_user_id uuid,
  reported_user_id uuid,
  activity_id uuid,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  resolution text
)
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null or not private.is_operator(v_actor_id) then
    raise exception using errcode = '42501', message = 'Operator access required.';
  end if;
  if p_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'Invalid report status.';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Limit must be between 1 and 100.';
  end if;
  return query
    select r.id, r.reporter_user_id, r.reported_user_id, r.activity_id,
      r.reason, r.details, r.status, r.created_at, r.reviewed_by,
      r.reviewed_at, r.resolution
    from private.safety_reports r
    where r.status = p_status
    order by r.created_at desc, r.id desc
    limit p_limit;
end;
$$;

create function public.review_safety_report(
  p_report_id uuid,
  p_decision text,
  p_resolution text default null
)
returns table (report_id uuid, status text, reviewed_at timestamptz)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_now timestamptz := now();
begin
  if v_actor_id is null or not private.is_operator(v_actor_id) then
    raise exception using errcode = '42501', message = 'Operator access required.';
  end if;
  if p_decision not in ('reviewing', 'resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'Invalid review decision.';
  end if;
  if p_resolution is not null and char_length(p_resolution) > 1000 then
    raise exception using errcode = '22023', message = 'Resolution must be at most 1000 characters.';
  end if;
  update private.safety_reports
  set status = p_decision,
      reviewed_by = v_actor_id,
      reviewed_at = v_now,
      resolution = nullif(btrim(coalesce(p_resolution, '')), '')
  where id = p_report_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Safety report not found.';
  end if;
  return query select p_report_id, p_decision, v_now;
end;
$$;

revoke execute on function public.operator_safety_reports(text, integer), public.review_safety_report(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.operator_safety_reports(text, integer), public.review_safety_report(uuid, text, text)
  to authenticated;
