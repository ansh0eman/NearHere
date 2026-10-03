# Resume here — Night Arcade

## Current execution entry — sprite integration, 3 October 2026

Read [Sprite integration and remaining implementation](sprite-integration-and-completion-20261003.md)
first. Its S0–S8 sequence orders the existing D/U/A/I work with exact source
boundaries, acceptance checks and fallback decisions. This is now an active
implementation record: eight bounded CC0 Kenney looks, their shared native
renderer, Avatar Studio route, strict v3 profile contract, username route and
an additive v3 migration are in the working tree. Local unit tests (110),
TypeScript and Expo lint passed after this slice. The username and v3 Avatar
Studio migrations are deployed to the linked development project; native/
Simulator acceptance and authenticated v3 save evidence are still open.

The user has already authorized using Kenney sprites. A matching head crop and
full-body map view are valid presentations of the same appearance; identical
framing is unnecessary. Begin S0 then S1 and carry the approved assets through
actual mobile rendering, persistence, Studio and all activity consumers. Older
entries below retain historical evidence and do not supersede this sequence.

## 2 October 2026 — new requested scope, planning complete

Active continuation: [Day/night maps, Avatar Studio and account identity](daylight-avatar-identity-20261002.md).
D00 source/worktree inspection is recorded; visual capture and checks remain
open. D01 began: a local System/Daylight/Night Arcade preference route, persistent
preference provider, dynamic StatusBar and two map style variants are present.
This is partial code only; existing screens still use dark static colors and
runtime/type/lint/device acceptance has not been run. The instruction for that
continuation prohibited tests absent a direct user request. Continue migrating
every screen, then return to the planned ledger. It defines D00–D03 themes/map/motion,
U01–U02 usernames, A01–A04 original modular sprites and separate Avatar Studio,
I01–I03 email/Google/Apple/phone and account linking, and Q01 acceptance.
Source inspection confirms six v1 sprites, dark-only app/maps before this partial
slice, phone-only AuthProvider and revisioned profile saves. Provider setup and
Instagram consumer-login suitability remain gates.
Recent generated sprite drafts are unaccepted; alpha and aligned layers need
proof. Existing avatars/activities remain intact. This latest user scope replaces
the old P07 complete-look-only restriction; existing privacy/release rules remain.

## 2 October continuation addendum — authoritative over the initial note above

Expo Router typed routes were stale after adding the appearance route. Expo SDK54
regenerated the ignored `.expo/types/router.d.ts` when its development server
started (`npx expo start --clear --localhost`); `npx tsc --noEmit` then passed.
The initial automated run passed 98 tests and Expo lint. Pure day/night map-style
and theme-preference cores/tests were added; local verification passed 102 unit
tests, TypeScript, Expo lint, and `git diff --check`. Button, Field and tab-bar
colors now follow the current palette, but feature-screen migration is incomplete.
Simulator visual acceptance remains
open; the booted simulator was showing a private meeting-point picker, and no
image was retained. Full day mode remains incomplete because most screens still
use static Night Arcade colors. Continue from D01 migration. No activities,
hosted settings, database rows, or migrations were changed.

## 3 October 2026 — D03 Reduce Motion source implementation

`apps/mobile/components/map/activity-map.tsx` now centralizes all programmatic
camera moves. It reads the existing `useReducedMotion` hook through a ref so
the retained imperative handle sees preference changes. The pure policy
`cameraMotionDuration` preserves normal map timings, bounds unsafe durations,
and selects `Camera.jumpTo` under Reduce Motion; cluster, recenter and event
selection use the same boundary. A test covers that policy. Full unit tests
(103), TypeScript and Expo lint pass. MapLibre's installed Camera source and
current official camera docs were checked for `jumpTo`/`easeTo` semantics.

The Xcode workspace Release build succeeded against the booted iPhone 17 Pro
Simulator using the direct `xcodebuild` route because this Xcode installation
has no `Simulator.app`. The built app was installed and launched by `simctl`.
Simulator CLI exposes appearance and text-size controls but not Reduce Motion.
Therefore native build/startup are established; visual map acceptance, OS
preference delivery, camera behavior, and 12/50/200-point profiling remain open.
No Supabase request, migration, activity creation, or existing activity/data
mutation was made for D03. See the detailed teaching note in
`daylight-avatar-identity-20261002.md`.

U01 username work is also underway: the nullable schema/RPC migration, shared
contract, client validator/parser and repository adapter are coded. The current
Node tests include static SQL-source guards, not database execution. Existing
fictional OTP accounts were not used because the first claim is intentionally
immutable; Docker is present but its daemon is unavailable. No hosted migration
was applied. U01 remains open for disposable-database validation, especially
two concurrent claims and schema-cache compatibility. Details and the beginner
flow diagram live in `daylight-avatar-identity-20261002.md`.

A01 now has an inspected visual anchor at
`docs/design-concepts/avatar-modular-style-proof-20261003.png`. It is an
original compact cel-shaded full-body concept with measured transparent pixels
and a readable 64px preview. The first two generations were rejected as too
similar to v1-01. The chosen proof is not a modular layer set, not in the app,
and not production-approved; anchored parts and registration checks remain. A
CC0 Kenney pack was also downloaded from the creator's site and used for a
four-option layered profile-crop proof at
`docs/design-concepts/kenney-avatar-prototype/kenney-profile-crops-prototype.png`.
Selected source layers and their license are retained with the proof. It is not
yet in the app; changing profile-only art would break map/profile identity
parity, so native composition, map rendering, and product-style acceptance stay
open. See its README for license, code, challenge and verification details.

## Latest continuation contract: premium product roadmap

The user requested an implementation handoff and continued autonomous work.
Planning continues to govern deferred profile/wardrobe/3D work; P00-P02 now have
fresh execution below. Preserve all inherited and current uncommitted edits.

