-- Extend the existing caller-scoped detail and Plans read models with only
-- the versioned avatar fields used by bundled art. Keep exact-location
-- decisions inside the established functions; this migration never reads
-- private.activity_locations or profiles directly from the client.

create or replace function public.activity_detail_with_avatar(p_activity_id uuid)
returns table (
  id uuid, kind public.activity_kind, title text, description text,
  status public.activity_status, starts_at timestamptz, ends_at timestamptz,
  public_latitude double precision, public_longitude double precision,
  privacy_radius_m integer, host_display_name text, participant_count integer,
  capacity integer, join_mode public.activity_join_mode,
  membership_role public.activity_membership_role,
  membership_status public.activity_membership_status,
  exact_latitude double precision, exact_longitude double precision,
  host_avatar_config jsonb
)
language sql stable security definer set search_path = ''
as $$
  select detail.id, detail.kind, detail.title, detail.description,
    detail.status, detail.starts_at, detail.ends_at,
    detail.public_latitude, detail.public_longitude, detail.privacy_radius_m,
    detail.host_display_name, detail.participant_count, detail.capacity,
    detail.join_mode, detail.membership_role, detail.membership_status,
    detail.exact_latitude, detail.exact_longitude,
    case
      when profile.avatar_config->>'version' = '1'
        and (
          profile.avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          or profile.avatar_config->>'avatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06')
        )
      then jsonb_strip_nulls(jsonb_build_object(
        'version', 1,
        'seed', case
          when profile.avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then profile.avatar_config->>'seed' else null
        end,
        'avatarId', case
          when profile.avatar_config->>'avatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06')
          then profile.avatar_config->>'avatarId' else null
        end
      ))
      else null
    end
  from public.activity_detail(p_activity_id) as detail
  join public.activities as activity on activity.id = detail.id
  join public.profiles as profile on profile.id = activity.host_user_id;
$$;

revoke execute on function public.activity_detail_with_avatar(uuid) from public, anon, authenticated;
grant execute on function public.activity_detail_with_avatar(uuid) to anon, authenticated;

create or replace function public.my_plans_with_avatars(p_limit integer default 50)
returns table (
  id uuid, kind public.activity_kind, title text, description text,
  status public.activity_status, starts_at timestamptz, ends_at timestamptz,
  public_latitude double precision, public_longitude double precision,
  privacy_radius_m integer, host_display_name text, participant_count integer,
  capacity integer, join_mode public.activity_join_mode,
  membership_role public.activity_membership_role,
  membership_status public.activity_membership_status,
  exact_latitude double precision, exact_longitude double precision,
  host_avatar_config jsonb
)
language sql stable security definer set search_path = ''
as $$
  select plan.id, plan.kind, plan.title, plan.description,
    plan.status, plan.starts_at, plan.ends_at,
    plan.public_latitude, plan.public_longitude, plan.privacy_radius_m,
    plan.host_display_name, plan.participant_count, plan.capacity,
    plan.join_mode, plan.membership_role, plan.membership_status,
    plan.exact_latitude, plan.exact_longitude,
    case
      when profile.avatar_config->>'version' = '1'
        and (
          profile.avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          or profile.avatar_config->>'avatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06')
        )
      then jsonb_strip_nulls(jsonb_build_object(
        'version', 1,
        'seed', case
          when profile.avatar_config->>'seed' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then profile.avatar_config->>'seed' else null
        end,
        'avatarId', case
          when profile.avatar_config->>'avatarId' in ('v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06')
          then profile.avatar_config->>'avatarId' else null
        end
      ))
      else null
    end
  from public.my_plans(p_limit) as plan
  join public.activities as activity on activity.id = plan.id
  join public.profiles as profile on profile.id = activity.host_user_id;
$$;

revoke execute on function public.my_plans_with_avatars(integer) from public, anon, authenticated;
grant execute on function public.my_plans_with_avatars(integer) to authenticated;
