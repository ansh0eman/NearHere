# NearHere testing status

## 23 September 2026 — design handoff and foundations

New location/avatar unit tests: total **56 passed, 0 failed**. Installed mobile
TypeScript compiler and Expo lint passed. Initial root compiler invocation was
wrong; its nonzero exit was investigated rather than treating the compressed
test summary as full success. Avatar-default migration deployed; rollback-only
new-user trigger/name-change check passed. Four existing profiles have seeds.
Persistent demo seeder created 12 activities across four users; repeat run created
zero and retained 12. No deletion or cancellation.

**Not yet accepted:** new location controls in Simulator, populated markers,
current iOS export/native build, full hosted regression, physical-device behaviour,
or Night Arcade visuals. The concept images are not screenshots. See the
[precise checkpoint](handoffs/night-arcade-status.md) and
[required acceptance matrix](handoffs/night-arcade-execution.md#5-verification-recipes-and-acceptance-matrix).

## 23 September 2026 — map-first design acceptance

TypeScript, lint (no warnings), and iOS production bundle export passed after
this change. No database or native dependency change was introduced.

Simulator inspection confirmed the light muted iOS map, minimal area/profile controls, recenter, and Browse/Host dock, with no initial selected card or tab bar on Nearby. Browse opened, Coffee changed selected filter, and Your plans reached the existing caller-scoped Plans screen with tabs available. The current area returned no active activities, so populated avatar-marker taps, selected-card sizing, and overlapping pins were **not** accepted in this run. The new native mascot is visible in profile access. Physical-device, large-text, and Android acceptance remain open. The custom MapLibre basemap and persistent avatar editor are planned, not implemented. See [design scope and next steps](map-first-design.md).

This document records what has actually been tested. A green local build is
not the same as a hosted authorization proof, and a Simulator launch is not the
same as a physical-device usability check.

## Verification layers

| Layer | Command/evidence | Current result |
| --- | --- | --- |
| Static quality | `npm run lint` from `apps/mobile` | Pass |
| Type safety | `npx tsc --noEmit` from `apps/mobile` | Pass |
| Domain/parser behavior | `npm run test:unit` | 47 passed |
| Production JavaScript bundle | `npx expo export --platform ios` | Pass |
| Native iOS build | `npx expo run:ios --device "iPhone 17 Pro"` | Build succeeded, 0 errors |
| Simulator accessibility smoke | Map/List toggle and empty state | Verified live |
| Hosted database/RPC | `supabase/tests/hosted/*.mjs` | Prior A/B/C/D matrices passed; rerun requires the configured fictional test OTPs |
| Physical iPhone | Manual acceptance matrix | Still pending |

## 2026-09-21 — Hosted identity recovery and rerun

The development test-OTP mapping had expired on September 16. The narrow
Supabase Auth configuration update kept Phone authentication enabled and
preserved the existing four fictional mappings, but extended their validity to
December 31, 2026. It did not add a production SMS provider, alter real users,
or change application source.

The two-actor `profiles-rls.mjs` matrix then passed against the resumed hosted
project: trigger creation, anonymous denial, self-only reads and updates,
protected-column/insert/delete denial, database constraints, and client-writable
profile cleanup. The immediately following participation run stopped at the
Auth challenge with HTTP 429. That is an Auth rate-limit signal caused by the
intentional consecutive harnesses, not evidence of a participation regression;
it must be retried after the Auth window resets.

### Successful paced rerun

After the bounded Auth cooldown, every hosted harness passed using the four
fictional development actors. The participation A/B/C/D suite proved open and
approval joins, rejection, idempotency, location privacy, participant removal,
concurrent final-place serialization, waitlisting, and FIFO promotion. The
detail/cancellation suite proved anonymous and non-member redaction, pending
redaction, accepted release, and atomic cancellation revocation. The chat suite
proved anonymous denial, accepted-member delivery, and block filtering. The
safety suite proved report/block idempotency plus non-operator denial of the
review queue and immutable audit events.

These are hosted authorization and transaction proofs. They do not substitute
for rendered native interaction, screen-reader, physical-device, or release
distribution acceptance.

### Native anonymous smoke rerun

On the iPhone 17 Pro Simulator, the signed-out Plans screen rendered the
browse-first explanation. “Sign in to see plans” opened the phone-auth sheet,
which exposed an E.164-aware phone field and an explicit Close control; closing
it returned to Plans without retaining the protected navigation intent.

Nearby rendered its location control, area selector, category filters, empty
state, Host entry point, and loading affordance. The Map/List control changed
its accessible label from “Show activities on a map” to “Show activities as a
list” and displayed the equivalent empty state. This is native interaction
evidence for anonymous usability and map/list parity. It does not test
authenticated screen states because entering even fictional phone OTPs into a
native UI is treated as a separate credential-handling action.

### Authenticated native acceptance

With explicit authorization to use the fictional development credentials, the
Simulator verified the complete phone challenge and verification flow for a
host and a participant account. The host’s Plans screen rendered caller-scoped
Upcoming/Past sections and directions actions only for active plans holding an
authorized exact coordinate. Its Activity Detail screen displayed the host role,
private location, activity chat, and host cancellation control.

The participant account received only its caller-scoped plans. Its accepted
approval-mode Activity Detail displayed “You are going,” the exact private
meeting point, walking directions, Leave, Report, Block host, and the
accepted-member chat composer. Pressing directions opened the iOS Apple Maps
route interface; returning through the native back link restored NearHere’s
detail screen. This is concrete Simulator evidence that the server’s accepted
membership projection is rendered correctly, not merely parsed in a test.

Pending, waitlisted, rejected, cancellation, and participant-removal state
transitions remain fully proven in the hosted A/B/C/D suites. A separate native
state-fixture run may be added later for screenshot coverage, but is not needed
to establish the database authorization or transaction behavior.

## 2026-09-22 — Physical iPhone build and install

The paired iPhone 13 Pro (`bob the builder`, iOS 26.6.2) was reachable over its
connected local-network developer tunnel with Developer Mode enabled. Xcode
successfully produced the signed `Debug-iphoneos` NearHere bundle with bundle
identifier `com.nearhere.app`; `devicectl` installed it successfully on the
device.

iOS denied the first launch because the Apple Development profile has not yet
been explicitly trusted on that device. This is an expected device-security
boundary, not a compile, bundle, provisioning, or installation failure. The
only remaining action is on the iPhone: open **Settings → General → VPN & Device
Management**, select the Apple Development profile, and trust it. After that,
the already installed bundle can be launched and physical-device acceptance can
continue without another build.

### Launch confirmation

After the device owner trusted the Apple Development profile, `devicectl`
launched `com.nearhere.app` successfully. A fresh device application inventory
confirmed **NearHere 1.0.0 (bundle version 1)** is installed. This accepts the
physical build, signing, install, trust, and launch chain. It does not claim
screen-level physical usability: that still needs someone looking at and using
the iPhone for GPS permission, touch layout, network behavior, and accessibility
on actual hardware.

### Debug-bundle connectivity repair

The first physical Debug build did not load the JavaScript application because
its generated `ip.txt` embedded a stale Metro address (`192.168.1.2`). The Mac
had moved to `192.168.1.10`, so the phone could launch the native shell but not
find the development bundle. The repair was deliberately small: start Metro in
LAN mode, confirm the new address serves the iOS bundle with HTTP 200, perform
a clean physical-device rebuild so React Native regenerates `ip.txt`, then
reinstall and relaunch. The repaired bundle embeds `192.168.1.10`.

This is a Debug-development-server dependency, not a production release-build
requirement. Keep Metro running while testing this build. A release archive
would embed its JavaScript bundle and would not depend on the Mac being online.

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

## 2026-09-22 host controls and discovery hierarchy — source gate

User testing identified three usability failures in the mobile UI: numeric
keyboards obscured the phone/code call-to-action with no obvious dismissal
route; a host could only inherit the discovery coordinate rather than select
the actual meeting point; and the selected-map card was duplicated over the
list, hiding activity rows and competing with the navigation bar.

The corrective source change adds a keyboard-height-aware floating **Done**
control for the phone and six-digit numeric pads, `KeyboardAvoidingView` plus
an interactive scroll-dismiss gesture, a native custom date/time sheet alongside
the 30-minute/one-hour/tomorrow shortcuts, and a dedicated private-pin map
route with search. The pin is held briefly in local draft storage only to
return from the picker to the host form; it is cleared when consumed or after
publishing. The server remains the privacy boundary: `create_activity` sends
that coordinate to the private schema and creates the public approximate marker
inside the same transaction.

The discovery list now reserves vertical space for the fixed header and filter
row and does not render the selected map card in list mode. Map mode keeps a
shorter selection card with one-line description and direct Join/Details
actions. This is a layout correction, not a change to activity data or
authorization.

`npm run lint`, `npx tsc --noEmit`, `npm run test:unit` (49 passing tests),
and `npx expo export --platform ios` passed. The date picker is a native iOS
module, so these checks do not yet establish rendered keyboard, picker, pin,
or touch behavior. The next required evidence is an iPhone 17 Pro Simulator
build and the corresponding physical-device check.

### Simulator interaction result

The iPhone 17 Pro Simulator rebuilt successfully after adding the native date
picker. The Map/List control showed a list with the fixed header and four
activity rows but no duplicate selected-card overlay. The Host screen exposed
all three quick start options, opened the custom date/time sheet, opened the
private map pin screen, and returned to the form after “Use this meeting
point.” With the simulator software numeric keypad shown, a visible **Done**
button appeared above the keypad and the Send-code CTA remained recoverable
after dismissing it. The same button rendered on the OTP Verify screen; the
fictional test account completed verification and returned to its existing
profile. This accepts the rendered Simulator path. Physical-iPhone keyboard
geometry remains a separate acceptance item.

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

## Operator review recovery

`202609210002_operator_review_recovery.sql` adds an explicit, audited reopen
transition for resolved and dismissed safety reports. The mobile operator screen
now filters the four durable report states and renders the stored resolution.
The parser test accepts the `open` receipt. On 2026-09-21, `npx supabase
migration list` confirmed local/remote parity through `202609210002`.
An operator-account hosted test remains pending because the application
intentionally has no default operator identity.

### Anonymous native acceptance

After recovery, the Simulator also accepted the Map/List control: its accessible
label changed from “Show activities as a list” to “Show activities on a map”
and the list displayed its empty state. The signed-out Plans screen displayed
the browse-first explanation and “Sign in to see plans”; tapping it opened the
phone-auth screen, while explicit close returned to Plans. This verifies the
protected-intent entry/cancellation boundary without sending a phone number.

### 2026-09-21 — Directions handoff verification

The accepted-member journey now offers walking directions from both Activity
Detail and the active Plans card. The shared `walkingDirectionsUrl` helper has
two direct unit tests: Android emits a `geo:` URI and iOS emits an Apple Maps
walking-route URL. The Plans action is rendered only when the caller already
has an exact meeting location and the activity is not ended or cancelled.

`npm run lint`, `npx tsc --noEmit`, `npm run test:unit` (46 passing tests), and
`npx expo export --platform ios` all passed on 2026-09-21. This proves source
correctness and iOS bundle generation. It does not yet prove an external Maps
app handoff on a signed-in physical device; that remains device acceptance work.