P00 baseline and P01 fixture-identity hardening are verified; P02 avatar
projection is hosted- and Simulator-verified. P03 is implemented and in
Simulator acceptance. See the dated execution record below.

### Live roadmap ledger (update this, not the historical table)

| Ticket | State | Next acceptance requirement |
| --- | --- | --- |
| P00 baseline | code_verified | 80 unit tests, typecheck/lint, 5.13 MB iOS export, linked migrations through 240002, diff check |
| P01 fixtures | hosted_verified | two fixture runs retained all 12 slots with zero creates; concurrent run correctly rejected; cross-machine guard is not provided |
| P02 identity parity | hosted_sim_verified | anon/host/outsider/pending/accepted/both block directions/waitlist/promotion/removal/cancel hosted checks; Me/map/detail/Plans Simulator evidence (Plans screenshot excluded for exact test point) |
| P03 map engineering | simulator_verified | Pure GeoJSON builder and MapLibre adapter; Simulator verified Browse selection, direct avatar selection, cluster expansion, empty-map deselection and overlay-safe camera padding. Scale/performance/device checks remain |
| P04 interaction acceptance | in_progress | Phone/OTP keyboard actions, denied-permission fallback, public place search/manual-area persistence, and explicit private meeting-point validation/search selection verified in iPhone 17 Pro Simulator; iPad A16 native build, fresh prompt, denial recovery and manual-area confirmation/persistence across reinstall verified. Full auth, services-off/no-fix, role/accessibility matrix, physical iPhone, public-place search on iPad and stable map-tile acceptance remain |
| P05 richer profile | in_progress | Owner bio/city/interests, revision RPC and account-scoping implemented and hosted-tested; Simulator save/conflict/reload verified. Public opt-in card/reporting and full onboarding/device matrix remain |
| P06 visual parity | in_progress | Larger split-layout owner character, real optional details and plan states implemented; normal-size Simulator capture recorded. Narrow/large-text/cross-screen acceptance remains |
| P07 bounded wardrobe | not_started | Two-look proof, versioned catalog/save/fallback |
| P08 real 3D | not_started | Asset/license and native proof gates; no meshes exist yet |
| P09 full acceptance | not_started | Hosted, Simulator, privacy, device and performance gates |
| P10 beta readiness | not_started | Provider/signing/privacy/support/user decisions |
| E01-E08 extensions | planned_only | See community roadmap for individual product gates |

`not_started` means this new ticket has not been executed end-to-end; it does not
erase the existing implementation described in the audit. Upon completion append
files/tests/results/evidence and set next ticket explicitly. If a gate blocks one
ticket, continue an independent safe ticket rather than inventing completion.

## 29 September 2026 — hosting time and submission continuation

Follow-up: reloaded a stale Simulator bundle; verified Cancel/Done, Time tab,
Cancel retaining the one-hour choice, and Done clearing shortcuts while retaining
the timestamp. Wheel dragging still fails with `noWindowsAvailable`; no changed
wheel value is claimed. Added confirmation-time future validation and accessible
selected-time value. Screenshot: `docs/screenshots/host-time-draft-controls-simulator-20260929.png`.
Do not repeat unchanged failing wheel automation. Continue independent P05 work;
physical wheel, Android and elapsed-time acceptance remain open.

P04 now uses sequential Android date/time dialogs and an iOS draft with explicit
Cancel/Done. Publish has a synchronous duplicate-press guard, finally cleanup
and late-navigation protection. This is not backend idempotency. Read
[the implementation lesson](../host-time-selection.md).

86 unit tests, TypeScript, lint and iOS Hermes export (5.14 MB) passed. No new
migration or activity mutation was needed. Simulator control reported concurrent
user changes; native interaction acceptance is not claimed. Android runtime
tools were not found on PATH. Next: native date/time acceptance when Simulator
is free, and the remaining P05 public-profile/moderation gate. P07/P08 and
provider/device gates remain open; the application is not finished.

## 28 September 2026 — owner profile continuation

Read [the implementation lesson](../profile-owner-editing.md) for exact code paths,
design decisions, compatibility limits and hosted/Simulator evidence. Migration
`202609280001_owner_profile_details.sql` is deployed and CLI inventory matches.
New `profile-details.mjs` and the existing `profiles-rls.mjs` passed against the
fictional actors, restoring original fields after tests. Local checks pass 85
unit tests plus TypeScript/lint. Normal-size profile screenshot:
`docs/screenshots/profile-owner-details-simulator-20260928.png`.

The native scrolling bridge still fails with `noWindowsAvailable`; do not repeat
the unchanged failing gesture and call it acceptance. AX fields/actions worked.
Remaining independent work: complete public host-card reporting/moderation gate,
finish responsive profile acceptance, P07 two-look artwork proof and versioned
wardrobe. P08 has no licensed compatible mesh assets; P09/P10 device/provider/
signing requirements remain. Do not mark the application finished.

## 24 September 2026 — P00, P01 and P02 continuation

P00 reproduced on the in-progress worktree: the combined mobile/hosted-utility
unit command passed **71 tests**, TypeScript and Expo lint passed, and linked
migrations matched locally/remotely through 230004 before the new migration was
applied. The P01-specific utility tests then raised the total to **73 passing**.
At first no demo actor values were in the shell. I read only the existing four
fictional OTP mappings into process memory; no OTP, phone, token or auth setting
was printed or changed.

P01 replaces the seeder's discovery-based existence check with `my_plans` for
each fixture owner, indexes only activities where that caller is the host, and
fails closed at the 100-row limit or on ambiguous slot ownership. An exclusive
local lock prevents two invocations on this Mac; it does not coordinate other
machines. An ambiguous `create_activity` response is reconciled by the next
owner-scoped scan. No manifest, RLS broadening, database write, cleanup, or
destructive action was added. Two authenticated runs each reported 12 retained
slots and zero creates. A same-Mac concurrent-run test allowed one process and
rejected the other at the exclusive lock; no activity row was changed. This does
not establish cross-machine serialization.

