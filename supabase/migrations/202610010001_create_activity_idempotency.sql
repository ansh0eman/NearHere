-- A Host retry after a lost response must return the original activity instead
-- of creating a second private location and public marker. The request key is
-- scoped to the authenticated host and paired with a deterministic draft hash.

create table private.activity_creation_requests (
  host_user_id uuid not null references public.profiles (id) on delete cascade,
  request_id text not null,
  payload_hash text not null,
  activity_id uuid references public.activities (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (host_user_id, request_id),
  constraint activity_creation_requests_request_id_length check (char_length(request_id) between 8 and 160),
  constraint activity_creation_requests_payload_hash_shape check (payload_hash ~ '^[0-9a-f]{32}$')
);

revoke all on table private.activity_creation_requests from public, anon, authenticated;
alter table private.activity_creation_requests enable row level security;

create function public.create_activity_idempotent(
  p_request_id text,
  p_kind public.activity_kind,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_private_latitude double precision,
  p_private_longitude double precision,
  p_privacy_radius_m integer,
  p_capacity integer,
  p_join_mode public.activity_join_mode
)
returns table (
  id uuid,
  kind public.activity_kind,
  title text,
  description text,
  status public.activity_status,
  starts_at timestamptz,
  ends_at timestamptz,
  public_latitude double precision,
  public_longitude double precision,
  privacy_radius_m integer,
  host_display_name text,
  participant_count integer,
  capacity integer,
  join_mode public.activity_join_mode
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_existing_hash text;
  v_existing_activity_id uuid;
  v_payload_hash text;
  v_created record;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;
  if p_request_id is null or char_length(btrim(p_request_id)) not between 8 and 160 then
    raise exception using errcode = '22023', message = 'A valid publish request ID is required.';
  end if;

  -- JSONB canonicalizes object key order, so field ordering in the mobile
  -- payload cannot turn an unchanged retry into a different command.
  v_payload_hash := md5(jsonb_build_object(
    'capacity', p_capacity,
    'description', coalesce(p_description, ''),
    'endsAt', p_ends_at,
    'joinMode', p_join_mode,
    'kind', p_kind,
    'latitude', p_private_latitude,
    'longitude', p_private_longitude,
    'privacyRadiusM', p_privacy_radius_m,
    'startsAt', p_starts_at,
    'title', btrim(p_title)
  )::text);

  -- ON CONFLICT locks the existing row until its original transaction has
  -- committed, so concurrent retries cannot both proceed to create_activity.
  insert into private.activity_creation_requests (host_user_id, request_id, payload_hash)
  values (v_actor_id, btrim(p_request_id), v_payload_hash)
  on conflict (host_user_id, request_id) do update
    set request_id = excluded.request_id
  returning payload_hash, activity_id into v_existing_hash, v_existing_activity_id;

  if v_existing_hash <> v_payload_hash then
    raise exception using errcode = 'P0005', message = 'Publish request ID was reused with different activity details.';
  end if;

  if v_existing_activity_id is not null then
    return query
      select a.id, a.kind, a.title, a.description, a.status, a.starts_at, a.ends_at,
        extensions.st_y(a.public_point::extensions.geometry),
        extensions.st_x(a.public_point::extensions.geometry),
        a.privacy_radius_m, p.display_name,
        (select count(*)::integer from public.activity_memberships m where m.activity_id = a.id and m.status = 'accepted'),
        a.capacity::integer, a.join_mode
      from public.activities a
      join public.profiles p on p.id = a.host_user_id
      where a.id = v_existing_activity_id and a.host_user_id = v_actor_id;
    return;
  end if;

  select * into v_created
  from public.create_activity(
    p_kind, p_title, p_description, p_starts_at, p_ends_at,
    p_private_latitude, p_private_longitude, p_privacy_radius_m, p_capacity, p_join_mode
  );

  update private.activity_creation_requests
  set activity_id = v_created.id
  where host_user_id = v_actor_id and request_id = btrim(p_request_id);

  return query select
    v_created.id, v_created.kind, v_created.title, v_created.description,
    v_created.status, v_created.starts_at, v_created.ends_at,
    v_created.public_latitude, v_created.public_longitude, v_created.privacy_radius_m,
    v_created.host_display_name, v_created.participant_count, v_created.capacity,
    v_created.join_mode;
end;
$$;

revoke execute on function public.create_activity_idempotent(
  text, public.activity_kind, text, text, timestamptz, timestamptz,
  double precision, double precision, integer, integer, public.activity_join_mode
) from public, anon, authenticated;
grant execute on function public.create_activity_idempotent(
  text, public.activity_kind, text, text, timestamptz, timestamptz,
  double precision, double precision, integer, integer, public.activity_join_mode
) to authenticated;
