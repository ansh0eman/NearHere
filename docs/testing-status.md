# NearHere testing status

## 4 October 2026 — email magic-link implementation

Email magic-link sign-in now has a native callback route and is installed on
the iPhone 17 Pro Simulator. Xcode build, startup, email-screen rendering and a
safe invalid-code callback error all passed. A fake callback code proves only
error rendering, not sign-in. The local unit suite, TypeScript and Expo lint
pass. Supabase accepted initial requests to both authorized test inboxes, but
Gmail read-only inspection confirmed both initial confirmation emails arrived.
Immediate retries were HTTP 429 and a post-allow-list successful session reload
remain unproven. Hosted inspection found Google/Apple disabled, no custom SMTP,
and a two-email-per-hour limit. A template change needed for email OTP was
rejected by the free-tier default-mailer restriction; OTP is deferred pending
custom SMTP or upgrade. Details and screenshots: [email sign-in](email-sign-in.md).

**30 September 2026 — App Store T0 baseline:** 88 unit tests passed, TypeScript
and Expo lint passed, and `git diff --check` passed. Xcode 26.6 is installed.
Read-only linked migration inventory reports 30/30 local/remote IDs matching
through `202609300001` on the linked **development** project. No database writes
or Simulator flows were run for this baseline. The complete release sequence
and caveats are in the [App Store T-pass handoff](handoffs/app-store-t-pass-20260930.md).
The same session confirmed the booted iPhone 17 Pro Simulator opens the installed
app at the map and exposes its “Activity areas, not live locations” and primary
control labels to accessibility. A non-destructive Browse navigation exposed 11
individually named Demo activities, preserving the current populated test set.
Coffee filtered to two results; selecting one returned to the map. Its owner
card showed “You are hosting” and “Manage activity”, not Join. Direct screenshots
record Browse and map selection. Two marker avatars appear partly clipped at
the left viewport edge and need a T5 design check. No participant join, publish,
edit, or cancellation was performed. Plans and Me also opened: 46 View actions
were visible in Plans (below the current 50-row fetch cap; pagination remains
untested), while Me exposed profile edit and Sign out but no account deletion.
No hosted record was changed. See the [T-pass record](handoffs/app-store-t-pass-20260930.md#t4-local-simulator-probe--30-september-2026).

The initial T5 comparison of the current map against
[`night-arcade.png`](design-concepts/night-arcade.png) found the charcoal/lime
map-first treatment in place, but activity labels and large, fully framed avatar
markers from the concept are not. Two avatars were clipped at the left map edge.
This visual audit led to a small label/privacy slice; edge clipping remains open.

**30 September 2026 — T5 selected-label slice:** 90 unit tests passed, TypeScript
and Expo lint passed, and `git diff --check` passed. Selected-marker labels use
only category and rounded approximate distance, never user titles or exact
coordinates. A 250 m geographic spacing guard suppresses the optional label
when nearby character art could be obscured. iPhone 17 Pro Simulator confirmed
the label is suppressed in the dense selected-map state without covering avatar
art. Follow-up review separated label suppression from the selected-marker
accent halo, so density no longer removes the selected-state cue. Post-fix
checks: 90/90 unit tests, TypeScript, Expo lint and `git diff --check` pass.
An isolated positive-render case, visual confirmation of the halo-only fix,
marker edge clipping, VoiceOver, iPad and physical-device checks remain open.
No activity or database row changed. See
the [detailed T5 record](handoffs/app-store-t-pass-20260930.md#t5-visual-comparison-and-selected-marker-label-slice--30-september-2026)
and [current capture](screenshots/app-store-t5-selected-label-suppression-20260930.png).

**30 September 2026 — P04 copy correction:** location-services-disabled
instructions now say “Settings” rather than “iPhone Settings,” matching the
confirmed iPhone+iPad target. Added pure-message regression coverage for the
three typed location failures and the manual-area fallback. This does not test
native permission dialogs or real GPS; those P04 checks remain open. Current
full local gate after the correction: **91/91 unit tests**, TypeScript, Expo
lint, and `git diff --check` passed. Node emits non-failing
`MODULE_TYPELESS_PACKAGE_JSON` warnings for TS test imports.

**Latest Simulator follow-up:** current-bundle Cancel/Done and Time tab verified.
Cancel retained one-hour selection; Done cleared shortcuts and retained the
timestamp. Wheel dragging is still blocked by the control bridge. This is partial
acceptance, not proof of changing wheel values.
[Exact evidence and screenshot](host-time-selection.md).

**Current, 29 September:** 86 unit tests, TypeScript and Expo lint pass. iOS
Hermes export succeeds (5.14 MB). Custom time now has draft/commit semantics
and sequential Android dialogs; [native checks remain open](host-time-selection.md). Owner
profile details and account-switch isolation are implemented. Both hosted
profile suites pass; migrations match through `202609280001`. Simulator verified
an owner-details save and real stale-revision conflict/reload. See
[the implementation lesson](profile-owner-editing.md). The 5.12 MB iOS export
below is historical; the new 5.14 MB export includes the profile changes.

**Current, 30 September:** 87 unit tests, TypeScript and Expo lint pass. The
non-destructive V2 fixture run added 12 future, clearly-labelled activities
across four fictional accounts after V1 had expired; it preserved every older
row. Simulator Browse showed 13 rows and Browse-to-map selection produced the
correct existing preview. This restores a credible populated-map test state,
but does not replace physical-device, production-tile-provider, accessibility,
or beta-community acceptance.

### 24 September 2026 — custom time gate

Added two tests for the 30-minute, one-hour and 24-hour shortcut contract and
their minute-rounding behavior. The native iOS Date and Time tabs opened and
switched in Simulator, but neither accessibility value setting nor a direct
wheel tap changed a date; coordinate input returned `noWindowsAvailable`. The
sheet was closed without changing or publishing a draft. `npm run test:unit`
passes 82/82, TypeScript and lint pass. The 5.12 MB iOS bundle was exported
after the preceding UI change; this slice only changed test and documentation
files. Physical-device custom wheel selection remains open.

The same Simulator session selected 30 min, 1 hour, and Tomorrow. Each option
visibly highlighted and updated the local start label; Tomorrow advanced the
date to the next day at the same time. V29 records the final state. The draft
was discarded without publishing.

## 24 September 2026 — fixture identity + host-avatar projection

Fresh unit suite: **79 passed, 0 failed**, including fixture identity, map data,
layout and avatar projection parser tests. TypeScript, Expo lint and 5.12 MB iOS
bundle export pass. Linked migrations match through `202609240002`.

P01 hosted fixture seeder ran twice: **12 retained, 0 created** each run. Two
concurrent invocations produced one normal completion and one exclusive-lock
rejection; no existing activity rows were changed. Anonymous avatar detail
smoke passed for 3 existing activities with membership/exact coordinates null.
The two-actor detail harness and four-actor participation harness passed after
testing wrappers against base RPCs, including waitlist and both block directions.
Migration `202609240002` fixes the previously uncovered blocked participant
exact-point leak in Plans; the host retains their own exact point.

Simulator confirmed the same configured host character on Me, map selection,
Activity Detail and Plans; screenshots: [Profile](screenshots/host-avatar-profile-simulator-20260924.png),
[Detail](screenshots/host-avatar-detail-simulator-20260924.png). The local Plans
capture was excluded because it showed the exact point for a fictional test
activity; do not use that image as public evidence.

Authenticated acceptance harnesses intentionally created new `TEST` activities
and cancelled their detail fixture; client-writable profile fields were
restored, no row was deleted, and all test events remain for visual review.
This is separate from P01's fixture-seeder no-op. Physical-device acceptance
remains open. See the live [execution ledger](handoffs/night-arcade-status.md).

### P03 map isolation sub-slice — same date

Six new tests cover GeoJSON coordinate order, invalid/boundary data, duplicate
IDs, deterministic avatar keys, exact-field rejection, filtered selection and
bounded camera padding. The full suite is **79/79 passing**. TypeScript/lint and
iOS export passed (5.12 MB). Simulator verified render, Browse row selection,
overlay-aware camera pan and the attribution panel after extraction:
[selection capture](screenshots/map-adapter-browse-selection-20260924.png),
[overlay capture](screenshots/map-adapter-overlay-selection-20260924.png). A
null native layout event and an early camera command were reproduced and fixed
with defensive event parsing/readiness gating. No data changed. Direct map
avatar tap, cluster expansion, empty-map deselection and selection-card
visibility were then verified in Simulator. Cluster camera movement now uses
the same measured overlay padding as other map focus paths. Safe evidence:
[selected avatar](screenshots/map-avatar-marker-selected-simulator-20260924.png)
and [cleared selection](screenshots/map-avatar-marker-cleared-simulator-20260924.png).
Filter-change deselection, tile-error retry and 12/50/200 physical-device
performance profiling remain `not_run`.

### P04 auth keyboard sub-slice — same date

The phone and OTP screens now keep their primary actions reachable while the
number pad is open. Simulator evidence showed the original phone button hidden
by the keyboard; a normal footer change did not resolve the native overlap, and
the iOS phone-pad InputAccessoryView did not render its controls. The final
implementation measures keyboard height, pins an action/Done row above it, and
scrolls the form content clear of that row. When the keyboard closes, the normal
footer returns.

In iPhone 17 Pro Simulator, Send remained tappable with the keyboard open; using
only the incomplete `+91` value produced the expected local validation message
and made no SMS request. Done dismissed the number pad. OTP showed a matching
action row; the button was disabled on a direct route with no pending phone,
which is the correct unauthenticated state. No OTP was submitted and no real
phone number was used. See [keyboard evidence](visual-evidence.md#24-september-2026--keyboard-safe-auth-actions).
The Android keyboard path and physical iPhone acceptance are still open. A new
pure location-presentation test covers device, manual and default fallback labels
and verifies that all failure outcomes clear the current-location marker. The
full unit suite now passes 80/80; typecheck/lint and the 5.13 MB iOS export pass.

The same P04 Simulator slice revoked location permission for the Simulator app.
The failure card exposed Open Settings and Choose area. Searching a public
neighborhood landmark returned a valid Nominatim result; selecting and
confirming it persisted a manual label locally and recentred discovery. A later
GPS retry while denied preserved that manual center and cleared the stale blue
device-location marker. Permission and the app's initial Near you state were
restored. Evidence: [denied GPS + retained manual area](screenshots/location-denied-manual-area-simulator-20260924.png).
This does not verify services disabled, fresh OS permission prompts, timeout or
cached-fix paths, the user's physical-device failure, or Android behavior.

## 24 September 2026 — planner audit and corrective slice

See the [complete per-ticket audit](handoffs/night-arcade-plan-audit-20260924.md).
Fresh checks: **67 unit tests pass**, TypeScript/lint pass, iOS export passes
(5,115,533-byte Hermes bundle), `git diff --check` passes. All 26 migrations
match locally/remotely through 230004. Anonymous live discovery: HTTP 200,
12 marked demos, 12 bounded avatar configs, no unexpected response fields.
Dependency audit: 13 moderate + 11 high findings; no forced fixes applied.

New tests cover delayed manual-location reads returning empty/saved/error after
newer intent. Simulator verified real profile plans and draft avatar selection/
Cancel navigation. The date sheet now exposes Date, Time, Done and native wheels;
switching tabs and dismissing worked. AX wheel setValue did not change its value,
and coordinate drag returned `noWindowsAvailable`. Arbitrary custom time remains
unaccepted. Profile save/relaunch, forced retry, full actor/role/privacy matrices,
physical iPhone, accessibility and map scale tests remain open. No hosted records
were mutated. Source corrections are not a new signed native build. (The separate
P02 slice below did deploy only the additive avatar-read migration.)

## 24 September 2026 — NearHere-authored map style

Replaced the stock OpenFreeMap `dark` style URL in Nearby with
`apps/mobile/assets/maps/nearhere-night-arcade-v1.json`: a local, 13-layer
MapLibre v8 style. It uses the OpenMapTiles vector schema and OpenFreeMap's
TileJSON/font resources, while NearHere owns the land/water/road/park colors and
label hierarchy. OpenFreeMap, OpenMapTiles and OpenStreetMap attribution remains
embedded and the MapLibre attribution control stays enabled. The style schema
validator returned **zero errors**; its regression test checks the vector source,
credit, required layer IDs, unique IDs and source references.

Latest combined local gate: **62 unit tests passed, 0 failed; TypeScript passed;
Expo lint passed; iOS JavaScript bundle export passed (5,111,500 bytes); style
validator passed; `git diff --check` passed.** V15 proved the authored style
renders. In the subsequent live iPhone 17 Pro Simulator session, the app-owned
credit button was visible in the fresh V16 capture and its tap opened MapLibre
Native's attribution panel, saved separately in V17. The accessibility tree
showed OpenFreeMap, OpenMapTiles and OpenStreetMap. So the style has rendered
evidence and the attribution control has interaction evidence. MapLibre
marker/cluster views are not exposed in Simulator's accessibility tree, and coordinate tap attempts
returned `noWindowsAvailable`; marker selection/cluster zoom on the authored
style remain open. The screenshot still showed the existing activity fixtures
(12 in Browse, multiple map clusters); no fixtures or hosted records were
changed. Browse, profile, Plans privacy, Activity Detail, host draft/date-time,
location search and meeting-point search have now received partial live review;
see below for their exact boundaries. Remaining: reliable authored-style map
marker/cluster hit tests, saving/reloading a profile choice, confirming a custom
date/time, GPS recovery, host publish and complete role/state acceptance. V16
through V21 are development Simulator captures, not signed-build,
physical-device or release acceptance.

One product iteration followed that review: `apps/mobile/app/(tabs)/index.tsx`
now renders ordinary character symbols at MapLibre size `0.11` and the selected
character at `0.15`, with the existing selection halo. Selecting “Demo · Chai
after work” from Browse rendered the larger marker and preview after fast
refresh; V23 records that state. This is a modest hierarchy, not a new avatar
system. The 62-test suite, TypeScript, lint and Expo iOS export were rerun after
the code change. Map-style/schema regression passed within the unit suite.

## 23 September 2026 — Night Arcade secondary-screen token pass

Extended the Night Arcade semantic palette through Plans, Host creation,
Activity Detail, location search, and private meeting-point picking. These were
presentation-only changes: no participation, chat, exact-location, host
authorization, map-search, or publish behavior was intentionally changed. The
picker controls now match Night Arcade, but their underlying native map tiles
still use the platform map provider. Nearby now uses a separate NearHere-authored
vector style over hosted tiles, covered by the newer checkpoint above.

Latest local checks after these screen changes: **61 unit tests passed, 0
failed; TypeScript passed; Expo lint passed; iOS JavaScript bundle export passed
at 5.11 MB; `git diff --check` passed.** The Mac was locked, so no newly styled
screen has fresh Simulator visual evidence. These results establish build and
parser integrity, not visual acceptance. The existing 13 development activities
were preserved. The next acceptance action is to unlock the Mac and visually
inspect the profile editor, Plans, Host creation, Activity Detail, location
search and private meeting-point picker in the booted iPhone 17 Pro Simulator.

## 23 September 2026 - Night Arcade and profile editor iteration

The current profile slice adds a six-character preset selector, live preview,
display-name editing and a Save action. Existing profiles reach it through Me →
Edit profile; incomplete profiles see the same selector during onboarding. The
original database-assigned random UUID seed remains unchanged, while the
selected catalog ID is saved separately. The public RPC allowlist migration
`202609230004_selected_avatar_projection.sql` is deployed; local and hosted
migration ledgers match through 230004. Anonymous hosted smoke returned 13
activities with 13 safe avatar configurations and no private/account fields.
None of those 13 profiles had a selected `avatarId`, so actual selected-ID
projection still needs an authenticated editor save.

Local unit tests: **61 passed, 0 failed**. `npx tsc --noEmit` passed. Lint was
rerun after cleaning duplicate imports and passed. These checks validate the
catalog/parser and compile-time contracts, not visual usability or a signed-in
write. Simulator UI automation is currently unavailable because the Mac is
locked. The existing V14 populated-map screenshot and earlier pin/cluster taps
remain valid; do not claim the new profile editor was visually or interactively
accepted yet. No demo activities were modified. The next gate is unlock Mac,
open Me, edit/pick/save, return to Nearby, verify the marker uses the same art,
then force-close/relaunch and confirm the choice persists.

The Expo native project already has MapLibre linked and its earlier Simulator
native build passed. A new build is not required for this JS-only profile slice,
but the edited JS still needs `expo export` and a real Simulator run. Physical
iPhone, Android, VoiceOver, font scaling and production SMS/provider checks
remain separate acceptance gates.

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
| Domain/parser behavior | `npm run test:unit` | 61 passed in latest profile/avatar slice |
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
V16/V17 are saved as visual evidence: V16 shows the populated custom map and
visible credits; V17 captures the native attribution panel after the credit
button was tapped. No map or activity data was changed by this check.

The same Simulator session also checked Browse and profile navigation without
mutating the account or fixtures. Browse loaded 12 demo rows; selecting Coffee
returned two, and selecting a row centered the matching character/activity on
the map before View activity opened its detail. Profile edit showed all six
character presets and the existing selection; Cancel discarded the draft. V18
and V19 record the Coffee list and editor. Plans showed a pending request with
the exact point locked and an activity hosted by the current test actor with
the point available, consistent with the intended role boundary. A screenshot
of Plans/Detail was deliberately not saved because accepted-state test data
displayed an exact meeting-point coordinate. These checks do not prove profile
save/relaunch persistence, pending/accepted/waitlist/cancel coverage for every
actor, or production authorization.

Manual area search and private meeting-point search were also exercised with
the non-sensitive query “Bellandur Lake.” Both returned an attributed OpenStreetMap
result. In the private picker, selecting the result recentered the draft map;
we closed without pressing “Use this meeting point.” In manual location search,
we closed without pressing “Use this area.” Thus neither durable area selection
nor activity publication changed. The activity form and custom date/time sheet
were visually inspected: all three quick choices and the separate custom entry
were present, and the sheet offered Date and Time tabs. In the 24 September
follow-up, switching to Time by its accessibility control and closing the sheet
worked; setting a native wheel through accessibility had no effect, while a
coordinate drag returned `noWindowsAvailable`. Actually changing and
confirming a custom time remains unverified. GPS/current-location permission and recovery
were then checked with the “Center map on my location” control: in this
Simulator it recentered and showed the blue location dot without an error
(V22). That is evidence for the current granted/mock location path only. The
earlier physical-iPhone “location unavailable” report, permission-denied path,
Settings recovery, accuracy and real GPS remain open.

### P04 Host privacy default — 2026-09-24

Simulator verification found and fixed the host form's implicit exact-point
default. The Nearby map center is now only the picker camera starting position;
host creation begins with no private point. A validation-only Publish tap with
a valid local title showed “Choose an exact private meeting point before
publishing.” before `createActivity` is called. The picker was explicitly
confirmed once to verify its local draft returns to Host as “Dropped pin”; Host
was then closed without publishing. Custom date and time tabs both opened, but
the native iOS spinner values have not been changed/confirmed. See V24 and the
dated P04 entry in `docs/handoffs/night-arcade-status.md`. No hosted data changed.
After that check, “Cubbon Park, Bengaluru” returned public search results; a
result was selected and explicitly confirmed. Its label returned to the Host
form, was visually limited to two lines, and retained in the local draft. The
form was then closed without publishing. V28 records this draft-state flow.
### 30 September 2026 — iPad native launch check

Built/installed the current app on iPad (A16) Simulator (iOS 26.5), then
exercised the fresh location prompt with “Allow Once.” Nearby rendered and the
map eventually showed streets and the device marker. Initial map loading was
not clean: iPad logs recorded OpenFreeMap tile failures (`NSURLErrorDomain
-1005`) before visible tiles appeared. The iPad screenshot is
`docs/screenshots/p04-ipad-location-map-20260930.png`. No account or activity
mutation was used. This initially established iPad launch/prompt; location
accuracy, public-place search, authenticated flows, reliable tiles,
accessibility and physical-device acceptance remain open. The later denial and
manual-selection follow-ups below established the manual fallback and local
selection persistence on this Simulator only. See the detailed P04 handoff entry.
Follow-up: the iPad Simulator permission was revoked and the app relaunched;
the recovery banner offered Settings and Choose area while retaining Bengaluru
and the existing 17-activity count. Neither action was pressed. The simulated
permission was returned to not-determined after capture. See
`docs/screenshots/p04-ipad-location-denied-20260930.png`.
Then manual area was opened and explicitly confirmed; returning from Browse and
reinstalling/relaunching the dev build preserved “Selected area,” Bengaluru and
the 17 existing activities without a device-location marker. The permission
remained not-determined. This is local Simulator persistence, not physical GPS
evidence. Screenshot: `docs/screenshots/p04-ipad-area-persistence-20260930.png`.

Physical-device check: Xcode sees the paired iPhone 13 Pro as available and
NearHere 1.0.0 is already installed. `npx expo run:ios --device <UDID>` did not
recognize the paired device; using its registered name reached Xcode but failed
before install with error 65: no Development provisioning profile for
`com.nearhere.app`; Xcode requires `-allowProvisioningUpdates` to create/find
one. No profile or device app was changed. Enabling Apple-account provisioning
is an external signing change and awaits explicit user approval. The physical
build/permission/auth test is therefore blocked, not passed.

### 1 October 2026 — chat recovery and publish idempotency

Added pure transition coverage for Activity Detail's chat transport. The prior
implementation cleared an interval after Realtime recovered but retained its
handle, causing a second disconnect to skip polling. The transition helper now
requires the screen to unset the handle. Unit checks cover first failure,
duplicate failure, recovery and second failure. This is not a claimed live
Realtime delivery test.

Added `202610010001_create_activity_idempotency.sql` and applied it to the linked
development project. The new RPC stores a host-scoped request ID plus a canonical
draft hash, creates an event once, returns its original public-safe receipt for
the same retry, and rejects a changed draft using the same request ID. The Host
screen retains the key only while its serialized draft is unchanged. Local suite:
**96 pass, 0 fail**; `npx tsc --noEmit`, Expo lint and `git diff --check` pass.
No hosted actor harness, Simulator publish or physical-device test was run.

### 2 October 2026 — physical iPhone connection and development build

Xcode 27 exposes physical-device management as **Xcode → Open Developer Tool →
Device Hub** rather than the older Window → Devices and Simulators menu. Device
Hub and `xcdevice` both showed the paired iPhone 13 Pro (`bob the builder`) as
available over USB, and `xcodebuild -showdestinations` listed it as a compatible
NearHere destination.

The first device build failed before signing because several transitive CocoaPods
targets declared legacy deployment targets (iOS 9.0, 11.0 and 13.4), while this
Xcode version accepts iOS 15 and later. The app already declares iOS 15.1. The
Podfile post-install hook now aligns every generated Pods target to iOS 15.1;
after `pod install`, `xcodebuild` completed successfully with the owner's
previously approved automatic-provisioning flags. Third-party compiler warnings
were emitted, but the build exited 0.

`devicectl` installed NearHere 1.0.0 (bundle `com.nearhere.app`) onto the
physical phone and confirmed the installed bundle. A direct launch request was
then refused by iOS because the development certificate/profile has not yet been
explicitly trusted on that phone. This is not a successful physical-device app
acceptance: the remaining user action is to trust the developer certificate in
Settings, then rerun/launch and execute the physical test matrix. No test
activities, accounts, or hosted data were changed.

Follow-up: after the owner trusted the development certificate, `devicectl`
successfully launched `com.nearhere.app` on the physical iPhone. This proves
the signed Debug process can start on that device. Device Hub cannot mirror this
iOS 26.6.2 phone from the current Mac because it requires iOS 27.0 for screen
sharing, so no visual rendering or interaction claim is made from the Mac. The
next evidence is direct on-phone acceptance of location, OTP, host, join and
privacy flows.

### 2 October 2026 - selection-marker clarity

The former selection marker was a circular lime control with no visual point of
contact with the map. That made it unclear which coordinate would be saved.
Manual-area and private-meeting-point pickers now share one non-interactive
`SelectionPin` component. It uses a high-contrast signal-orange teardrop, dark
center, white ring, and a ground reticle. The pin tip and reticle are anchored
to the picker camera center. Signal orange is reserved for this temporary exact
selection state; NearHere lime remains the normal brand/action color.

TypeScript and Expo lint passed. An iPhone 17 Pro Simulator deep-link check of
the private-meeting-point route visibly rendered the marker above the dark
authored basemap. The picker was not confirmed, so no meeting-point draft or
activity was changed. This does not prove physical-device rendering.

### 2 October 2026 - Google Places provider boundary

Added an inactive, provider-swappable Google Places path without replacing
MapLibre. `supabase/functions/place-search/index.ts` owns the future provider
secret and returns only a limited identifier/label/coordinate contract. The
mobile app selects this path only when the explicit public provider switch is
`google_places`; its default remains Nominatim for current development. The
runtime parser rejects malformed function payloads before picker rendering.

The full mobile unit suite passes **98/98**, and TypeScript, Expo lint, and
`git diff --check` pass. No Google Cloud project, billing account, key, Edge
Function deployment, live provider request, search setting, activity, or other
hosted data was changed. `docs/google-places-search.md` records the owner setup
and the remaining provider-policy review.
# 2 October 2026 — day/night theme foundation, acceptance pending

Started D00/D01 from `docs/handoffs/daylight-avatar-identity-20261002.md`.
Implemented a local theme preference provider (System/Daylight/Night Arcade),
AsyncStorage persistence, startup hydration gate, Appearance route, StatusBar
resolution and shared cartography color derivation for ActivityMap and
SelectionMap. Set Expo app interface style to automatic. Existing non-map
screens still mostly use static Night Arcade styles, so Daylight is incomplete.

No automated tests, typecheck, lint, Simulator capture, or device verification
were run in this continuation. D00 baseline gates therefore remain open. This
entry is an implementation record, not acceptance evidence. Expo SDK54 docs
consulted: [SystemUI](https://docs.expo.dev/versions/v54.0.0/sdk/system-ui/)
and [AsyncStorage](https://docs.expo.dev/versions/v54.0.0/sdk/async-storage/).