P02 adds `activity_detail_with_avatar` and `my_plans_with_avatars`, preserving
the established `activity_detail` and `my_plans` functions. They append only a
version-1 seed and/or one of the bundled catalog IDs; they do not return raw
profile JSON. Existing base functions continue to decide membership, block and
exact meeting-point access. `202609240001` adds the allowlisted avatar fields;
`202609240002` fixes an older `my_plans` bug that retained a blocked participant's
exact point. Both additive/forward-only migrations are deployed. Anonymous smoke
checked three existing details. Two-actor hosted detail acceptance then verified
base/wrapper field equality through anon, outsider, pending, host, accepted,
cancelled and left states, plus blocks in both directions. The four-actor
participation suite verified the Plans wrapper's caller scope, pending,
accepted, waitlisted, promotion and removal states. All checks passed after the
block fix. Local parsers reject unknown avatar config shapes/extra keys.

Local gates: **79 tests pass**, TypeScript/lint and 5.12 MB iOS export pass;
migrations match through 240002. Simulator confirms the same host character in
Me, map selection, Detail and Plans. Privacy-safe evidence: [Profile](../screenshots/host-avatar-profile-simulator-20260924.png)
and [Detail](../screenshots/host-avatar-detail-simulator-20260924.png). A local
Plans capture showing an exact test point was deleted and excluded. Authenticated
test harnesses intentionally created clearly labelled `TEST` events (including
cancelled detail fixtures) and restored client-writable profiles. No existing
activity was deleted; all test rows remain for review. No physical-device
evidence was produced.

### P02 security discovery — Plans block leak

The first hosted symmetric-block test failed: `activity_detail` already hid the
exact point from the participant, but old `my_plans` still returned it. The test
was refined to match intended ownership: the affected participant loses access;
the host retains their own meeting point. Migration `202609240002` adds the same
symmetric block predicate to both exact-coordinate columns in `my_plans`, without
changing membership, ordering or host ownership. Re-running both actor
directions passed for Detail and Plans. This is why security-definer wrappers
must preserve and compare the complete base projection, not only test a new
success response.

### P03 first slice — pure GeoJSON boundary and native adapter

Added `apps/mobile/lib/activity-map-features.ts` and deterministic tests. The
builder validates finite latitude/longitude bounds, emits GeoJSON in
`[longitude, latitude]` order, drops duplicates/invalid records without shifting
coordinates, picks a stable allowlisted avatar key, and rejects rows carrying
private exact-location fields. Selection lookup is a pure function, so filtering
out a selected item resolves to no selection.

Moved MapLibre Map, Camera, Images, GeoJSONSource and all stable-ID Layers into
`apps/mobile/components/map/activity-map.tsx`. The screen now passes public
features, viewport/location state, selection and callbacks; the adapter contains
no auth, repository, or write logic. It retains the constant selected halo layer
because MapLibre layer identity must not shift across renders. Imperative camera
and attribution capabilities are exposed by a narrow typed ref.

New map tests: **6 passed**; combined suite: **79 passed, 0 failed**;
TypeScript/Expo lint and iOS Hermes export (5.12 MB) pass. Fast Refresh in
Simulator rendered the full authored map with all ten existing demo markers and
clusters; Browse row -> map selection still showed the existing selected
activity card. Evidence: [map selection](../screenshots/map-adapter-browse-selection-20260924.png).
No activities were created or modified. The dock and map viewport are measured;
bounded camera padding keeps Browse-selected activities above the selected-card
overlay. Simulator verified Browse row selection, direct avatar marker tap,
cluster expansion, empty-map deselection, pan to selection and the
MapLibre/OpenFreeMap/OpenMapTiles/OpenStreetMap attribution panel. Cluster
expansion now applies the same measured bottom padding as other camera
movements. Evidence: [direct marker selection](../screenshots/map-avatar-marker-selected-simulator-20260924.png)
and [selection cleared](../screenshots/map-avatar-marker-cleared-simulator-20260924.png), plus
[map selection](../screenshots/map-adapter-browse-selection-20260924.png) and
[overlay-aware pan](../screenshots/map-adapter-overlay-selection-20260924.png).
Two failures were reproduced and fixed: a native `onLayout` callback can arrive
without a layout payload, and a camera imperative call before `onDidFinishLoadingMap`
can target a nonexistent native ref. Filter change after a map selection, tile-
error retry and 12/50/200 physical-device performance measurements remain
unverified. P03 is Simulator-verified but not fully performance/device accepted.

The same P04 slice tested location after temporarily revoking permission for
the Simulator app. The map offered Settings and Choose area. A public landmark
search returned a result; confirming it persisted the selected-area label and
recentered discovery locally. Re-requesting GPS while denied preserved that
manual region and removed the old blue current-location dot. The prior Simulator
permission and Near you state were restored afterward. Evidence:
[denied GPS with manual area retained](../screenshots/location-denied-manual-area-simulator-20260924.png).
This uses public search data, not a personal location. Services-off, a native
fresh permission prompt, no-fix/cached-fix and physical-device location remain
open.

### P04 first slice — phone and OTP keyboard actions

The user's keyboard report was reproduced: the phone submit action was under
the iOS number pad. Moving the button to a normal footer did not fix it because
the Simulator keyboard overlays the window without resizing its content. An
`InputAccessoryView` experiment also reserved a blank row but its controls did
not render for this phone-pad flow. The working design measures keyboard height,
places the primary action and a `Done` control immediately above the keyboard,
and scrolls the form so the active field stays visible. The normal footer
returns when the keyboard closes. The same pattern is in phone and OTP screens.

