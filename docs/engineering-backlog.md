# NearHere Engineering Backlog

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
- [x] Add client request correlation IDs for sensitive operations and bounded operator observability
- [ ] Add shared structured error envelopes, server request IDs, metrics, traces, and crash reporting
- [ ] Add physical-device, TestFlight, and Android internal-test workflows

## Deferred until evidence

- [ ] Custom avatar builder
- [ ] MapLibre custom visual map
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
