# NearHere: completion audit and execution order

Audited 1 October 2026. This document is the current status snapshot and next-task
order. The [App Store T-pass](app-store-t-pass-20260930.md) remains the detailed
release specification; the premium guides retain the optional product roadmap.
This pass inspected source and reran local checks. It did not mutate the hosted
database, run hosted actor harnesses, install a device build, or publish anything.

## What is done, and what “done” means here

| Area | Implemented today | Evidence and unfinished work |
| --- | --- | --- |
| Native foundation | Expo 54, React Native 0.81.5, TypeScript, Supabase/PostGIS, iPhone+iPad configuration | Native Simulator builds recorded 30 Sep; no accepted signed release |
| Discovery | Custom dark MapLibre style, approximate activity markers, characters, clustering, filters, Browse, selection | Prior Simulator evidence; marker clipping, isolated label, scale/performance and outages still need acceptance |
| Location | Foreground permission, typed failure states, manual area and public place search | iPhone partial flows and iPad area persistence recorded; physical GPS, Settings return, services-off/no-fix remain |
| Authentication | Phone OTP flow, session, onboarding, keyboard controls | Fictional OTP works in development; real production SMS unverified |
| Hosting | Type/title/description, quick/custom time, explicit private pin, capacity/join mode, publish, cancel | Native wheel value change and full release-device publish/retry matrix open; client duplicate guard is not server idempotency |
| Participation | Open join, approval, rejection, waitlist, promotion, leave/removal, Plans | Historical hosted evidence; full current device state matrix open; host self-join is rejected by server migration 202609300001 |
| Location privacy | Server-authorized exact point, approximate public projection, block-aware consumers | Historical hosted negative-role coverage; repeat against release schema and already-open screens |
| Chat | Authorized send/history RPCs, subscription attempt and polling fallback | Reconnection defect identified below; delivery is not fully accepted and push is absent |
| Profile/avatar | Persistent finite 2D catalog; owner details, revision conflicts and account-scoped saves | Historical hosted/Simulator checks; public biography/moderation, full onboarding/accessibility acceptance remain |
| Safety/operator | Activity reports, blocks, operator review, audit events, sensitive-write limits, operational events | Foundation exists; complete UGC handling, deletion, support and incident operations remain |
| Development data | Existing fictional multi-host activities and guarded seeder | Preserve records; expired fixtures are not real launch supply |
| Release packaging | Bundle identifier, dark appearance and tablet support | No eas.json or .github CI directory found; branding, production environment, signed artifact and store package unfinished |

Current local verification: **96 tests passed, zero failed**, TypeScript, Expo
lint and `git diff --check` passed. Non-failing Node module-type warning remains.
Distill was unavailable on PATH; bounded raw test output was used. Branch is
`leda/initial-product-foundation`, HEAD `f6b585d`; extensive inherited uncommitted
work remains. These checks cover the working tree, not only that commit.

Historical evidence: 30 Sep linked development migration inventory recorded
30/30 matching IDs. This audit did not recheck deployment or production state.
Physical iPhone build last failed before installation because the development
provisioning profile was unavailable. Simulator success is not device acceptance.

1 October follow-up: `202610010001_create_activity_idempotency.sql` applied to
the linked development project. The current device inventory now shows the paired
iPhone 13 Pro as **unavailable**, so no new physical build was attempted. This
is a device-connection state, not evidence that the prior signing issue changed.

## Findings that affect the next work

1. **Chat polling could fail after a second disconnection; this is fixed locally.** In
   `apps/mobile/app/activity/[id].tsx`, SUBSCRIBED clears `pollingTimer` but leaves
   its variable truthy. Sequence: error starts polling → subscription recovers
   and clears it → another error sees a truthy handle and does not restart it.
   The detail screen now clears and unsets its timer handle on recovery, while
   `chat-connection.ts` unit-tests error → subscribed → error. This is code and
   unit-test evidence, not live multi-actor Realtime delivery proof.
2. **Subscription acceptance is not proven message delivery.** The app subscribes
   to `private.activity_messages`, while its initial migration revokes direct
   table access and exposes authorized RPCs. Inspect all later grants, publication
   membership and deployed policy before deciding whether this transport works.
   Do not weaken private-table access to make a green connection indicator.
3. **Plans, requests, operator reports and chat request only 50 records.** The
   repository has no cursor argument in these calls. Define intentional recent
   limits versus pagination; do not display first-page length as a lifetime total.
4. **Creation retries are now idempotent in the linked development schema.**
   `202610010001` adds host-scoped request keys plus a draft hash and
   `create_activity_idempotent`; the app reuses a key only while the draft is
   unchanged. The migration was deployed 1 Oct. Hosted two-actor/retry evidence
   is still required before calling this release-accepted.
5. **Account deletion is missing.** Me offers sign-out; no deletion implementation
   was found. Existing foreign keys/retention make this a server workflow, not a
   client-only button or blind cascade.
