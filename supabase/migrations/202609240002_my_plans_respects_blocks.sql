-- The older Plans read model released an accepted participant's exact meeting
-- point after either side blocked. Match Activity Detail: a participant loses
-- the exact point when the participant or host blocks the other; the host keeps
-- access to the point they own. Membership history and row ordering are unchanged.

create or replace function public.my_plans(p_limit integer default 50)
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
  join_mode public.activity_join_mode,
  membership_role public.activity_membership_role,
  membership_status public.activity_membership_status,
  exact_latitude double precision,
  exact_longitude double precision
)
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Plans limit must be between 1 and 100.';
  end if;

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
      host.display_name,
      (
        select count(*)::integer
        from public.activity_memberships as accepted
        where accepted.activity_id = a.id
          and accepted.status = 'accepted'
      ),
      a.capacity::integer,
      a.join_mode,
      membership.role,
      membership.status,
      case
        when membership.status = 'accepted'
          and a.status = 'published'
          and a.ends_at > now()
          and not exists (
            select 1
            from private.user_blocks as block
            where (block.blocker_user_id = v_actor_id and block.blocked_user_id = a.host_user_id)
               or (block.blocker_user_id = a.host_user_id and block.blocked_user_id = v_actor_id)
          )
          then extensions.st_y(location.meeting_point::extensions.geometry)
        else null
      end,
      case
        when membership.status = 'accepted'
          and a.status = 'published'
          and a.ends_at > now()
          and not exists (
            select 1
            from private.user_blocks as block
            where (block.blocker_user_id = v_actor_id and block.blocked_user_id = a.host_user_id)
               or (block.blocker_user_id = a.host_user_id and block.blocked_user_id = v_actor_id)
          )
          then extensions.st_x(location.meeting_point::extensions.geometry)
        else null
      end
    from public.activity_memberships as membership
    join public.activities as a on a.id = membership.activity_id
    join public.profiles as host on host.id = a.host_user_id
    left join private.activity_locations as location
      on location.activity_id = a.id
      and membership.status = 'accepted'
      and a.status = 'published'
      and a.ends_at > now()
    where membership.user_id = v_actor_id
      and membership.status in ('pending', 'accepted', 'waitlisted')
    order by
      (a.ends_at <= now()),
      case when a.ends_at > now() then a.starts_at end,
      case when a.ends_at <= now() then a.starts_at end desc,
      a.id
    limit p_limit;
end;
$$;
