# NearHere Engineering Backlog

## Active backlog — premium redesign

The [Night Arcade ticket ledger](handoffs/night-arcade-status.md) is the current
priority order. Its [implementation playbook](handoffs/night-arcade-execution.md)
contains file ownership, contracts, failure modes and verification. Do not execute
the earlier violet/mascot follow-through as if the user accepted that appearance.

## 3 October 2026 — current theme/identity ticket states

| Ticket | Source / local evidence | Still open |
| --- | --- | --- |
| D01 themes | All listed app consumers use theme-aware style factories; unit tests, typecheck, lint and iOS export pass | Open the app in Simulator GUI and verify System/Daylight/Night across flows, relaunch and large text; physical device |
| D02 map styles | Pure day/night variants pass MapLibre style-spec and stable-layer/source tests | Repeated native style switches with selected markers, attribution and location picker; visual contrast/performance |
| D03 Reduce Motion | Shared map camera boundary chooses MapLibre `jumpTo` or timed `easeTo`; policy tests pass; Release build installed/launched | Change OS Reduce Motion, visually verify map recenter/selection/cluster behavior, then profile 12/50/200 synthetic points |
| U01 usernames | Nullable schema, unique index, authenticated row-locking RPC, parser/validator and client adapter coded; static SQL guards pass | Execute migration and concurrency/authorization tests in a disposable database; verify schema cache; no hosted actors claimed |
| A01 modular avatar art | Original transparent cel-shaded style anchor is saved under design concepts and legible at 64 px | Establish coordinate anchors, compatible parts, alignment and alpha/edge QA; anchor not in app/catalog |
| I01-I03 sign-in | Planning/research only for email/Google/Apple and account linking | Provider setup, secure linking/recovery UX, hosted configuration and real-device tests |

Latest local code gate: 107 unit tests, TypeScript, Expo lint, `git diff --check`
and a 5,121,260-byte iOS Hermes export pass. The Xcode Release build/Sim launch
applies to the D03 source before username UI exists. No new hosted migration or
activity record was changed in this continuation.

## Map-first design follow-through — 23 September 2026

- [x] Implement a map-first opening screen with progressive disclosure of filters/list.
- [x] Add charcoal/lime Night Arcade palette and original full-body host characters.
- [x] Verify empty map → Browse → filter → Plans navigation in Simulator.
- [x] Verify populated character markers, selection and cluster expansion in iPhone 17 Pro Simulator; physical iPhone still open.
- [x] Add six-preset character choice and public-safe host-avatar RPC projection; authenticated save and cross-surface proof remain open.
- [x] Integrate MapLibre and attribute OpenFreeMap/OpenMapTiles/OpenStreetMap.
- [x] Author and MapLibre-validate `nearhere-night-arcade-v1.json`; V15-V17 provide Simulator rendering and attribution-control evidence. V25 additionally verifies authored-style avatar taps and cluster expansion; production tile-provider/SLA decision remains open.
- [x] Add zoom-based clustering and apply Night Arcade tokens across Plans, Host, Activity Detail and location-picking overlays; Browse/profile/Plans/Host/location flows now have partial Simulator review (V18-V21), while remaining layouts and authored-style map hit testing stay open.
- [x] Increase map avatar legibility with a small idle/selected icon-size hierarchy (0.11 / 0.15), then directly tap a character, expand a cluster and clear selection by tapping empty map space (V23/V25); test dense-area overlap and scale before beta.

Checkboxes record implementation, not aspiration. Items are ordered by dependency and user value.

## Identity foundation — Lessons 4 and 5

- [x] Design browse-first phone OTP and protected-intent state model
- [x] Build provider-gated phone and verification screens
- [x] Configure a Supabase client using publishable environment variables only
- [x] Define shared public-profile and onboarding contracts
- [x] Add first versioned profile migration, trigger, grants, and Row Level Security policies
- [x] Create a user-owned Supabase development project
- [x] Configure ignored Expo public environment values and verify the Supabase Auth health endpoint
- [x] Initialize/link the Supabase CLI and deploy the first profile migration
- [x] Verify remote migration history and anonymous profile-table denial
- [x] Select fixed development OTP and document hosted-vs-local configuration blast radius
- [x] Enable hosted phone authentication and configure an expiring fictional test number
- [x] Verify hosted test OTP request, verification, session issuance, and triggered profile creation
- [x] Verify mobile session restoration after app restart
- [x] Build minimal display-name onboarding and profile read/update adapter
- [x] Add runtime profile-boundary unit tests and a dependency-free hosted RLS harness
- [x] Test profile trigger and policies as owner and other user through the two-actor hosted RLS harness
- [ ] Test protected service operation in a narrowly privileged integration environment

## Current slice — Lesson 6: real activity creation and discovery

- [x] Define shared activity request/response contracts and runtime schemas
- [x] Add and deploy PostGIS activity/status/membership tables with private and public location separation
- [x] Define server-owned privacy transform for public geometry
- [x] Implement authenticated activity creation transaction and authorization
- [x] Implement and verify anonymous-safe `nearby_activities` discovery RPC
- [x] Replace map fixtures with explicit loading/empty/success/error server state
- [x] Build the first native Host form and profile gate
- [x] Let hosts choose quick or custom future start time and search or pin an exact private meeting point
- [x] Complete one authenticated Host write and rediscover only the public-safe projection in Simulator
- [x] Measure exact/public displacement through a protected operational test without exposing the exact point publicly
- [x] Implement the caller-scoped activity-detail RPC, runtime parser, native route, map/Plans navigation, and protected Join return path
- [x] Implement host-only, row-locked, retry-safe cancellation with immediate client-side private-location redaction
- [x] Deploy and hosted-verify the activity-detail/cancellation migration
- [ ] Accept anonymous, participant, host, Leave, directions, and cancellation states in Simulator
- [ ] Add contract, integration, privacy, and query-plan tests