Simulator acceptance: phone field focused; “Send one-time code” and Done were
visible and tappable above the number pad. Tapping Send with only `+91` showed
local validation and did not request an SMS. Done dismissed the keyboard and
restored the normal footer. OTP screen showed the same action row; it was
disabled when opened directly without a pending phone, as expected. No real
number, OTP request, or auth state was used. After adding a regression test for
location-failure presentation, local tests are 80/80; typecheck, lint and a
5.13 MB iOS export pass. This is not physical-device or Android evidence.

## 24 September — planner audit supersedes earlier completion claims

Read [the full plan audit](night-arcade-plan-audit-20260924.md) for every ticket,
omission, fix and teaching note. Baseline `07999f0` was clean; audit changes are
local/uncommitted. Old dirty-file/PID/lock-screen notes below are historical.
**The redesign is not fully accepted.**

Fresh gates: 67 unit tests, TypeScript, lint, iOS export (5,115,533 bytes),
26 matching local/remote migrations through 230004, anonymous discovery 12 demo
rows/12 bounded avatar configs. Dependency audit still reports 24 findings.
No hosted records changed. No new native binary or physical-device test.

Fixed: stale location initialization, editor retry mode/duplicate submission,
profile scrolling and actual upcoming-plans preview, operator theme, and the
date-sheet accessibility grouping. Simulator rendered real profile plans and
exposed native date/time controls; changing the wheel value remains unverified.

**Next exact action:** ticket 0.5, harden seeder duplicate detection using a
verified owner-scoped identity lookup or validated receipt manifest. Preserve
all records. Then add the missing detail-avatar projection, map adapter/tests
and complete the audit's acceptance sequence. Do not let Simulator coordinate
input limitations hide source omissions. Latest discovery has 12 active demos;
the old 13-row count does not establish that any row was deleted.

## Earlier checkpoint (historical evidence)

Last checkpoint: 24 September 2026. User resumed with **continue**; implementation
is authorised. The user asked for a first-principles, deeply documented build
and will switch models themselves. This checkpoint describes in-progress work;
verify Git, process/build state, hosted migration state, and Simulator before
assuming any of it is still current.

## Earlier next action (see audit sequence above instead)

Next: find a reliable Simulator input path for MapLibre marker selection and
cluster expansion on the authored map; the controls are absent from the
accessibility tree and CUA coordinate taps return `noWindowsAvailable`. Nearby
Browse filtering, list-to-map selection, detail navigation, the profile editor,
Plans privacy states, host form, date/time sheet, manual area search, and
meeting-point search now have partial live Simulator checks. Still open: commit
and verify a custom date/time, test GPS/current-location failure recovery (the
reported “location unavailable” issue is not resolved by this session), verify
profile-save/relaunch parity, exercise host publish and activity roles/status
transitions, inspect remaining UI without capturing exact coordinates, and
complete physical-device/accessibility acceptance. V16/V17 prove the credit
control and provider panel. Keep all 13 development activities intact.
Everything so far is Simulator evidence, not physical-device acceptance.

Working direction: Night Arcade, charcoal/lime. User liked the concepts and left
avatar complexity to the designer; no explicit A/B/C selection. The planner chose
the previously recommended direction. First avatar release is six pre-rendered
full-body characters with a stable catalog, not live 3D or a wardrobe builder.

## Ticket ledger

| Ticket | State | Evidence / remaining gate |
| --- | --- | --- |
| Plan/research/concepts | Complete | Source-backed design review, three images, execution playbook |
| 0 Baseline/recovery/fixtures | Pass for populated-map smoke; GPS partial | 12 persistent demo activities + original Test marker remained; location returns on retry; permission denial/recovery was previously Simulator-checked. Latest session: Center on my location recentered and showed the blue dot in Simulator (V22). Area and meeting-point searches returned Bellandur Lake; neither result was committed. The user's physical-iPhone “location unavailable” report remains open. |
| 1 Tokens/shared controls | Implemented; visual gate open | Night Arcade tokens + shared Button/Field; Nearby/Auth/Me/Plans/Host-create/Detail/map-picker overlays use the palette. Native picker basemap appearance and all new layouts still need Simulator review. |
| 2 Character assets/catalog | Pass for Simulator rendering | Six original transparent 512×768 characters, ~1.5 MB total; stable catalog/hash; map, Browse and Me render the same account choice. |
| 3 Public host avatar projection | Pass for anonymous shape smoke | Migrations 230002/230003/004 deployed; anonymous live RPC returned 13 rows/13 valid configs, currently only `seed,version`; no private/account fields; full authenticated/block matrix remains. |
| 4 Full profile editor | Visual UI reviewed; persistence gate open | Six accessible presets, live preview, display-name edit; retains the server seed, persists an allowlisted catalog ID. V19 proves layout and current selection only; test save/reload and marker consistency in Simulator. |
| 5 Custom map proof | Render + attribution tap verified; map point taps open | Local 13-layer Night Arcade MapLibre style uses OpenFreeMap TileJSON/glyphs and explicit OpenFreeMap/OpenMapTiles/OSM attribution; MapLibre v8 validator passes. V15 proves style rendering; V16 shows the visible credit line and populated map. Tapping the credit opened the native attribution panel with all three providers/data credits. Marker/cluster taps on this style remain open because Simulator AX omits overlays and CUA coordinate taps fail. V14 depicts the former vendor dark style. Provider has no production SLA decision. |
| 6 Map integration | Pass on prior style; current style tap open | Activity markers/clusters add to 13; V14 (previous OpenFreeMap dark style) proved selecting an avatar opens the existing selection card and tapping clusters expands/zooms; stable Layer IDs fixed a runtime error. V15-V17 prove the new style renders/attributes, but direct marker/cluster taps on it remain unverified. Android, screen-reader map layer, loading failure retry and 50-point scale testing remain. |
| 7 Secondary screen redesign | Implemented; partial visual review | Nearby, Browse, profile editor, Plans privacy states, Activity Detail, Host form/custom-time modal, manual area search and meeting-point search have been inspected. V18-V21 document safe screens. Profile save/relaunch, screenshot of exact-point screens (intentionally excluded), native custom-wheel selection, GPS recovery, auth and remaining role/state checks are open. |
| 8 Acceptance | Partial | V14 (old style), V15 (authored style), V16/V17 (visible credit + attribution panel), V18 (Browse Coffee), V19 (profile editor), V20 (host form), V21 (custom time modal), V22 (current-location recenter) and V23 (selected-avatar size) captured. Credit, filter, list-to-map selection, detail navigation, location search and Simulator recenter were interacted with. Authored-style marker/cluster taps, profile persistence, custom time save, every role/state, accessibility and physical iPhone acceptance remain open. |

