# NearHere End-to-End System Design

Status: **living design**. Implemented pieces are called out explicitly; the rest is an evolution plan, not a production claim.

## 1. Start with requirements, not technology

System design is the process of translating product behavior and quality expectations into components, data, interfaces, and operational choices. The correct order is:

```mermaid
flowchart LR
    U["User problem"] --> F["Functional requirements"]
    U --> N["Non-functional requirements"]
    F --> D["Data and invariants"]
    N --> D
    D --> B["Boundaries and APIs"]
    B --> T["Technology choices"]
    T --> V["Verification and measurement"]
    V --> E["Evidence-driven evolution"]
```

### Functional requirements

- Browse nearby activities without an account.
- Ask for foreground location; fall back to searchable manual selection when unavailable or denied.
- Authenticate with phone OTP before Join or Host.
- Create, view, join, request approval, leave, and cancel activities.
- Enforce capacity and waitlist/approval transitions correctly.
- Reveal only approximate public location; later reveal an operational meeting point only to authorized participants.
- Coordinate in activity-scoped chat after joining.
- Report, block, leave, and moderate unsafe behavior.

### Non-functional requirements

- **Privacy:** never publish precise live user location or return private coordinates to unauthorized clients.
- **Correctness:** concurrent joins must not exceed capacity; retries must not duplicate actions.
- **Reliability:** failures must produce retryable, understandable states rather than fabricated success.
- **Performance:** a nearby result should feel interactive on a normal mobile network; establish a measured target after the first real endpoint.
- **Security:** all client input is untrusted; authorization is server/database enforced.
- **Maintainability:** a small team can modify one domain without understanding the entire codebase.
- **Cost awareness:** introduce paid infrastructure only for a demonstrated requirement.
- **Accessibility:** controls, status, motion, color, and text remain understandable across supported devices.

## 2. Context and actors

```mermaid
flowchart TB
    A["Anonymous explorer"] --> M["NearHere mobile app"]
    U["Authenticated participant or host"] --> M
    MOD["Moderator or operator"] --> ADMIN["Future admin tools"]
    M --> AUTH["Supabase Auth"]
    AUTH --> SMS["SMS provider"]
    M --> API["NearHere modular API"]
    API --> DB["Supabase PostgreSQL + PostGIS"]
    API --> RT["Future realtime delivery"]
    API --> JOBS["Future background jobs"]
    ADMIN --> API
```

An actor is a person or external system interacting with NearHere. The diagram does not imply that every box exists today. The mobile app, location flow, typed auth client boundary, and local fixtures are implemented. A hosted Supabase project, database schema deployment, activity API, realtime service, jobs, and admin tools remain planned.

## 3. Initial architecture: a modular monolith

```mermaid
flowchart LR
    subgraph Phone["Untrusted mobile device"]
      UI["Expo / React Native UI"]
      STATE["Client state and secure-ish local persistence"]
    end

    subgraph Hosted["Hosted environment"]
      AUTH["Supabase Auth"]
      API["One NearHere API deployment"]
      subgraph Modules["Internal modules"]
        PROFILE["Profiles"]
        ACT["Activities"]
        MEMBER["Memberships"]
        GEO["Discovery / privacy"]
        CHAT["Chat"]
        SAFETY["Safety"]
      end
      DB[("PostgreSQL + PostGIS")]
    end

    UI -->|"OTP and session calls"| AUTH
    AUTH --> DB
    UI -->|"HTTPS + bearer token when signed in"| API
    API --> Modules
    Modules --> DB
```

A monolith is one deployable server. A modular monolith preserves one deployment while enforcing internal module boundaries. This is suitable because:

- One small team needs fast changes and simple local debugging.
- Activities, memberships, geospatial discovery, and chat share transactional data.
- The current scale does not justify network boundaries between business modules.
- Extraction remains possible when measurements reveal an independently scaling or operationally isolated component.

Microservices would immediately add service discovery, network failures, distributed tracing, deployment coordination, contract versioning, and cross-service consistency. Those costs do not create user value at the current stage.

## 4. Identity and protected-intent flow

