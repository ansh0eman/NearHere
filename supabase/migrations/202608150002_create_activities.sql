-- Lesson 6: create the first real activity boundary. Exact meeting geometry is
-- isolated in a non-exposed schema; public discovery receives only a derived
-- approximate point through a deliberately shaped database function.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.activity_kind as enum (
  'walk',
  'coffee',
  'sports',
  'study',
  'coworking',
  'creative',
  'other'
);

create type public.activity_status as enum (
  'published',
  'cancelled',
  'completed'
);

create type public.activity_join_mode as enum ('open', 'approval');
create type public.activity_membership_role as enum ('host', 'participant');
create type public.activity_membership_status as enum (
  'pending',
  'accepted',
  'waitlisted',
  'rejected',
  'left',
  'removed'
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles (id) on delete restrict,
  kind public.activity_kind not null,
  title text not null,
  description text not null default '',
  status public.activity_status not null default 'published',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  public_point extensions.geography(Point, 4326) not null,
  privacy_radius_m integer not null,
  capacity smallint not null,
  join_mode public.activity_join_mode not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activities_title_length
    check (char_length(btrim(title)) between 3 and 80),
  constraint activities_description_length
    check (char_length(description) <= 1000),
  constraint activities_time_order
    check (ends_at > starts_at),
  constraint activities_duration_limit
    check (ends_at <= starts_at + interval '24 hours'),
  constraint activities_privacy_radius
    check (privacy_radius_m between 150 and 1000),
  constraint activities_capacity
    check (capacity between 2 and 50),
  constraint activities_cancellation_consistency
    check (
      (status = 'cancelled' and cancelled_at is not null)
      or (status <> 'cancelled' and cancelled_at is null)
    )
);

comment on table public.activities is
  'Public-safe activity facts. Exact meeting geometry is stored separately.';
comment on column public.activities.public_point is
  'Server-derived approximate point used for anonymous discovery.';
comment on column public.activities.privacy_radius_m is
  'Maximum displacement between the exact and approximate meeting points.';

