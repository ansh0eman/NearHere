# Resume here — Night Arcade

Last checkpoint: 23 September 2026. User explicitly requested **planning first**
and will switch to a lighter model before saying **continue**. Do not begin
implementation simply because this file exists; the next continue authorises it.

## Next exact action

Read `night-arcade-execution.md` and `../design-concepts/design-review.md`, inspect
the Night Arcade image, verify current Git, then start **Ticket 0**. First finish
location/UI and fixture acceptance before introducing new native map dependencies.

Working direction: Night Arcade, charcoal/lime. User liked the concepts and left
avatar complexity to the designer; no explicit A/B/C selection. The planner chose
the previously recommended direction. First avatar release is six pre-rendered
full-body characters with a stable catalog, not live 3D or a wardrobe builder.

## Ticket ledger

| Ticket | State | Evidence / remaining gate |
| --- | --- | --- |
| Plan/research/concepts | Complete | Source-backed design review, three images, execution playbook |
| 0 Baseline/recovery/fixtures | Partial | Hosted fixtures + unit checks done; Simulator acceptance and race review pending |
| 1 Tokens/shared controls | Not started | Old mixed themes remain |
| 2 Character assets/catalog | Not started | Generated concept art is NOT production sprite assets |
| 3 Public host avatar projection | Not started | Discovery still lacks host avatar config |
| 4 Full profile editor | Not started | Assignment foundation deployed, no editor/catalog picker |
| 5 Custom map proof | Not started | MapLibre not installed; production provider undecided |
| 6 Map integration | Not started | Current Apple Maps remains |
| 7 Secondary screen redesign | Not started | Cream/orange Host/Detail still present |
| 8 Acceptance | Not started | No full visual/physical acceptance claim |

## Work already done BEFORE the planning-only instruction

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
- Existing renderer is still the simple face. **Not redesigned artwork.** Map
  host markers still use display names until safe projection ticket 3.
- `supabase/tests/hosted/demo-activities.mjs`: 12 marked development activities
  across 4 pre-existing fictional accounts near Bellandur, no deletions/cancellations.

## Exact observed verification

1. Mobile unit suite: **56 passed, 0 failed** after seven new avatar/location tests.
2. First combined pipeline exited 1 despite Distill printing only pass count:
   root `npx tsc` was not the project compiler. Bounded raw output identified it.
   Rerun using `apps/mobile/node_modules/.bin/tsc --noEmit` inside mobile exited 0.
3. `npm run lint --prefix apps/mobile` exited 0, no diagnostics.
4. `npx supabase migration list`: local/remote matched through `202609210002`,
   new `202609230001` pending. Then `npx supabase db push --yes` applied only it,
   command exited 0. Prior user-owned blank-line edit was not a pending migration.
5. Hosted SQL transaction inserted a temporary `auth.users` row, verified profile
   trigger assigned a seed, changed display name and checked seed unchanged, then
   rolled back. HTTP 201. Follow-up aggregate: 4 assigned profiles, 0 empty configs.
   This tests DB assignment, **not a new signup through Simulator UI**.
6. Fixture seed first run: `created:12, retained:0, hosts:4`. Second run:
   `created:0, retained:12, hosts:4`. All slots explicitly marked Demo and carry
   `NEARHERE_DEMO_V1:<slot>` in description. No test invitations to real people.
7. Simulator app was inspected via accessibility before setting simulated GPS;
   it showed one existing Test marker and the discovery controls. Simulated GPS
   then set to 12.9283,77.6739. **No post-change populated-map or location UI
   acceptance screenshot was captured before user switched request to planning.**
8. No new iOS export/native build, physical-device test, or full hosted regression
   suite was run for these foundation edits. Do not inherit older passes as new.

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