```mermaid
sequenceDiagram
    actor User
    participant App as NearHere app
    participant Auth as Supabase Auth
    participant SMS as SMS provider
    participant DB as PostgreSQL

    User->>App: Browse map
    Note over App: No account required
    User->>App: Tap Join or Host
    App->>App: Save protected intent
    App->>Auth: Request OTP for normalized phone
    Auth->>SMS: Deliver short-lived code
    SMS-->>User: SMS code
    User->>App: Enter code
    App->>Auth: Verify code
    Auth->>DB: Create/read auth user
    DB->>DB: Trigger creates public profile
    Auth-->>App: Session tokens
    App->>App: Resume protected intent
    Note over App,DB: Join/Host still requires server authorization
```

Authentication proves identity. Authorization decides whether that identity may perform an action. The app can display a signed-in state, but it cannot be trusted to approve its own join request.

## 5. Discovery and location privacy

Three coordinates serve different purposes:

1. **Discovery center:** the user's device or manually selected area used to ask “what is near here?” It stays local or is sent only as query input.
2. **Private activity point:** the host-entered operational coordinate. It must not appear in public API responses.
3. **Public activity point:** a server-derived approximate coordinate used for map discovery.

```mermaid
flowchart LR
    D["Device or manual discovery center"] -->|"lat, lng, radius"| Q["Nearby query"]
    H["Host private point"] --> P["Server privacy transform"]
    P --> PUB["Public approximate point"]
    PUB --> DB[("PostGIS indexed data")]
    Q --> DB
    DB --> R["Public activity summaries only"]
    R --> MAP["Map markers"]
    H -. "Never returned publicly" .-> LOCK["Participant-only access policy"]
```

Moving a marker on the client is not privacy. If private data was sent to the phone, a modified client can inspect it. Privacy must be enforced at query and response boundaries.

## 6. Activity lifecycle and state machines

Explicit state machines prevent impossible or contradictory states.

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Published: host publishes
    Published --> Active: start time reached
    Published --> Cancelled: host cancels
    Active --> Completed: end time reached
    Active --> Cancelled: safety or host action
    Completed --> [*]
    Cancelled --> [*]
```

```mermaid
stateDiagram-v2
    [*] --> Pending: approval-mode request
    [*] --> Accepted: open join with capacity
    [*] --> Waitlisted: no capacity
    Pending --> Accepted: host approves and capacity exists
    Pending --> Rejected: host rejects
    Pending --> Cancelled: requester withdraws
    Waitlisted --> Accepted: capacity opens
    Waitlisted --> Cancelled: requester withdraws
    Accepted --> Left: participant leaves
    Accepted --> Removed: host or moderator removes
```

State transitions belong on the server inside database transactions. The client requests a transition; it does not write arbitrary status values.

## 7. Correct concurrent joining

Suppose one place remains and two phones join simultaneously. A read-then-write implementation can let both requests observe one open place and both accept. This is a race condition.

```mermaid
sequenceDiagram
    participant A as Phone A
    participant API
    participant DB as PostgreSQL transaction
    participant B as Phone B

    A->>API: Join with idempotency key A1
    B->>API: Join with idempotency key B1
    API->>DB: Lock activity / serialize capacity decision
    DB->>DB: Check status, blocks, existing membership, capacity
    DB-->>API: A accepted
    API->>DB: Evaluate B after A commits
    DB-->>API: B waitlisted or activity full
    API-->>A: Accepted membership
    API-->>B: Waitlisted/full result
```

Required invariants:

- A user has at most one active membership per activity.
- Accepted participants never exceed the configured capacity.
- Reusing an idempotency key returns the same logical result.
- A cancelled, completed, or blocked activity cannot be joined.
- The host's membership and role cannot accidentally disappear through a normal leave operation.

## 8. API request lifecycle

```mermaid
flowchart TD
    REQ["HTTPS request"] --> RID["Attach request ID"]
    RID --> AUTHN["Validate session if endpoint is protected"]
    AUTHN --> VALID["Runtime-validate input"]
    VALID --> AUTHZ["Authorize resource/action"]
    AUTHZ --> TX["Execute transaction or query"]
    TX --> SHAPE["Shape privacy-safe response"]
    SHAPE --> LOG["Structured outcome log"]
    LOG --> RESP["HTTP response"]
    VALID --> ERR["Stable error envelope"]
    AUTHZ --> ERR
    TX --> ERR