6. **Production services remain unresolved.** Place search directly uses public
   Nominatim with a per-process delay/cache; this does not cap aggregate devices.
   Prior iPad logs record tile connection loss. Real SMS/provider reliability is
   not established. Domain purchase can wait, but release contact/policy cannot.
7. **Visual acceptance remains partial.** Existing concept images are targets,
   not screenshots of a finished app. 2D characters exist; wardrobe/3D do not.

## Execution plan: small, testable steps

Each step records changed files, behavior, tests, environment/build ID, remaining
failures and one teaching lesson. Proposed files/RPC names must be checked before
creation. Do not run fixture cleanup or overwrite inherited edits.

### 1. Repair chat recovery first (T4)

1. Read the detail screen effect, message repository, latest chat/block SQL and
   hosted chat harness. Draw the connection and authorization transitions.
2. Extract a small connection lifecycle helper if needed. Clear **and unset** a
   polling handle; ensure exactly one timer, cleanup on unmount, and restart on
   repeated failures. Guard late results against account/activity changes.
3. Test error→subscribed→error, repeated error, timeout, unmount, activity switch,
   account switch and loss of membership. No old private chat may reappear.
4. Inspect hosted publication/access configuration read-only. Keep authorized
   RPC polling as a reliable baseline unless private Realtime delivery is proven.
5. Use two fictional actors to prove actual message arrival, reconnect and block/
   leave revocation in Simulator. Record latency; do not label it push.

Exit: repeatable recovery and authorization tests plus two-actor runtime proof.

### 2. Close durable activity behavior (T4)

1. Review create RPC and transaction boundaries. Design caller-scoped request
   UUID + payload fingerprint with a uniqueness constraint in an additive migration.
2. Reuse the same request ID for retries of one draft. Reject reuse with a changed
   payload; derive owner from Auth. Return the original result after lost response.
3. Test concurrent identical requests, ambiguous response, changed payload,
   different users and cancelled original event. Preserve capacity/privacy rules.
4. Specify cursor-based Plans/history retrieval where needed, with stable
   timestamp+ID ordering and no duplicate/missing rows across pages. Bound requests.
5. Run host/outsider/pending/accepted/waitlisted/rejected/removed/blocked matrices,
   concurrent last seat, promotion, cancellation and ended-event redaction.

Exit: no duplicate publish on retries; documented list limits; private point/chat
authorization remains correct after every transition. Update API/data-model docs.

### 3. Complete account lifecycle and content safety (T2)

1. Inventory live foreign keys and write a proposed retention/anonymization table:
   hosted activities, attendee records, messages, reports, audit and Auth identity.
   Prepare a concrete policy decision for the owner before destructive fulfillment.
2. Add in-app deletion initiation/status, recent verification and server-owned
   request processing. Never place an admin key or Auth-admin deletion in mobile.
3. Implement retry-safe deletion/anonymization under the agreed policy; clear
   sessions/local private drafts and verify stale-token behavior. Use disposable
   actors for irreversible tests with exact targets established first.
4. Add server-side content controls at public activity/chat write boundaries and
   reporting/takedown coverage. Length validation alone is not content moderation.
5. Keep public profile bio disabled until opt-in, reporting and moderation exist.
   Do not fabricate an age or guardian policy; resolve audience before release.
6. Prepare real support/privacy/community-rule pages, then obtain owner approval
   of contact, retention and operating commitments before publication.

Exit: deletion can be initiated and fulfilled; harmful-content handling is tested;
the policy accurately describes the implementation. Recheck current platform rules
when implementing/submitting rather than relying on old legal notes.

### 4. Stabilize location and production dependencies (T3/T4)

1. Test permission allowed/denied, services off, no fix, stale fix, Settings return,
   manual selection, account switch and app restart. Capture physical-device logs
   without exact coordinates/tokens. Distinguish permission from successful GPS fix.
2. Compare tile/geocoder production options, document costs/quotas/attribution,
   implement a replaceable adapter and bounded timeout/error fallback. If using a
   proxy, enforce global limits and avoid logging private search text.
3. Keep Browse and manual pin usable during map/search outages; test malformed
   responses and retries. Confirm iPad public-place search separately.
4. Prepare separate dev/production configuration and reproducible migrations.
   Provision real SMS with owner-controlled credentials/budget, test delivery,
   resend, throttling and recovery. Development fixed OTP must stay out of production.

Exit: observed failure recovery and actual SMS delivery; production environment
and vendor choices documented. Provider purchases/configuration remain explicit.

### 5. Finish V1 visual and accessibility acceptance (T5/P06)

1. Build a screen-by-screen comparison against the chosen Night Arcade reference:
   map, Browse, selected event, Host, auth, Plans, detail/chat, Me and profile edit.
