# NearHere testing status

This document records what has actually been tested. A green local build is
not the same as a hosted authorization proof, and a Simulator launch is not the
same as a physical-device usability check.

## Verification layers

| Layer | Command/evidence | Current result |
| --- | --- | --- |
| Static quality | `npm run lint` from `apps/mobile` | Pass |
| Type safety | `npx tsc --noEmit` from `apps/mobile` | Pass |
| Domain/parser behavior | `npm run test:unit` | 42 passed |
| Production JavaScript bundle | `npx expo export --platform ios` | Pass |
| Native iOS build | `npx expo run:ios --device "iPhone 17 Pro"` | Build succeeded, 0 errors |
| Simulator accessibility smoke | Map/List toggle and empty state | Verified live |
| Hosted database/RPC | `supabase/tests/hosted/*.mjs` | Prior A/B/C/D matrices passed; rerun requires the configured fictional test OTPs |
| Physical iPhone | Manual acceptance matrix | Still pending |

## Chat freshness behavior

Activity Detail subscribes to Supabase Realtime for new message events. The
event payload is not treated as trusted display data; it only triggers the same
authorized `activity_messages` RPC used for the initial load. If Realtime is
closed, times out, or cannot be configured for the private table, the screen
falls back to a bounded 15-second poll and tells the user that updates are
reconnecting. This is eventual consistency with a clear user-visible status,
not a claim of lossless realtime delivery.

## Structured-error foundation

`apps/mobile/lib/app-error.ts` defines the first shared error envelope:
`code`, user-safe `message`, `retryable`, and optional client `requestId`.
`blockActivityHost` now uses it for configuration, rate-limit/network, and
invalid-response failures. The existing UI still renders `message`, which keeps
the migration incremental; later sensitive operations can adopt the same
contract without a disruptive screen rewrite. The request ID is metadata for
sanitized diagnosis, never a token, phone number, coordinate, or chat body.

## What the local checks prove

Lint catches invalid or inconsistent code patterns. TypeScript checks the
compile-time contracts between screens, hooks, repositories, and domain types.
Unit tests exercise runtime parsers and deterministic state rules with malformed
and boundary inputs. Expo export proves Metro can produce an iOS JavaScript
bundle. None of these checks can prove that Supabase RLS is deployed correctly
or that a real user can complete a gesture on hardware.

## Simulator smoke test performed

After the native rebuild, the iPhone 17 Pro Simulator showed the Nearby screen.
The accessibility tree exposed a button labelled “Show activities as a list”.
Activating it changed the label to “Show activities on a map” and rendered the
“Nearby activities” list heading plus the empty-state copy. This verifies that
the new presentation path is reachable and accessible; it does not replace
VoiceOver, Dynamic Type, or physical-device testing.

## Hosted test procedure

Hosted harnesses authenticate fictional development actors using the fixed OTP
mapping. Read the values silently into temporary environment variables, run the
specific harness from the repository root, then unset the variables. Never put
phones, OTPs, tokens, database passwords, or exact coordinates in a committed
file or terminal transcript. Run only against the development Supabase project.

The complete participation, safety, chat, activity-detail, and profile-RLS
matrices have previously passed. The expected two-actor participation `SKIP`
for waitlist/FIFO is a fixture limitation, not a production failure; configure
Actors C and D when those branches need to be re-proven.

## Next acceptance gate

1. Re-run the hosted harnesses when the fictional OTP variables are available.
2. Exercise Host, Plans, pending, waitlisted, rejection, and cancellation paths
   in the Simulator with fresh test-labelled activities.
3. Repeat the critical join/leave/privacy flows on a physical iPhone.
4. Capture screenshots and record device/OS/build details in
   [`visual-evidence.md`](visual-evidence.md).

## 2026-09-09 acceptance attempt

The rebuilt Simulator is healthy and the signed-out Me surface is reachable.
The rejection, waitlist, cancellation, and ended-card paths are implemented in
the native source and covered by hosted/parser tests, but their authenticated
Simulator evidence is not claimed yet. Completing those paths requires the
development project's fictional test actors (and, for waitlist, the optional
third/fourth actors). Do not guess those values or commit them; enter them
locally when running the documented harness and Simulator flow.

The Supabase CLI migration-list check was attempted from the repository root
but could not resolve `registry.npmjs.org` in this environment. This is a local
network/package-resolution limitation, not evidence that the hosted migrations
are out of sync; the previously recorded `db push` and hosted RPC runs remain
the available deployment evidence. Re-run the CLI check from a networked
terminal before the next hosted release.

## 2026-09-21 chat migration deployment check

The new `202609210001_fix_sent_activity_message_projection.sql` migration was
validated by mobile lint, TypeScript, and unit checks, but its remote dry run
did not authenticate. The linked CLI received PostgreSQL `28P01` for
`supabase_admin`, which means the stored or supplied database password is no
longer valid. This is a deployment-credential issue, not a migration result.
The migration remains committed as pending until the project owner relinks with
the current database password and runs `npx supabase db push`; only then may the
hosted chat harness claim the updated write receipt is live.

## 2026-09-21 Simulator discovery availability check

The newly built app launched on the iPhone 17 Pro Simulator and exposed the
Nearby loading and retry states. Discovery then rendered the expected safe
error state after one retry. A direct health request could not resolve the
Supabase project hostname (`HTTP 000`), so this is a DNS/network availability
condition in the development environment, not a proven mobile discovery
regression. The error text and retry action are therefore accepted for this
condition; a successful remote discovery run remains pending network recovery.

### Recovery result

The project owner resumed the development project and relinked the CLI with the
current database password. A publishable-key Auth health request returned HTTP
200, `supabase migration list` showed every local migration through
`202609210001` on the remote database, and `supabase db push --dry-run`
reported the remote database up to date. On the iPhone 17 Pro Simulator, the
Nearby retry action then recovered from the prior error into the real empty
discovery state. This accepts the unavailable-to-retry-to-empty recovery path;
authenticated activity flows still require the fictional test actors.

### Anonymous native acceptance

After recovery, the Simulator also accepted the Map/List control: its accessible
label changed from “Show activities as a list” to “Show activities on a map”
and the list displayed its empty state. The signed-out Plans screen displayed
the browse-first explanation and “Sign in to see plans”; tapping it opened the
phone-auth screen, while explicit close returned to Plans. This verifies the
protected-intent entry/cancellation boundary without sending a phone number.