## Implemented foundation

- `lib/device-location.ts`: distinguishes disabled services, app denial and missing
  fix; bounds current-fix wait to 12 seconds; uses cached fix only <=5 minutes old
  and <=1000m accuracy; labels it Recent location. Native wrapper preserves current
  region/source on failure and separates storage failure from GPS failure.
- `hooks/use-nearby-location.ts`: request generation and storage revision reject
  stale GPS/manual reads. The audit adds applied/empty/superseded restoration so
  initialization cannot restart GPS after a newer choice. Manual writes are
  serialized; denied/error AppState recovery already exists. Native lifecycle
  acceptance remains open.
- Nearby has actionable location notice: Settings or Retry plus Choose area.
- `lib/avatar-identity.ts`: validates v1 UUID seed and uses stable account ID
  fallback for own-profile renderer, not display name.
- Migration `202609230001_assigned_avatars.sql` **deployed successfully** to
  development project `gmgtugbvnvhdmfuoifcc`. DB default creates random UUID seed
  per new profile; only existing `{}` configs backfilled, custom JSON preserved.
- Nearby's map uses locally bundled original character art. Persistent account
  seeds and a catalog choice are returned by a safe projection that allowlists
  `{version, seed, avatarId}`.
  Unsupported/legacy values become null and the client uses a display-name
  fallback; that fallback is decorative and is not an identity/authentication fact.
- `supabase/tests/hosted/demo-activities.mjs`: 12 marked development activities
  across 4 pre-existing fictional accounts near Bellandur, no deletions/cancellations.

## Exact observed verification — current checkpoint

1. Mobile unit suite before custom map test: **61 passed, 0 failed** after adding profile and catalog
   validation; earlier Distill reported three failures because Node could not
   resolve an extensionless runtime import into the shared TS-only package. The
   helper is now in the mobile domain module and the test passes.
2. Latest full source gate after authored-map marker sizing (24 Sep):
   `npm run test:unit` **62 passed / 0 failed**; `npx tsc --noEmit` exit 0;
   `npm run lint` exit 0; iOS export exit 0; exact bundle size **5,111,500
   bytes**; MapLibre v8 style validator returned zero errors; `git diff --check`
   exit 0. Export success alone did not prove runtime rendering; the subsequent
   Metro-connected Simulator launch and map render are separately recorded as
   V15. This is not a signed/production installation.
3. `npx expo config --type prebuild --json`: exit 0; new architecture, bundle ID and MapLibre plugin present.
4. Earlier profile-editor export: exit 0; JS bundle 5.09 MB. The latest
   post-style export and exact byte count are recorded in item 2 above.
5. `npx expo run:ios --device 25CD5EA7-8BB1-439C-B1EB-51E73B71DAB9`: **exit 0**, native build, install and launch. Three warnings: duplicate `-lc++`, deployment target warnings from react-native-maps privacy pod and SDWebImage. The first build failed due MapLibre headers missing. Cause: plugin had been added after an existing ignored native project and its pod post-install hook had not rerun. Non-clean `expo prebuild --platform ios` applied `$MLRN.post_install`; then `pod install` generated the Swift Package references; rebuild succeeded. No `--clean` was used.
6. MapLibre Simulator screenshot: [V14](../screenshots/night-arcade-maplibre-simulator-20260923.png), iPhone 17 Pro / iOS 26.5, development actor, Bellandur fixtures. Real streets + four clusters + two single-character pins, recenter blue dot, 13-item Browse dock. Individual marker opened correct card; tapping clusters zoomed into individual people. This is Simulator, not physical iPhone evidence.
7. Authored-map source check: `nearhere-night-arcade-v1.json` has 13 ordered
   vector/map layers, required OSM/OpenMapTiles/OpenFreeMap attribution, and
   passed the renderer-matched MapLibre v8 style validator with zero errors.
   Style regression test added. Fresh Simulator screenshot [V15](../screenshots/night-arcade-maplibre-authored-style-simulator-20260924.png)
   proves the authored style rendered. Follow-up screenshot [V16](../screenshots/night-arcade-maplibre-attribution-simulator-20260924.png)
   shows the later visible credit line; tapping it opened the attribution panel,
   whose accessibility tree listed OpenFreeMap, OpenMapTiles and OpenStreetMap.
   Browse's All view loaded 12 demo activities; Coffee narrowed that to two;
   selecting a row centered the map and opened the selected activity detail.
   Profile editor showed all six presets and Cancel left the profile unchanged.
   Plans showed a pending request without its exact point and the test host's
   own hosted activity with its exact point available. The detail/Plans visual
   was not saved because it displayed an exact test meeting coordinate.
   Area and meeting-point searches for “Bellandur Lake” returned attributed
   results. Selecting the meeting-place result recentered its local draft; both
   pickers were closed before their respective Use buttons, so no area or
   activity point was committed. Host form/custom-date sheet were captured as
   V20/V21; the native date/time wheels did not expose actionable elements.
   An attempted coordinate tap on a visible count cluster returned
   `noWindowsAvailable`; do not claim authored-style marker or cluster taps.
   After changing symbol icon size to 0.11 by default / 0.15 selected, Metro
   Fast Refresh rendered the selected avatar in [V23](../screenshots/night-arcade-selected-avatar-simulator-20260924.png).
   That is selected-state rendering via Browse, not direct marker hit-testing.
   V14 remains evidence for the old remote `dark` style.
