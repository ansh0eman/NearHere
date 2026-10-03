# Deferred features: implementation roadmap and activation gates

24 September 2026. Companion to `premium-product-execution.md`.
This covers every previously named deferral; it does not silently make all of
them prerequisites for a useful first release. P00-P10 build the core premium
app. E01-E08 follow when their prerequisites and product gates are satisfied.
All proposed table/RPC/worker names must be checked before implementation.

## Priority and authorization

| Ticket | Priority / dependency | Safe initial work | User/provider gate |
| --- | --- | --- | --- |
| E01 reliable notifications | After P04 + privacy checks | Local tests, inbox/outbox schema and disabled worker | Push credentials, permissions, physical delivery and production enabling |
| E02 metrics and attendance | After stable participation | Event contract and local/first-party tests | Collection/retention disclosure and attendance policy |
| E03 explainable recommendations | After E02 and sufficient real supply | Deterministic ranking prototype | Experiment/collection changes; no AI service assumed |
| E04 recurring activities | After P09 participation | Domain model and DST/occurrence tests | Host edit/cancel policy before activating bulk operations |
| E05 direct messages | After moderation/report/block tests | Disabled prototype with adversarial tests | Who can contact whom, retention and moderation ownership |
| E06 payments/cosmetics | After product and store decisions | Provider-neutral state machine, test fixtures | Merchant/payout/refund/storefront/tax decisions and credentials |
| E07 infrastructure scaling | Only measured bottleneck | Query/profile/load tests | Paid capacity/services, significant architecture change |
| E08 community pilot/release | After P10 release checklist | Runbook, honest metrics dashboard, materials | Real invitations, publication, support staffing, store submission |

Do not build eight services at once. Choose first eligible ticket, finish its
tests, document, then next. Blocked paid activation does not prevent local tests.

## E01: reliable notifications, distinct from realtime refresh

Existing realtime activity chat/polling is not proof of APNs/FCM delivery.
Inspect `hooks`, repository, migration 090004 consumers, 090009 observability,
auth lifecycle and any current notification code before adding duplicates.
`expo-notifications` was absent from the inspected manifest.

1. List events: approval accepted/rejected, waitlist promotion, activity cancelled,
   participant removal, accepted-member chat. Define actor/recipient/dedupe key.
2. Add durable per-recipient notification inbox and transactional outbox. Only
   server writes authoritative event records in the same transaction as domain
   change; clients may mark their own rows read, never mint notifications.
3. Worker claims jobs with leases, retries bounded/backoff, unique event-recipient
   key, provider receipt processing and dead-letter inspection. Crash after send
   can duplicate transport; design client/inbox dedupe, do not promise exactly-once
   remote delivery. Delivery attempt is not device receipt or user reading.
4. Token registration binds to authenticated account + installation. Handle token
   rotation, logout, reinstall and multi-device accounts; redact tokens in logs.
   Sign-out must detach the old account, not leave the next person receiving it.
5. Recheck current membership/block/preferences at send time. Generic lock-screen
   content: no exact meeting point, phone or chat text. Prefer minimal event ID;
   deep link reauthorizes the current session before fetching current content.
6. A notification already delivered cannot reliably be retracted. Keep payloads
   privacy-safe even after block/leave. Delete/invalidate unsent work as policy
   requires; neutral unavailable state on old deep links.