create table private.activity_locations (
  activity_id uuid primary key references public.activities (id) on delete cascade,
  meeting_point extensions.geography(Point, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_memberships (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.activity_membership_role not null default 'participant',
  status public.activity_membership_status not null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (activity_id, user_id),
  constraint activity_memberships_host_is_accepted
    check (role <> 'host' or (status = 'accepted' and joined_at is not null)),
  constraint activity_memberships_joined_at_consistency
    check ((status = 'accepted') = (joined_at is not null))
);

comment on table public.activity_memberships is
  'Durable activity participation state. Lesson 6 writes only the host row.';

comment on table private.activity_locations is
  'Exact meeting geometry. Never expose this schema through the Data API.';

create index activities_public_point_gist
  on public.activities using gist (public_point);
create index activities_discovery_window
  on public.activities (status, starts_at, id)
  where status = 'published';
create index activities_host_created
  on public.activities (host_user_id, created_at desc);
create unique index activity_memberships_one_host
  on public.activity_memberships (activity_id)
  where role = 'host';
create index activity_memberships_accepted_count
  on public.activity_memberships (activity_id, status)
  where status = 'accepted';
create index activity_memberships_user_plans
  on public.activity_memberships (user_id, status, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_activities_updated_at
  before update on public.activities
  for each row execute function private.set_updated_at();

create trigger set_activity_locations_updated_at
  before update on private.activity_locations
  for each row execute function private.set_updated_at();

create trigger set_activity_memberships_updated_at
  before update on public.activity_memberships
  for each row execute function private.set_updated_at();

revoke execute on function private.set_updated_at()
  from public, anon, authenticated;

alter table public.activities enable row level security;
alter table private.activity_locations enable row level security;
alter table public.activity_memberships enable row level security;

revoke all on table public.activities from anon, authenticated;
revoke all on table private.activity_locations from anon, authenticated;
revoke all on table public.activity_memberships from anon, authenticated;

create function public.create_activity(
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
  v_activity_id uuid;
  v_host_display_name text;
  v_private_point extensions.geography(Point, 4326);
  v_public_point extensions.geography(Point, 4326);
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  select p.display_name
    into v_host_display_name
    from public.profiles as p
    where p.id = v_actor_id
      and p.onboarding_status = 'complete';

  if v_host_display_name is null then
    raise exception using errcode = 'P0001', message = 'Complete your profile before hosting.';
  end if;

  if p_private_latitude < -90 or p_private_latitude > 90
    or p_private_longitude < -180 or p_private_longitude > 180 then
    raise exception using errcode = '22023', message = 'Invalid meeting coordinates.';
  end if;

  if p_starts_at <= now() then
    raise exception using errcode = '22023', message = 'Activity must start in the future.';
  end if;

  v_private_point := extensions.st_setsrid(
    extensions.st_makepoint(p_private_longitude, p_private_latitude),
    4326
  )::extensions.geography;

  -- Displace the public marker into the outer 40% of the configured privacy
  -- radius. The exact point never enters the public activity table.
  v_public_point := extensions.st_project(
    v_private_point,
    p_privacy_radius_m * (0.6 + random() * 0.4),
    random() * 2 * pi()
  );

  insert into public.activities (
    host_user_id,
    kind,
    title,
    description,
    starts_at,
    ends_at,
    public_point,
    privacy_radius_m,
    capacity,
    join_mode
  )
  values (
    v_actor_id,
    p_kind,
    btrim(p_title),
    coalesce(p_description, ''),
    p_starts_at,
    p_ends_at,
    v_public_point,
    p_privacy_radius_m,
    p_capacity,
    p_join_mode
  )
  returning public.activities.id into v_activity_id;

  insert into private.activity_locations (activity_id, meeting_point)
  values (v_activity_id, v_private_point);

  insert into public.activity_memberships (
    activity_id,
    user_id,
    role,
    status,
    joined_at
  )
  values (
    v_activity_id,
    v_actor_id,
    'host',
    'accepted',
    now()
  );

  return query
    select
      a.id,
      a.kind,
      a.title,
      a.description,
      a.status,
      a.starts_at,
      a.ends_at,
      extensions.st_y(a.public_point::extensions.geometry),
      extensions.st_x(a.public_point::extensions.geometry),
      a.privacy_radius_m,
      v_host_display_name,
      (
        select count(*)::integer
        from public.activity_memberships as m
        where m.activity_id = a.id and m.status = 'accepted'
      ),
      a.capacity::integer,
      a.join_mode
    from public.activities as a
    where a.id = v_activity_id;
end;
$$;

revoke execute on function public.create_activity(
  public.activity_kind,
  text,
  text,
  timestamptz,
  timestamptz,
  double precision,
  double precision,
  integer,
  integer,
  public.activity_join_mode
) from public, anon, authenticated;
grant execute on function public.create_activity(
  public.activity_kind,
  text,
  text,
  timestamptz,
  timestamptz,
  double precision,
  double precision,
  integer,
  integer,
  public.activity_join_mode
) to authenticated;

create function public.nearby_activities(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_m integer default 5000,
  p_kinds public.activity_kind[] default null,
  p_starts_before timestamptz default null,
  p_limit integer default 50
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
  distance_m double precision,
  host_display_name text,
  participant_count integer,
  capacity integer,
  join_mode public.activity_join_mode
)
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_query_point extensions.geography(Point, 4326);
begin
  if p_latitude < -90 or p_latitude > 90
    or p_longitude < -180 or p_longitude > 180 then
    raise exception using errcode = '22023', message = 'Invalid discovery coordinates.';
  end if;

  if p_radius_m < 100 or p_radius_m > 20000 then
    raise exception using errcode = '22023', message = 'Discovery radius must be between 100 and 20000 metres.';
  end if;

  if p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Discovery limit must be between 1 and 100.';
  end if;

  v_query_point := extensions.st_setsrid(
    extensions.st_makepoint(p_longitude, p_latitude),
    4326
  )::extensions.geography;

  return query
    select
      a.id,
      a.kind,
      a.title,
      a.description,
      a.status,
      a.starts_at,
      a.ends_at,
      extensions.st_y(a.public_point::extensions.geometry),
      extensions.st_x(a.public_point::extensions.geometry),
      a.privacy_radius_m,
      extensions.st_distance(a.public_point, v_query_point),
      p.display_name,
      (
        select count(*)::integer
        from public.activity_memberships as m
        where m.activity_id = a.id and m.status = 'accepted'
      ),
      a.capacity::integer,
      a.join_mode
    from public.activities as a
    join public.profiles as p on p.id = a.host_user_id
    where a.status = 'published'
      and a.ends_at > now()
      and a.starts_at <= coalesce(p_starts_before, now() + interval '7 days')
      and (p_kinds is null or a.kind = any (p_kinds))
      and extensions.st_dwithin(a.public_point, v_query_point, p_radius_m)
    order by extensions.st_distance(a.public_point, v_query_point), a.starts_at, a.id
    limit p_limit;
end;
$$;

revoke execute on function public.nearby_activities(
  double precision,
  double precision,
  integer,
  public.activity_kind[],
  timestamptz,
  integer
) from public, anon, authenticated;
grant execute on function public.nearby_activities(
  double precision,
  double precision,
  integer,
  public.activity_kind[],
  timestamptz,
  integer
) to anon, authenticated;