8. The authored map has an always-visible, accessible map-credit button that
   opens MapLibre's full attribution panel. Follow-up session verified the tap,
   saw all provider/data credit rows, and saved V16 after closing the panel.
   The follow-up 62-test suite, TypeScript, lint, iOS export and diff checks
   passed. Marker/cluster hit testing remains blocked by the current Simulator
   input/accessibility path, not by a known product failure.
9. A tap initially caused MapLibre dev error `` `id` cannot be changed `` because conditional insertion of a selection halo shifted component identity. Rendered the halo unconditionally with an empty-feature filter; marker select and cluster expansion then passed without red screen.
10. `supabase migration list --linked`: local/remote matched through
   `202609230004`. Migration 004 safely extends the existing projection with
   optional allowlisted `avatarId`. Anonymous RPC smoke after deployment:
   13 rows, 13 safe configs, keys currently `seed,version`, no selected IDs yet
   because no user has changed a preset; no account ID, phone, private or exact
   result columns. Full signed-in/symmetric-block tests remain.
11. Existing development rows were not removed, cancelled or rewritten. First and second fixture seeder evidence remains recorded in the earlier paragraph. The visible count is the original 12 demos + original Test activity.
12. `npm install` reported 24 audit findings (13 moderate, 11 high); no audit auto-fix run. Triage without framework-wide forced upgrades before release.
## Historical runtime pointers — superseded by the audit above

- Repo `/Users/ansh0eman/Desktop/NearHere`; branch `leda/initial-product-foundation`.
- Previous published HEAD before this handoff: `ef17c1e`.
- Foundation source/migration/fixture commit: `c8d2edb`. The separate subsequent
  documentation commit contains this checkpoint, research and execution plan.
- Simulator: iPhone 17 Pro, iOS 26.5,
  `25CD5EA7-8BB1-439C-B1EB-51E73B71DAB9`, booted at checkpoint.
- Metro port 8081, PID 18506 at checkpoint. Inspect before starting another.
- Public mobile env file `apps/mobile/.env` exists; never print its full contents.
- Management token file `~/.supabase/access-token` exists; do not print/commit it.
  CLI link/push worked at checkpoint. No DB password needed in docs.
- OTP config read through authorised Management API, selecting only the four
  existing fictional numbers matching `1650555123[4-7]`. Values injected into the
  fixture process in memory; none committed. Do not modify auth settings or add
  real phone actors. If unavailable, stop and request test configuration safely.
- Map research checked the current official MapLibre Expo docs and package
  metadata: Expo >=54, React >=19.1, React Native >=0.80; app is Expo 54/RN 0.81.5
  with New Architecture enabled. Package is `@maplibre/maplibre-react-native@11.4.0`.
  Expo config plugin is added. MapLibre v11 uses `Map`, `Camera`, `GeoJSONSource`,
  and `Layer`; old `MapView`, `ShapeSource`, and `PointAnnotation` examples are stale.
- Prototype tile style: `https://tiles.openfreemap.org/styles/dark`; OpenFreeMap
  says no key/registration and free public use, but its current terms say
  “as-is”, no availability warranty, may discontinue, and CDN requests may be
  processed by Cloudflare. Therefore prototype only, retain attribution, avoid
  transmitting personal/exact meeting coordinates, no production SLA claim.
- Current new uncommitted project files include `apps/mobile/assets/avatars/v1/`
  and generated art. A new untracked root `images/` directory appeared during
  generation; it was not at initial `git status`. Preserve and leave it unstaged
  until ownership is clear. The pre-existing migration blank-line change remains
  unrelated: `supabase/migrations/202608150002_create_activities.sql`.
- Previous native MapLibre build/install completed successfully. Current
  profile/editor and Night Arcade secondary-screen changes have now passed JS
  export but still need a fresh Simulator launch and visual/interaction review.
  iOS Simulator is booted,
  but the Mac lock screen currently prevents GUI automation. Check Metro before
  starting another process.
- Persisted fixtures have future times across roughly three days, not eternal
  events. Seeder replenishes expired slots without deleting history. Before each
  visual iteration check/replenish fixtures; no scheduled task was created.

## Protect this unrelated edit

`supabase/migrations/202608150002_create_activities.sql` had a pre-existing blank
line change. Leave it uncommitted and do not revert it. All other source changes
described above were produced for this request and can be inspected in the scoped
handoff commit/diff. Use Git status rather than assuming a clean worktree.

## Update format for the executing model

Append a dated ticket entry with files, actual tests/exit outcomes, screenshot
paths, unresolved failures, whether hosted changes were deployed, commit hash and
the next exact action. Keep the ticket table current. Never mark done because
code was written; the ticket's pass criteria must be observed.

### 2026-09-24 — P04 host draft privacy and custom time sheet

The host-form review found a privacy-default defect: a valid latitude/longitude
passed for the discovery map initialized `meetingPoint` as “Current discovery
area.” Merely opening Host could therefore imply that the broad discovery
center was an explicitly chosen *private, exact* meeting point. Changed
`apps/mobile/app/host/create.tsx` so `meetingPoint` starts `null`; the initial
coordinates now seed only the map-picker camera. The host must press “Use this
meeting point” after searching or positioning the pin. The form shows “No
meeting point selected” before that confirmation, and publication returns the
specific missing-point validation before reaching `createActivity`.

