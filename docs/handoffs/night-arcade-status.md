# Resume here — Night Arcade

Last checkpoint: 24 September 2026. User resumed with **continue**; implementation
is authorised. The user asked for a first-principles, deeply documented build
and will switch models themselves. This checkpoint describes in-progress work;
verify Git, process/build state, hosted migration state, and Simulator before
assuming any of it is still current.

## Next exact action

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
- `hooks/use-nearby-location.ts`: request generation ignores stale GPS completion;
  manual selection/unmount invalidate it. Manual-storage read/write races and
  Settings foreground recovery still need ticket 0 review.
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
## Runtime pointers — verify, may become stale

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