## Participation correctness

- [x] Add the initial membership schema and atomic host membership creation
- [x] Implement open Join, approval-mode pending request, and full-capacity waitlist outcomes
- [x] Make Join retry-safe for the natural `(activity_id, user_id)` membership identity
- [x] Enforce Join capacity decisions with a per-activity row lock inside one transaction
- [x] Wire authentication/profile gates, protected-intent resumption, runtime parsing, and status-specific mobile feedback
- [x] Verify anonymous Join denial and existing-host idempotent acceptance in Simulator
- [ ] Add general idempotency-key records for commands whose identity is not sufficient
- [x] Implement approve/reject and Leave transitions with FIFO waitlist promotion in migration/mobile source
- [x] Deploy migration `007` and verify local/remote parity plus scoped schema lint
- [x] Accept participant Leave and immediate exact-location removal in Simulator
- [x] Accept host pending-request approval and participant-count refresh in Simulator
- [ ] Accept host rejection in Simulator
- [x] Implement participant removal separately from voluntary Leave
- [x] Build an optional C/D hosted harness for concurrent last-place and FIFO-promotion proof
- [x] Run the hosted A/B/C/D matrix and record second-user/concurrency evidence
- [x] Add an authenticated caller-scoped Plans read model and native Plans states
- [x] Release exact coordinates only for accepted membership while the activity is published and not ended
- [x] Verify the accepted host Plans card and exact coordinate in Simulator
- [x] Prevent cross-account cached-plan rendering and suppress inactive-plan exact coordinates
- [x] Make Auth cancellation explicit by disabling modal dismissal gestures and clearing protected intent on close
- [x] Exercise signed-out Plans intent through OTP/profile onboarding and automatic Plans resume in Simulator
- [ ] Exercise pending/waitlisted locked-location cards in Simulator
- [ ] Exercise cancelled/ended card labels and exact-location suppression in Simulator
- [x] Organize Plans into upcoming and inactive-history sections
- [x] Add shared walking-direction actions from accepted Plans and Activity Detail
- [ ] Add cursor pagination and plan details

## Coordination, safety, and beta quality

- [x] Add structured, correlation-ID-backed failures to report submission

- [x] Add durable, accepted-member-only activity chat history and send operation; hosted harness covers anonymous denial, host/participant exchange, and block filtering
- [x] Add initial accepted-member chat UI with validated messages and explicit refetch
- [x] Align sent-message receipt with the validated chat-history projection
- [x] Add managed realtime subscription as a refresh signal with polling fallback
- [x] Add private report/block foundations and a signed-in report-activity action
- [x] Add operator-only report lifecycle and review RPCs; hosted denial proves non-operators cannot access the queue
- [x] Provision-safe minimal operator console route; ordinary users receive database-backed access denial
- [x] Apply the block predicate to chat, authenticated discovery, host participant projection, Join, and exact-location release; hosted harness covers the blocked relationship
- [x] Define block policy for Join and exact-location privacy without silently deleting existing memberships; hosted harness covers the blocked relationship
- [x] Add immutable safety audit events and operator-only operational logs
- [x] Add database-enforced rate limits for sensitive writes and bounded rate-limit observability
- [x] Add immutable operator review recovery paths; tune rate limits with beta evidence later
- [x] Add reduced-motion preference hook and accessibility-aware safety/chat controls
- [ ] Complete full VoiceOver/TalkBack, dynamic-type, contrast, and physical-device accessibility audit
- [ ] Complete location matrix: Simulator denial showed Settings/Choose area; public-place search and manual-area persistence worked; retry retained manual area and removed the stale GPS dot (V27). The physical-iPhone “location unavailable” report, Services-off, no/cached/low-accuracy fix and real GPS still need evidence.
- [x] Add client request correlation IDs for sensitive operations and bounded operator observability
- [ ] Add shared structured error envelopes, server request IDs, metrics, traces, and crash reporting
- [ ] Add physical-device, TestFlight, and Android internal-test workflows
- [ ] Phone/OTP main actions and Done are visible/tappable above the numeric keyboard on iPhone 17 Pro Simulator (V26); still accept Android/physical keyboard, full OTP journey, custom schedule selection and private-pin selection.

## Deferred until evidence

- [ ] Custom avatar builder
- [x] NearHere-authored first-pass MapLibre style over hosted vector tiles; render, attribution, marker selection, cluster expansion and overlay-safe camera movement are Simulator-verified. Dense data, accessibility and production provider decision remain open
- [ ] Make rendered avatar/cluster features discoverable and operable with VoiceOver/TalkBack, or provide a documented accessible equivalent; current Simulator accessibility tree exposes nearby screen controls but not MapLibre rendered feature hit areas
- [x] Add map/list toggle using the same privacy-safe nearby result projection
- [ ] Redis caching/presence/rate-limit infrastructure
- [ ] Custom WebSocket gateway
- [ ] Recurring activity administration
- [ ] Direct messages
- [ ] Payments
- [ ] Complex recommendations

## Definition of done for a vertical slice

- User-visible success and failure behavior works end to end.
- Types and runtime validation protect every external boundary.
- Server/database rules, not client assumptions, protect invariants.
- Relevant lint, type, unit, integration, and interaction checks pass.
- Privacy, security, accessibility, and observability are considered.
- Documents, diagrams, challenge log, interview explanation, and honest resume wording are updated.
