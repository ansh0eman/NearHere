-- Operators need an explicit, auditable recovery path when new information
-- arrives after a report was resolved or dismissed.

create or replace function public.review_safety_report(
  p_report_id uuid,
  p_decision text,
  p_resolution text default null
)
returns table (report_id uuid, status text, reviewed_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_now timestamptz := now();
begin
  if v_actor_id is null or not private.is_operator(v_actor_id) then
    raise exception using errcode = '42501', message = 'Operator access required.';
  end if;
  if p_decision not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'Invalid review decision.';
  end if;
  if p_resolution is not null and char_length(p_resolution) > 1000 then
    raise exception using errcode = '22023', message = 'Resolution must be at most 1000 characters.';
  end if;
  update private.safety_reports
  set status = p_decision,
      reviewed_by = v_actor_id,
      reviewed_at = v_now,
      resolution = case when p_decision = 'open' then null else nullif(btrim(coalesce(p_resolution, '')), '') end
  where id = p_report_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Safety report not found.';
  end if;
  return query select p_report_id, p_decision, v_now;
end;
$$;
