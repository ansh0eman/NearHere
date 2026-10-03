# Hosted profile RLS verification

## Owner-details command (28 September 2026)

`profile-details.mjs` uses the same `PROFILE_RLS_PHONE_A/B` and `PROFILE_RLS_OTP_A/B`
variables below, with the same ignored mobile environment file. Run:

```sh
node --env-file=apps/mobile/.env supabase/tests/hosted/profile-details.mjs
```

It requires migration `202609280001`. It checks owner isolation, anonymous denial,
atomic field validation, code-point text limits, explicit clearing, protected
seed/columns, legacy revision advancement and two simultaneous saves from the
same revision. Only one may succeed. It restores original actor fields in
`finally`; server timestamps/revisions advance. Both this harness and the older
profile RLS harness passed on 28 September. No activity is created or deleted.
Do not run them concurrently with another profile test/editor unless deliberately
testing conflict recovery. Full teaching notes: `docs/profile-owner-editing.md`.

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

### Latest hosted profile result

On 2026-09-04, the complete two-actor matrix passed: distinct authenticated
actors and trigger-created rows, anonymous denial, one-row owner reads,
cross-user read/update isolation, allowed owner updates with server-maintained
`updated_at`, protected-column/insert/delete denial, three constraint failures,
and client-writable cleanup.

The first OTP request returned a transient HTTP 502. An Auth health request
then returned HTTP 200, and one deliberate retry completed every assertion.
The failed attempt was treated as an operational availability signal, not as
security evidence; only the successful full run is recorded as acceptance.

## Hosted participation verification

`participation.mjs` exercises the deployed participation boundary through the
same publishable-key Data API that the mobile app uses. It authenticates two
fixed-OTP fictional users, temporarily completes their profiles, and creates
clearly `TEST`-labelled development activities. It never receives a database
password, Management API token, or service-role key.

The two-user matrix checks:

- anonymous denial for Join, Leave, host decisions, host request reads, and
  Plans;
- caller-scoped Plans using one host-only activity per actor;
- open-mode acceptance and an idempotent Join retry;
- Host publication retry: the same request ID returns one original activity, and
  a changed draft using that request ID is rejected;
- exact location release for an accepted member;
- public-marker displacement within the configured privacy annulus, measured
  against the accepted host's exact point without printing either coordinate;
- idempotent Leave, capacity release, and removal from active Plans;
- approval-mode `pending`, a `null` exact point, and the host-only pending queue;
- idempotent host approval, its capacity effect, and exact-point release; and
- idempotent host rejection and removal from active Plans.

With optional C, the harness sends B and C to `join_activity` concurrently for
one final place and requires exactly one `accepted` plus one `waitlisted`
outcome, both observing the capacity-safe count. Leaving the accepted actor must
promote the waiter atomically. Optional D adds a second waiter so the harness
can prove chronological FIFO selection.

### Important limitation of two actors

Capacity is at least two and the accepted host consumes one place. With only a
host and one other identity, the other actor can fill the final place but there
is no third identity that can become waitlisted. Therefore a two-user black-box
test cannot honestly create both an accepted participant and a waitlisted
participant on the same activity. With only A and B, the runner reports honest
`SKIP` lines. Optional Actor C enables a real concurrent race for the final
place plus the waitlist/promotion case. Optional Actors C and D together enable
FIFO choice among two waiters: one host, one
accepted participant, and two waitlisted participants. A disposable local
database fixture is another option. Do not use a service-role key in this
client-boundary harness.

This is a mathematical test-fixture constraint, not missing production logic.
`leave_activity` reports `waitlist_promoted`, and the database orders promotion
by `(created_at, user_id)`. The two-user run still asserts that leaving without
a waiter returns `waitlist_promoted = false`.

### Hosted data lifecycle

The harness restores every configured actor's client-writable profile fields in
`finally`, including after a failed assertion. It cannot delete or cancel the
host-owned test activities because no such client command exists yet. The A/B run adds
four future activities; C adds one promotion fixture; D adds one FIFO fixture.
Every title is clearly test-labelled. Run this only against the development
project, not production. Activity cleanup remains a deliberate future
admin/cancellation task.

### Run manually from the repository root

Use the same two fictional identities configured in the hosted fixed-OTP map.
Read values silently so phones and codes do not appear in shell history or
terminal output:

