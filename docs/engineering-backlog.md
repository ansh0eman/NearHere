# NearHere Engineering Backlog

Checkboxes record implementation, not aspiration. Items are ordered by dependency and user value.

## Current slice — Lesson 4: identity foundation

- [x] Design browse-first phone OTP and protected-intent state model
- [x] Build provider-gated phone and verification screens
- [x] Configure a Supabase client using publishable environment variables only
- [x] Define shared public-profile and onboarding contracts
- [x] Add first versioned profile migration, trigger, grants, and Row Level Security policies
- [x] Create a user-owned Supabase development project
- [x] Configure ignored Expo public environment values and verify the Supabase Auth health endpoint
- [ ] Enable/configure phone authentication and SMS provider/test numbers
- [ ] Apply and test migrations against the development database
- [ ] Verify real/test OTP delivery, verification, and session restoration
- [ ] Build minimal display-name onboarding and profile read/update adapter
- [ ] Test profile policies as anonymous user, owner, other user, and service role

## Next slice — real activity creation and discovery

- [ ] Define shared activity request/response contracts and runtime schemas
- [ ] Add PostGIS activity/status tables with private and public location separation
- [ ] Define server-owned privacy transform for public geometry
- [ ] Implement activity creation transaction and authorization
- [ ] Implement `GET /v1/activities/nearby`
- [ ] Replace map fixtures with explicit loading/empty/success/error server state
- [ ] Build full activity detail boundary
- [ ] Add contract, integration, privacy, and query-plan tests

## Participation correctness

- [ ] Add membership and idempotency schema
- [ ] Implement open join, approval request, approve/reject, leave, removal, and waitlist transitions
- [ ] Enforce capacity inside database transactions
- [ ] Prove last-place behavior with concurrent integration tests
- [ ] Release participant-only meeting details through server authorization

## Coordination, safety, and beta quality

- [ ] Add durable activity chat history and send operation
- [ ] Add managed realtime subscriptions and reconnect/refetch behavior
- [ ] Add report, block, cancellation, moderation, and audit primitives
- [ ] Add rate limits and abuse controls based on threat model
- [ ] Add accessibility and reduced-motion audit
- [ ] Add structured errors, request IDs, logs, metrics, traces, and crash reporting
- [ ] Add physical-device, TestFlight, and Android internal-test workflows

## Deferred until evidence

- [ ] Custom avatar builder
- [ ] MapLibre custom visual map
- [ ] Map/list toggle
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