2. Fix selected-character edge treatment; prove isolated label rendering and
   dense-label suppression. Keep real avatar identity and existing fixtures.
3. Replace starter app icon/splash with original licensed branding; inspect actual
   native launch. Keep a coherent finite 2D avatar system for V1.
4. Test narrow/large iPhone and iPad, keyboard dismissal, maximum text size,
   VoiceOver, contrast, reduced motion and reachable actions. Change a real date/
   time picker value and publish; opening the picker is insufficient evidence.
5. Measure 12/50/200 local synthetic public points: interaction time, memory and
   frame behavior. Record device/build/measurement method rather than guessing.

Exit: captioned actual screenshots and completed accessibility/performance matrix.

### 6. Make verification and operations repeatable (T6)

1. Add CI for unit tests, typecheck and lint on the pinned dependency tree. Keep
   production secrets and mutating hosted harnesses out of untrusted PR jobs.
2. Review dependency findings and security-definer functions/grants with bounded
   exact evidence. Test anon/owner/outsider/blocked access and rate-limit exhaustion.
3. Add redacted crash/error reporting and service alerts; document who responds.
   Database operational events alone do not establish crash monitoring.
4. Rehearse backup restoration on an isolated approved target; document moderation,
   outage and release rollback procedures and truthful App Privacy inventory.

Exit: reproducible checks and demonstrated operational recovery, with no known
unresolved critical privacy/security defect.

### 7. Produce and test a signed release (T7/T8)

1. Resolve the recorded Apple development provisioning gate under the owner's
   account. A prior request for approval is pending; do not treat silence as consent.
2. Add reviewed build profiles, environment binding and version/build-number rules.
   Produce a native release artifact with an embedded bundle, independent of Metro.
3. Install/test on the physical iPhone: fresh launch, GPS/manual search, real OTP,
   host, join, chat, block, account switch and deletion; repeat offline/resume.
4. Use separate Simulators/fictional accounts for multi-user workflows. One iPhone
   still supplies real keyboard/GPS/performance evidence; it is not two-device proof.
5. Upload approved artifact to TestFlight; test that exact build and fix/rerun every
   high-severity issue. Retain iPad coverage because it is in the selected scope.

Exit: build-ID-linked physical-device acceptance and owner-approved beta candidate.

**2 October update:** the prior destination/provisioning blocker is resolved for
the owner-approved debug path: the iPhone is visible in Xcode Device Hub, a
signed Debug build completed, and NearHere 1.0.0 was installed. iOS still blocks
its first launch until the owner explicitly trusts the development certificate
on the phone. Treat physical-device execution, TestFlight, and release signing
as open until that confirmation and the matrix above are completed.

### 8. Submit and start the real community (T9/E08)

1. Finalize audience, monitored support, public policy, moderation owner, provider
   budget and reviewer access. Prepare actual-build screenshots and truthful copy.
2. Recheck current Apple requirements, privacy/age-rating answers and submission
   metadata. Obtain approval for the exact public build/package and submit.
3. Recruit willing pilot hosts in one area; distinguish labelled demo/review data
   from real activities. Measure actual onboarding, first join and repeat usage.
4. Record approval/live status only when verified in App Store Connect; document
   release incidents and lessons for the engineering/resume narrative.

## Deliberately deferred, not lost

| Roadmap | Follow-up work | V1 dependency? |
| --- | --- | --- |
| P07 wardrobe | Two authored looks → versioned catalog → persistence/fallback → device QA | No |
| P08 real 3D | Licensed compatible meshes → native render/performance proof → fallback → modular customization | No |
| E01 notifications | Token lifecycle, transactional event/outbox, delivery/retry/redaction, APNs device evidence | No, unless promised in release UI |
| E02 measurement | Event definitions/consent, aggregate funnels, attendance evidence and retention | Basic pilot measurement useful; advanced analytics later |
| E03 recommendations | Explainable relevance baseline and evaluation before personalization | No |
| E04 recurring events | Series/instance model, timezone, edit/cancel rules | No |
| E05 direct messages | Separate consent, block/report and retention model | No |
| E06 payments | Product/provider decision, webhook/idempotency/refund and store-policy review | No |
| E07 scaling | Measure actual bottlenecks before Redis, custom sockets or presence | No |

## How to continue and teach each slice

Start with **step 1: chat reconnect lifecycle**. Read the T-pass and applicable
AGENTS before code. Fix and test one bounded behavior, then proceed through the
eligible steps. External decisions can block their dependent step while local
work continues. Do not call all features complete because unit tests pass.

For each slice explain: user symptom → small flow diagram → exact source paths →
state/API/database ownership → failure and fix → tests and limitations → one
interview explanation and reproducible exercise. Update `testing-status.md`, the
T-pass ledger and this plan's actual status. Keep older dated results historical.
No meaningful completion percentage is assigned: code coverage, device acceptance
and external release gates have different denominators.