```zsh
read -s "PARTICIPATION_PHONE_A?Test phone A (E.164): "; printf '\n'
read -s "PARTICIPATION_OTP_A?Test OTP A: "; printf '\n'
read -s "PARTICIPATION_PHONE_B?Test phone B (E.164): "; printf '\n'
read -s "PARTICIPATION_OTP_B?Test OTP B: "; printf '\n'
export PARTICIPATION_PHONE_A PARTICIPATION_OTP_A PARTICIPATION_PHONE_B PARTICIPATION_OTP_B

node --env-file=apps/mobile/.env supabase/tests/hosted/participation.mjs

unset PARTICIPATION_PHONE_A PARTICIPATION_OTP_A PARTICIPATION_PHONE_B PARTICIPATION_OTP_B
```

The A/B variables are required. To exercise waitlisting and one-waiter
promotion, also configure fictional Actor C. To prove selection order between
two waiters, configure both C and D. Repeat the required A/B reads and exports
above, then add the optional actors before invoking Node:

```zsh
read -s "PARTICIPATION_PHONE_C?Test phone C (E.164): "; printf '\n'
read -s "PARTICIPATION_OTP_C?Test OTP C: "; printf '\n'
read -s "PARTICIPATION_PHONE_D?Test phone D (E.164, optional): "; printf '\n'
read -s "PARTICIPATION_OTP_D?Test OTP D (optional): "; printf '\n'
export PARTICIPATION_PHONE_C PARTICIPATION_OTP_C

# Export D only when both D values were supplied.
if [[ -n "$PARTICIPATION_PHONE_D" && -n "$PARTICIPATION_OTP_D" ]]; then
  export PARTICIPATION_PHONE_D PARTICIPATION_OTP_D
fi

node --env-file=apps/mobile/.env supabase/tests/hosted/participation.mjs

unset PARTICIPATION_PHONE_A PARTICIPATION_OTP_A PARTICIPATION_PHONE_B PARTICIPATION_OTP_B
unset PARTICIPATION_PHONE_C PARTICIPATION_OTP_C PARTICIPATION_PHONE_D PARTICIPATION_OTP_D
```

Add C and D to the hosted fixed-OTP mapping before running those branches.
Supplying only one variable of an actor pair fails closed before authentication,
and D is rejected unless C is also configured.

The runner prints only actor labels plus named `PASS`, `FAIL`, or `SKIP`
checks. It never prints phones, OTPs, access/refresh tokens, Auth response
bodies, user IDs, activity IDs, or exact coordinates. A successful two-actor
run ends with these expected lines:

```text
SKIP capacity waitlist and promotion require optional Actor C
SKIP FIFO ordering proof requires optional Actors C and D
PASS hosted participation verification complete
```

When C is configured, the first `SKIP` is replaced by `PASS` checks for
waitlisting and promotion. When both C and D are configured, neither branch is
skipped and the FIFO assertion proves that C (created at least 50 milliseconds
before D) is promoted first. It does not force equal database timestamps, so
the `user_id` tie-breaker still needs a controlled local fixture if that exact
tie branch must be observed dynamically.

Do not interpret an expected `SKIP` as runtime proof of promotion. Before
release, run with the additional configured identities and assert that:

1. one participant is accepted while another is waitlisted at capacity;
2. the waitlisted plan contains `null` exact coordinates;
3. the accepted participant leaves;
4. with two waiters, exactly the oldest `created_at` waiter is promoted;
5. `waitlist_promoted` is true and accepted count remains within capacity; and
6. the promoted caller's Plans row changes to accepted and only then contains
   the exact active meeting point.

### Latest hosted result

On 2026-09-07, the participation runner passed the full A/B/C/D matrix,
including the public/private displacement assertion and the new host participant
projection/removal check. The removal check proved non-host denial, durable
`removed` state, retry safety, active-count correctness, and cleanup from both
the participant's Plans projection and the host's participant projection.

On 2026-08-15, the development project run with A/B/C/D completed with all
checks passing. It established distinct actors; verified anonymous and non-host
denial plus caller-scoped Plans; confirmed retry-safe Join, Leave, approval,
and rejection; observed `null` exact coordinates while pending/waitlisted and
exact coordinates only after acceptance/promotion; produced exactly one
accepted and one waitlisted participant in the concurrent final-place race;
promoted atomically after the accepted participant left; and promoted the
older of two chronological waiters while the newer waiter stayed locked.

No phone, OTP, token, user/activity ID, or exact coordinate was printed. This
is hosted database/RPC evidence. It is not Simulator acceptance of the mobile
Leave or host-decision UI, and it does not exercise the equal-timestamp
`user_id` tie-break.
