# Hosted profile RLS verification

`profiles-rls.mjs` is a dependency-free, black-box check of the deployed
`public.profiles` grants, constraints, trigger, and Row Level Security policies.
It uses two fictional phone identities configured in the hosted Supabase test
OTP mapping.

This is a manual development/pre-release check, not a per-commit CI test. Each
run uses real hosted Auth endpoints and can be affected by Auth rate limits.

## Safety boundaries

- The project URL and publishable key come from the ignored
  `apps/mobile/.env` file.
- Phone numbers and fixed codes are supplied only through temporary shell
  environment variables. Do not add them to a committed file.
- The harness never prints phones, codes, Auth response bodies, access tokens,
  or refresh tokens. Sessions exist only in process memory.
- The harness snapshots and restores all client-writable fields for both test
  profiles in a `finally` block. `updated_at` advances because it is deliberately
  server-owned and cannot be restored by a client.
- The two Auth users remain in the development project. Testing Auth-user
  deletion and profile cascade requires a privileged Admin operation or a
  disposable local Docker stack; this harness does not receive a service-role
  key and does not delete identities.

## Prerequisite

The hosted Auth configuration must contain two different fictional phone-to-code
mappings. Updating that configuration requires a Supabase Management API token;
the mobile publishable key cannot do it. Preserve both mappings in the hosted
`phone=code,phone=code` value and keep an expiration date. Do not use a broad
`supabase config push` just to add the second mapping.

## Run manually from the repository root

In zsh, collect the four values without echoing them, export them only to the
current terminal, and run Node with the existing ignored mobile environment:

```zsh
read -s "PROFILE_RLS_PHONE_A?Test phone A (E.164): "; printf '\n'
read -s "PROFILE_RLS_OTP_A?Test OTP A: "; printf '\n'
read -s "PROFILE_RLS_PHONE_B?Test phone B (E.164): "; printf '\n'
read -s "PROFILE_RLS_OTP_B?Test OTP B: "; printf '\n'
export PROFILE_RLS_PHONE_A PROFILE_RLS_OTP_A PROFILE_RLS_PHONE_B PROFILE_RLS_OTP_B

node --env-file=apps/mobile/.env supabase/tests/hosted/profiles-rls.mjs

unset PROFILE_RLS_PHONE_A PROFILE_RLS_OTP_A PROFILE_RLS_PHONE_B PROFILE_RLS_OTP_B
```

The runner prints only named `PASS`/`FAIL` checks and sanitized HTTP/database
error codes. A successful run ends with:

```text
PASS hosted profile RLS verification complete
```
