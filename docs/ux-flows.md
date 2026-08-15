# NearHere UX Flows

These flows describe user-visible states and transitions. They are not screen lists: one screen may represent several states, and a transition may call multiple systems.

## 1. Browse-first entry

```mermaid
flowchart TD
    OPEN["Open NearHere"] --> ASK["Explain foreground location value"]
    ASK --> PERM{"Permission result"}
    PERM -->|"Allowed"| DEVICE["Center on device area"]
    PERM -->|"Denied/unavailable"| FALLBACK["Search place or move pin"]
    DEVICE --> MAP["Browse map without account"]
    FALLBACK --> SAVE["Confirm and persist manual area"]
    SAVE --> MAP
    MAP --> CHANGE["Change location"]
    CHANGE --> FALLBACK
```

Location denial is not an onboarding dead end. The user retains product access, and the app asks only for foreground—not continuous background—permission.

## 2. Discovery to protected Join

```mermaid
flowchart TD
    MAP["Map"] --> MARKER["Tap activity marker"]
    MARKER --> DETAIL["Activity detail/sheet"]
    DETAIL --> JOIN["Tap Join or Request"]
    JOIN --> SESSION{"Valid session?"}
    SESSION -->|"No"| INTENT["Save join intent"]
    INTENT --> PHONE["Enter phone"]
    PHONE --> OTP["Enter SMS code"]
    OTP --> VERIFY{"Server verifies?"}
    VERIFY -->|"No"| OTP
    VERIFY -->|"Yes"| RESUME["Resume saved join intent"]
    SESSION -->|"Yes"| REQUEST["Submit join transaction"]
    RESUME --> REQUEST
    REQUEST --> OUTCOME{"Outcome"}
    OUTCOME -->|"Accepted"| CHAT["Participant details and chat"]
    OUTCOME -->|"Pending"| PENDING["Waiting for host"]
    OUTCOME -->|"Waitlisted"| WAIT["Queue position/status"]
    OUTCOME -->|"Full/rejected/error"| DETAIL
```

Authentication success is not Join success. The server still evaluates activity status, capacity, duplicate membership, blocks, and join mode.

## 3. Host creation

```mermaid
flowchart TD
    MAP["Tap Host"] --> SESSION{"Valid session?"}
    SESSION -->|"No"| AUTH["Save host intent and complete phone OTP"]
    AUTH --> BASICS
    SESSION -->|"Yes"| BASICS["Choose activity type and title"]
    BASICS --> TIME["Select start and end time"]
    TIME --> PLACE["Search or pin private meeting point"]
    PLACE --> RULES["Description, capacity, open/approval"]
    RULES --> PREVIEW["Preview approximate public area"]
    PREVIEW --> PUBLISH{"Publish succeeds?"}
    PUBLISH -->|"Yes"| LIVE["Live activity detail"]
    PUBLISH -->|"No"| RECOVER["Preserve draft and show actionable error"]
    RECOVER --> PREVIEW
```

## 4. Approval and waitlist

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Accepted: host approves
    Pending --> Rejected: host rejects
    Pending --> Cancelled: participant withdraws
    [*] --> Waitlisted: activity full
    Waitlisted --> Accepted: capacity opens
    Waitlisted --> Cancelled: participant withdraws
    Accepted --> Left: participant leaves
    Accepted --> Removed: host/moderator removes
```

## 5. Location visibility

```mermaid
flowchart LR
    ANON["Anonymous browser"] --> APPROX["Approximate activity area"]
    AUTH["Signed-in non-member"] --> APPROX
    PENDING["Pending/waitlisted user"] --> APPROX
    MEMBER["Accepted participant"] --> POLICY{"Meeting-point release policy"}
    POLICY --> PRIVATE["Authorized operational meeting point"]
```

The release policy remains a product/safety decision. The implementation must enforce it on the server; hiding a field in the UI is insufficient.

## 6. Required interface states

| Surface | States |
| --- | --- |
| Location | explaining, requesting, ready, denied, unavailable, manual-searching, search-empty, search-error, saving |
| Authentication | restoring, signed-out, sending-code, awaiting-code, verifying, signed-in, recoverable-error |
| Discovery | initial-loading, results, empty, refreshing, stale-with-error, unavailable |
| Activity | published, active, completed, cancelled; open, pending, accepted, waitlisted, full, rejected |
| Write action | idle, submitting, succeeded, retryable-failure, non-retryable-failure |
| Chat | loading-history, ready, sending, send-failed, reconnecting, unauthorized |

Every asynchronous control must prevent accidental duplicate submission while still permitting an intentional retry.

## 7. Accessibility and recovery rules

- Do not communicate status only through color or motion.
- Use explicit control labels and minimum touch targets.
- Preserve entered data after recoverable network failures.
- Announce important status changes to assistive technology.
- Respect reduced-motion preferences.
- Never show a success state until the authoritative system confirms success.
- Provide a safe route back from permission, authentication, and network failures.