Simulator evidence, iPhone 17 Pro / iOS 26.5:

1. Open Host from Nearby. The private-point row read “No meeting point selected”
   despite an initialized Nearby map/GPS region.
2. Press Publish after entering a local validation-only title. The inline error
   read “Choose an exact private meeting point before publishing.” Source order
   confirms this returns before the create API call. No activity was published.
3. Open the picker. Its pin starts at the passed map camera center, but the host
   form remains unselected until the user explicitly presses Use. We pressed
   Use once to confirm the local draft handoff, observed “Dropped pin” on Host,
   and then closed Host without publishing. This tests explicit confirmation of
   the centered pin, not moving the pin or confirming a different search result.
   It writes only the existing local picker-draft handoff; it did not create,
   edit or delete an activity.
4. Open Custom date & time. The modal exposed Date/Time tabs and native iOS
   spinner controls; both tabs rendered. We closed with the close control and
   did not change/confirm the time. Picker open/visibility is verified, but
   changing an arbitrary wheel value remains unverified.

Important remaining host-flow tests: pan to a different point and confirm it,
test custom date/time changes including past-time validation, verify 30 min / 1
hour / Tomorrow boundary cases, keyboard and VoiceOver coverage, then repeat on
a physical device. The current session did not create an activity and preserved
every fixture.

Then searched “Cubbon Park, Bengaluru” through the existing public place-search
provider, selected its “Cubbon Park, Cubbon Road, Vasanth Nagar…” result, and
pressed Use. The Host form displayed the selected result, but its full provider
address crowded the private-point card. Added a two-line, tail-truncated
presentation in `apps/mobile/app/host/create.tsx`; the full label remains in the
local meeting-point draft and only the visual text is constrained. V28 records
the compact result. We closed Host without publishing.

After the code change: `npm run test:unit` from `apps/mobile` passed 80/80;
`npx tsc --noEmit`, `npm run lint`, `npx expo export --platform ios` (5.12 MB
Hermes bundle) and `git diff --check` passed. This was a JavaScript/TypeScript
bundle export, not a rebuilt signed iOS app. No migration, hosted configuration,
or activity data changed. V24 is the refreshed empty-point-state screenshot.

### 2026-09-24 — P04 custom-time test coverage and Simulator boundary

Reopened the Host custom date/time sheet and confirmed Date and Time tabs render
in the iPhone 17 Pro / iOS 26.5 Simulator. The native date wheel exposes
accessibility sliders, but setting a slider did not change the value. A direct
wheel coordinate tap returned `noWindowsAvailable` from the UI automation
bridge. Dismissed the sheet without changing the local draft; did not publish.
This is an automation limitation, not evidence that native wheel input fails on
a physical iPhone. Actual wheel selection remains unverified.

Added two pure unit tests in `apps/mobile/lib/activity-time.test.mjs`: the Host
quick-start options explicitly map to 30, 60 and 1,440 minutes, and the one-hour
and 24-hour calculations round forward to the next minute. Current suite is
**82/82 passing**; `npx tsc --noEmit`, `npm run lint`, and `git diff --check`
pass. No app runtime code, migrations, hosted settings, or activity rows changed
in this slice. Next: physical-device custom wheel/date boundary, then continue
the remaining P04 acceptance matrix rather than treating this Simulator limit
as completion.

### 2026-09-24 — P04 quick-start visual acceptance

In Simulator, selected each quick-start option. “30 min” highlighted and the
displayed date/time updated; “1 hour” highlighted with its updated time; and
“Tomorrow” highlighted and advanced the displayed date to 25 September while
keeping the same clock time. Captured [V29](../screenshots/host-quick-start-tomorrow-simulator-20260924.png).
Closed the form without publishing. This accepts the three quick buttons and
their visible selected state for this Simulator run; it does not validate native
custom-wheel input or time-zone/DST behavior on physical iOS/Android.

### 2026-09-30 — populated-map recovery and visual verification

Discovery showed one current activity because the original V1 demo rows had
expired, while the cautious fixture index still correctly treated their markers
as occupied. The seeder now accepts a named marker and uses `NEARHERE_DEMO_V2`
for a new current batch; V1 rows remain historical data and are never modified.
The marker parameter is allowlisted to uppercase letters, digits and underscores
before it is used to construct the matching expression. A unit test proves that
a V1 row cannot block a V2 slot.

The authenticated project configuration supplied four already-approved fictional
test actors in-memory. The V2 run created **12** activities and retained none of
its own slots; it did not delete, cancel, rename, or overwrite V1. Simulator
Browse then exposed 13 rows total, and a Browse-to-map selection centered a V2
activity and showed its existing preview. Evidence: [populated map](../screenshots/night-arcade-map-populated-v2-simulator-20260930.png)
and [selected activity](../screenshots/night-arcade-map-selected-v2-simulator-20260930.png).
TypeScript, lint, and the unit suite passed at **87/87**. This is development
fixture and Simulator evidence—not physical-device, dense-scale, or production
launch evidence.

### 2026-09-30 — P04 platform-neutral location recovery copy

Source review found `locationFailureMessage('servicesDisabled')` told users to
open “iPhone Settings,” although the confirmed release target includes iPad.
Changed only that wording to “Settings”; the location resolver, permission
request, manual-area behavior and storage were not changed. Added a regression
for the three typed failure reasons, ensuring each still offers “choose an area”
and no-fix still says the selected area is unchanged. The implementation flow is
`resolveDeviceLocation` → typed `LocationFailure` → `locationFailureMessage` →
Nearby recovery UI; tests exercise the pure message boundary, not OS permission
dialogs or real GPS. The handoff lesson is in `docs/code-tour.md`. P04 remains
in progress: services-off/no-fix on a real device, full auth/state/accessibility
matrix and physical-iPhone evidence are still open. iPad A16 Simulator later
verified the fresh system prompt and denied-permission recovery copy below. The
new location-message regression raised the current local suite
to **91/91**; `npx tsc --noEmit`, `npm run lint`, and `git diff --check` pass.
Node still emits non-failing `MODULE_TYPELESS_PACKAGE_JSON` warnings for TS
tests. No hosted records or activities changed.

