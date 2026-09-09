# NearHere testing status

This document records what has actually been tested. A green local build is
not the same as a hosted authorization proof, and a Simulator launch is not the
same as a physical-device usability check.

## Verification layers

| Layer | Command/evidence | Current result |
| --- | --- | --- |
| Static quality | `npm run lint` from `apps/mobile` | Pass |
| Type safety | `npx tsc --noEmit` from `apps/mobile` | Pass |
| Domain/parser behavior | `npm run test:unit` | 39 passed |
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
