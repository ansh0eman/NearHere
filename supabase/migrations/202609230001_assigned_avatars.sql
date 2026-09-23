-- Assignment belongs to account creation, not a component render or display name.
-- Existing custom configurations must survive this migration.
alter table public.profiles alter column avatar_config
  set default jsonb_build_object('version', 1, 'seed', gen_random_uuid()::text);

update public.profiles
set avatar_config = jsonb_build_object('version', 1, 'seed', gen_random_uuid()::text)
where avatar_config = '{}'::jsonb;

comment on column public.profiles.avatar_config is
  'Versioned avatar configuration. Default assigns one random persistent seed per account. Never inferred from phone or display name.';