### 2026-09-30 — P04 iPad launch and location prompt

Built and installed the current native app specifically for iPad (A16), iOS
26.5, with `npx expo run:ios --device E9EBBE06-3944-4E3C-AEB0-1A888F9BAAC4`.
The first copied dev-client install had no JS bundle URL; the iPad-specific
native build resolved that setup issue (`Build Succeeded`, 0 errors, 3
non-fatal native warnings: older iOS deployment targets in React Native Maps
privacy/SDWebImage pods and duplicate `-lc++` linkage). The app rendered Nearby and displayed
the system location-permission prompt with the intended explanation that live
location is not shared. “Allow Once” was selected in Simulator. The map first
appeared dark/blank, then rendered a basemap and blue location marker after a
delay. System logs recorded repeated OpenFreeMap vector-tile `NSURLErrorDomain
-1005` connection-loss errors during initial loading; a host-side GET to the
style endpoint returned HTTP 200, which does not prove tile delivery from the
Simulator. Screenshot: [iPad location/map](../screenshots/p04-ipad-location-map-20260930.png).

This verifies native build/install/launch and the fresh iPad permission prompt,
not full location accuracy, public-place search, sign-in/OTP, or physical
hardware. The map eventually rendered, but transient
tile failures mean map/network acceptance remains open. Simulator test used no
authentication and did not join, host, edit, delete, or cancel any activity.
P04 remains `in_progress`; do not mark App Store or physical-device acceptance.

Follow-up in the same iPad Simulator: revoked only NearHere's simulated
location permission, relaunched the app, and observed the platform-neutral
recovery banner (“NearHere needs location permission. Allow access in Settings,
or choose an area.”), both “Open Settings” and “Choose area” actions, retained
Bengaluru search area, existing activity count and map cluster. Evidence:
[iPad denied-location fallback](../screenshots/p04-ipad-location-denied-20260930.png).
We did not activate either action in this denial screenshot. After capture, reset the Simulator permission to
not-determined so the next run gets a fresh prompt. Existing test activities
were only displayed; none was mutated. The denial screenshot still shows the
development MapLibre error toast from earlier transient tile failures.

Manual-area confirmation and persistence were then completed on iPad. From the
denial banner, opened the manual picker and pressed its explicit “Use this area”
confirmation for the already-selected Bengaluru map center. Returning from
Browse preserved the “Selected area” label and all 17 existing activity results.
After a cold launch initially failed because Metro had been stopped (dev builds
need a JS bundle), rebuilt/reinstalled the same development app with
`npx expo run:ios --device E9EBBE06-3944-4E3C-AEB0-1A888F9BAAC4`; the app data
survived and Nearby returned to the same selected area and 17 results with no
device-location dot. Evidence: [iPad area persistence](../screenshots/p04-ipad-area-persistence-20260930.png).
The app permission was reset to not-determined after the denial test. This
proves Simulator-local preference persistence across app reinstall, not
physical-device persistence, public-place search on iPad, or GPS accuracy.

### 2026-09-30 — P04 physical-iPhone build gate

Xcode and `devicectl` enumerate the paired iPhone 13 Pro as available; NearHere
is already installed there at version 1.0.0. The first Expo device lookup by
UDID failed before building, while selecting the paired device by its registered
name succeeded. The build then stopped before install with xcodebuild error 65:
no iOS Development provisioning profile exists for `com.nearhere.app`, and
Xcode did not generate one because provisioning updates were not enabled. The
project uses `CODE_SIGN_STYLE = Automatic`; the build output says enabling
`-allowProvisioningUpdates` is required to create/find a profile. No profile
was created, no app was installed or launched on the physical iPhone, and its
existing 1.0.0 app/data remain untouched. Do not bypass this gate: permitting
Xcode to create/update profiles is an Apple Developer account/device-signing
change and needs the user's explicit approval. No real-device acceptance is
claimed.

### 2026-10-01 — reliability: chat fallback and retry-safe activity publishing

The Activity Detail chat effect had a subtle recovery defect: an initial channel
failure started a polling timer; a later subscription recovery cleared it but
left the non-null handle in the closure; the next failure then believed polling
was still running and did not restart it. `lib/chat-connection.ts` now makes the
transport transition explicit. The screen clears **and unsets** the timer handle
on `SUBSCRIBED`, then starts exactly one timer after a later failure. Tests cover
failure → recovery → second failure, duplicate failures and no Realtime channel.

The Host form now calculates a stable request key for an unchanged draft. New
mobile helper `lib/activity-creation.ts` reuses it after an uncertain response
and rotates it when any serialized draft field changes. Migration
`202610010001_create_activity_idempotency.sql` was applied to the linked
development project: `private.activity_creation_requests` has a host-scoped
unique key and payload hash; `create_activity_idempotent` locks that row,
returns the original activity on retry, and rejects a reused key with changed
details. The client now calls that new RPC. No activities were created,
cancelled or changed while applying the migration.

Local results: 96 unit tests passed; TypeScript, Expo lint and diff check passed.
Migration push completed against the linked **development** project only. No
hosted actor retry test, Simulator host publish, physical-device build, production
deployment or release acceptance is claimed. Next: extend/run the disposable
hosted actor harness for same-key retry and changed-draft rejection, then test
the actual host retry flow on Simulator.