```

Every network input is runtime data, even when the client and server share TypeScript types. A malicious or outdated client can send anything.

## 9. Data ownership and trust boundaries

| Fact | System of record | May client decide it? | Cacheable? |
| --- | --- | --- | --- |
| Current map camera | Mobile memory | Yes | Local only |
| Manual discovery location | Device storage | Yes | Local only |
| Authentication identity | Supabase Auth | No | Session tokens only |
| Public profile | PostgreSQL | Request changes only | Carefully |
| Activity status and capacity | PostgreSQL | No | Reads may be briefly stale |
| Membership | PostgreSQL | No | UI may optimistically display pending state |
| Chat history | PostgreSQL | No | Paginated client cache |
| Online presence | Future ephemeral store | Heartbeat only | Yes, short TTL |

## 10. Failure design

| Failure | Required behavior |
| --- | --- |
| Location permission denied | Offer searchable manual selection and draggable pin. |
| Place provider unavailable | Keep map-pin selection usable and explain search failure. |
| SMS delayed or rejected | Preserve phone input, show retry timing, never claim verification. |
| Session expired | Refresh once; if invalid, return to phone auth while preserving safe protected intent. |
| Nearby API timeout | Keep the last labeled result if appropriate, show retry, do not invent live activities. |
| Duplicate Join retry | Idempotency returns the existing result. |
| Concurrent last-place joins | Transaction accepts at most one; the other is waitlisted/full. |
| Realtime disconnected | Persisted API remains authoritative; reconnect and refetch from a cursor. |
| Redis unavailable in the future | Lose ephemeral presence/rate-limit optimization gracefully; never lose memberships. |

## 11. Observability

```mermaid
flowchart LR
    APP["Mobile crashes and UX events"] --> OBS["Observability platform"]
    API["API logs, metrics, traces"] --> OBS
    DB["Database health and slow queries"] --> OBS
    OBS --> DASH["Dashboards"]
    OBS --> ALERT["Actionable alerts"]
    ALERT --> HUMAN["Engineer response"]
```

Logs describe discrete events, metrics aggregate numeric behavior over time, and traces connect work across components. Never put OTPs, tokens, raw phone numbers, private coordinates, or message bodies into routine logs.

## 12. Evolution by measured scale

### One neighborhood

- One mobile application.
- Supabase Auth and one PostgreSQL/PostGIS database.
- One API deployment.
- No Redis or custom WebSocket infrastructure.
- Seeded activities and hands-on operator support.

### One city

- Horizontally scale the stateless API if measured traffic requires it.
- Add database connection pooling and query/index monitoring.
- Add activity chat delivery and push notifications.
- Add shared provider cache/rate limiting where cost or abuse data requires it.
- Add moderation tooling and operational dashboards.

### Many cities

- Route discovery by geographic cells and monitor hot areas.
- Consider read replicas or cell caches for read-heavy discovery.
- Partition large time-bound tables only after query evidence.
- Run asynchronous notification/moderation work through a durable queue.
- Extract realtime or media processing only if its scaling/reliability profile differs materially.

```mermaid
flowchart LR
    N["Neighborhood: simplest correct system"] --> C["City: scale stateless reads and operations"]
    C --> M["Many cities: geographic routing and selective extraction"]
    N -. "measure" .-> C
    C -. "measure" .-> M
```

Scaling is a response to evidence. Adding Redis, queues, replicas, or microservices before a measured bottleneck increases failure modes without proving value.

## 13. What exists today

**Implemented:** Expo/React Native native app, TypeScript/runtime boundaries, native live-discovery map states, foreground permission flow, persisted manual location, searchable development geocoder, native development build, hosted phone/OTP, retryable session restoration, protected-intent modeling, profile onboarding, and a first native Host form.

**Deployed to development:** versioned identity/profile plus PostGIS activity migrations; owner-only profile RLS; separate private meeting geometry; server-derived public geometry; atomic activity/host-membership creation; and anonymous-safe nearby discovery. Remote migration history matches local history. Anonymous discovery, input rejection, and direct-table denial are proven; authenticated creation and two-actor profile tests remain pending.

**Not yet production functionality:** seeded live activity data, authenticated creation acceptance, activity detail/cancellation, transactional participant joins, real SMS delivery, realtime chat, moderation operations, MapLibre styling, custom avatar builder, payments, recommendations, direct messages, or recurring-event administration.