7. Add permission explanation and opt-in/out preferences, not repeated prompts.
   Configure installed-SDK-compatible plugin and rebuild native. Follow the
   [Expo SDK54 notifications guide](https://docs.expo.dev/versions/v54.0.0/sdk/notifications/).
8. Tests: duplicated/out-of-order events, expired token, outage/retry exhaustion,
   concurrent workers, foreground/background/killed, logout/account switch,
   leave/block before send and after delivery, cancelled event deep link.

Accept: inbox works without push, recipient isolation holds, real device receipt
and opening demonstrated with credentials configured. A test stub is not delivery.
Lesson: durable domain events versus ephemeral transport; retries/idempotency.

## E02: activation, attendance and retention without invented analytics

1. Define metrics before SQL: activation = completed profile plus first meaningful
   action; first accepted join excludes pending/waitlist and host self-membership;
   host supply counts active published non-demo events; repeat usage has an
   explicit time window/timezone. Mark test/demo cohorts at source and exclude.
2. Reuse observability events where suitable but do not mix safety audit, crash
   logs and behavioral analytics indiscriminately. Define minimal event schema:
   ID/type/time/schema-version, pseudonymous actor if needed, allowed properties.
   No OTP/phone/exact coordinates/free-text bio/chat in metrics.
3. Record critical accepted joins/publications from server transactions, not a
   tappable “success” screen. Client view events are separately labelled and
   deduplicated on retries. Enforce authentication/allowlist/rate limits.
4. Define retention/deletion/access controls with user before enabling collection;
   first-party aggregate queries first, no external analytics SDK by assumption.
5. Attendance is not joining. Proposed phase: voluntary post-event self-report
   with clear “self-reported” label; host confirmation/dispute policy requires a
   product decision. Do not auto-attend from GPS, proximity, chat or end time.
6. If rewards later depend on attendance, separate confirmation authority and
   anti-abuse/idempotency from raw membership counts. No paid/competitive rewards
   in the initial character customization release.
7. Test retries, late events, timezone boundaries, deleted accounts, demo exclusion,
   changed membership states and small cohorts. Never claim retention uplift
   without actual cohort observations and appropriate uncertainty.

Accept: documented definitions and repeatable aggregate queries over allowed data;
dashboard says unavailable/insufficient data when appropriate. Resume claims use
measured engineering facts, not fabricated users/revenue.

## E03: recommendations before “AI recommendations”

1. Keep radius/availability/block/privacy constraints as hard filters. Rank only
   activities the caller is already allowed to discover; no bypass via cache.
2. Proposed initial score: user-selected interest overlap, time compatibility,
   coarse distance and capacity; deterministic weights in versioned config.
3. Supply plain reasons (“Matches coffee”, “Starts this evening”), not sensitive
   inferences or claims that the model knows someone's personality.
4. No cold-start empty page: fall back to distance/start ordering. Diversity cap
   prevents one host from filling every row; sponsored ranking remains absent.
5. Build offline fixtures: dense/sparse, no interests, blocked host, stale ended
   events, identical scores. Test deterministic tie-breaks and filter invariants.
6. Compare baseline engagement only after E02 exists; do not optimize exclusively
   for clicks at the expense of safe attendance or host diversity.
7. ML/embeddings/LLM recommendations require a later evidence-backed decision:
   data sufficiency, purpose/consent, fairness, cost and measurable benefit.

Accept: explainable, privacy-preserving ranking with deterministic regression
tests. Complex model serving remains gated, not “implemented” by a sort function.

## E04: recurring event administration

1. Separate a series definition from materialized activity occurrences. Existing
   activity UUID remains the unit for joining/chat/exact-location authorization.
2. Proposed series fields: host, IANA timezone, bounded recurrence rule, start local
   time, duration, horizon, template and version. Limit first release to weekly
   chosen weekdays; no unsupported arbitrary recurrence UI.
3. Generate bounded future occurrences with unique `(series_id, occurrence_key)`;
   retries must not duplicate. Resolve local time -> UTC using verified timezone
   library; explicitly test nonexistent/ambiguous DST times and policy.
4. Edit scopes: this occurrence vs future unstarted occurrences. Do not rewrite
   past attendance/chat or silently move already accepted participants. New time/
   location updates need notification/reconfirmation rules approved first.
5. Cancel scopes: one vs future. Preview affected count, confirm, audit immutable
   decisions. Worker reconciliation must not regenerate cancelled occurrences.
6. Membership is per occurrence; no automatic joining all future dates initially.
   Public offsets remain stable per occurrence; never expose a recurring private
   home location through profile itinerary or repeated location leaks.
7. Tests: retry/concurrency, DST, leap dates, cutoff, edited future, cancelled
   exceptions, blocked host/member, host deletion, worker pause/catch-up.

Accept: documented time semantics and reversible planning previews; test only
isolated series, never existing demo cancellations. Lesson: template versus entity.

## E05: direct messages (not activity chat)

Product gate: default proposal is opt-in message requests only between people
who shared an accepted activity, not searchable unsolicited contact. User must
decide age/safety and moderation/retention before enabling publicly.

1. Model conversation/membership/request state/messages. Reuse message limits,
   sanitation, rate-limit and observability patterns, not activity-chat RLS blindly.
2. Server validates eligibility and symmetric blocks on request, accept, send,
   fetch, realtime subscription and notification. Declined request cannot spam.
3. Durable paginated messages with stable cursor and client nonce; dedupe optimistic
   send/server echo/reconnect. Read current authorization on every reconnect.
4. Report conversation/message; retain only approved moderation evidence under
   scoped operator access/audit. Define block semantics for past history and
   future access; hiding UI alone never revokes backend reads.
5. No attachments, typing indicators, continuous presence or read receipts in first
   slice. Those add privacy/storage/moderation work. No exact-location sharing UI.
6. Tests: outsiders, sender/recipient block in either direction while open, revoked
   eligibility, parallel requests, replay, pagination, offline resend, account
   switch, notification leakage, report access by non-operator.

Accept: request-based contact, explicit opt-in, abuse operations, data retention
and full actor matrix. Do not expose an empty Inbox nav before feature is ready.

## E06: payments and paid cosmetics

First decide what is sold. A physical-world event ticket and a digital outfit are
different payment products. Storefront rules vary and change. Consult current
[Apple review rules](https://developer.apple.com/app-store/review/guidelines/)
before choosing an integration; do not assume one Stripe flow covers both.
Merchant identity, provider availability, host payouts, refunds, cancellations,
chargebacks, tax and moderation require user/business decisions. No legal or
provider eligibility guarantee is made here.

Implementation sequence after gate:

1. Provider-neutral order/line-item/payment-attempt/refund/entitlement records;
   integer minor currency units and explicit currency, immutable audit trail.
2. Server calculates price/product identity; client never awards entitlement from
   a success redirect or local boolean. Secrets stay server-side.
3. Event tickets: decide expiring capacity reservation, payment/seat reconciliation,
   waitlist and late-payment behavior. Existing free-join invariant cannot be
   patched by “charge then join” without race/refund design.
4. Digital cosmetics: validated store transactions, restore purchases, revoke on
   refund, cross-device entitlement; free fallback appearance remains valid.
   Server validates item ownership when saving appearance, not only hiding a tab.
5. Idempotent creation and signed webhook verification on raw request body;
   persist event IDs, handle duplicates/out-of-order events and retry workers.
   [Stripe webhook guidance](https://docs.stripe.com/webhooks) describes these
   delivery behaviors; its use here is architecture research, not provider selection.
6. Test mode only: success, decline, timeout, replay, invalid signature, duplicate
   event, refund, chargeback, expired hold, two users last seat, late webhook,
   cancellation during checkout and account deletion.
7. Reconciliation and support runbook before real transactions. Separate payment
   operational records from app-visible entitlement. Never log card data.

Accept: provider/store sandbox receipts + invariant tests + approved policies;
real-money activation requires explicit approval. No credits/token economy or
loot boxes are included merely because the map is playful.

## E07: scaling, Redis, custom WebSockets and presence

Do not add infrastructure for a resume keyword. Profile current PostGIS queries,
indices, pagination, payload size, database locks, realtime reconnect traffic and
slow requests under an approved bounded load first. Use isolated test datasets,
not high-volume traffic to shared free development services without a limit.

1. Query/index plan: inspect spatial index use, radius limits, N+1 reads, membership
   counts and block predicates; benchmark explain plans safely on test data.
2. Caching: cache public immutable catalog/style assets first. Never globally cache
   caller-specific exact points or blocked discovery by radius alone. Include
   authorization context/revision or avoid caching protected responses.
3. Redis only after measured need for shared short-lived counters/queue/cache.
   Define TTL, eviction/failure behavior, privacy keys, invalidation and costs.
   Database constraints remain source of truth for capacity, entitlement and audit.
4. Custom WebSockets only if current Supabase realtime/fallback cannot meet measured
   requirements: auth handshake/refresh, channel ACL, revocation, reconnect cursor,
   backpressure, dedupe, ordered domain sequence and horizontal fanout design.
5. Continuous presence remains disabled unless explicitly approved. If ever added,
   opt-in coarse online state with TTL and block-aware visibility; no moving live
   person marker, precise location history or inferred attendance.
6. Tests: cache outage, Redis eviction, websocket reconnect storms, token expiry,
   partition/recovery, account switch and stale authorization. Fault injection is
   local/staging, never disruptive production testing without approval.

Accept: measured bottleneck solved with comparative evidence and operational
cost/rollback plan. Postgres + Supabase remaining sufficient is a valid outcome.

## E08: launch/community and resume ownership

1. One small neighborhood, known willing hosts, limited invitation cohort; user
   chooses launch area and sends/approves invitations. No automated spam or fake
   users. Demo events must not be presented as real launch supply.
2. Publish clear activity expectations, report/block/support flow, moderation
   response ownership and emergency disclaimer. Phone verification is not host
   identity/background verification; do not display “verified host” without a
   defined real verification process.
3. Small usability rounds: can participant discover, understand approximate area,
   sign in, join, obtain authorized meeting point, leave and report? Record
   anonymized issues/consent, not intrusive session recordings by default.
4. Release stages: local -> development backend -> Simulator -> signed physical
   build -> invited TestFlight -> wider beta -> store review. Each is independent
   evidence. Store submission/production rollout needs user approval.
5. Preserve architecture diagrams, migrations, real tests, incident/fix notes and
   performance evidence for the resume. User should implement/explain one small
   change per phase; interview story must state actual ownership and measured
   results rather than “AI built a scalable startup.”

## Definition of done for this roadmap

Core completion is P00-P10 with accepted gates. Full optional roadmap completion
requires every E-ticket's product/provider gate and acceptance, not simply code
stubs. Track blocked optional work separately; neither hide it nor let a missing
paid 3D asset stop fixing a broken host form.
