# NearHere UX Flows

## Current discovery entry — 23 September 2026

Open → full-screen map without automatic selection. Area control → location search. Browse dock → filters and list → tap row → return to selected map pin. Pin → compact host/activity card → existing detail or Join flow. Map tap/close → clear selection. Profile is top-right; Your plans is inside Browse. Host stays directly available on the dock. See [Map-first design](map-first-design.md).

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
    MAP --> TOGGLE["Switch Map / List"]
    TOGGLE --> MAPVIEW["Map projection"]
    TOGGLE --> LISTVIEW["List projection"]
    LISTVIEW --> DETAIL
    MAPVIEW --> MARKER
```

Location denial is not an onboarding dead end. The user retains product access, and the app asks only for foreground—not continuous background—permission.

The Map/List control changes presentation, not the data contract. Both projections use the same caller-scoped `nearby_activities` rows, so privacy rules (approximate public geometry and blocked-host filtering) are applied once in the repository/RPC layer rather than reimplemented separately in each view. The list is also a keyboard/screen-reader-friendly path for people who do not want to interpret a map.

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
    VERIFY -->|"Yes"| PROFILE{"Profile complete?"}
    PROFILE -->|"No"| ONBOARD["Choose display name and character"]
    ONBOARD -->|"Save succeeds"| RESUME["Resume saved join intent"]
    ONBOARD -->|"Save fails"| ONBOARD
    PROFILE -->|"Yes"| RESUME
    SESSION -->|"Yes"| REQUEST["Submit join transaction"]
    RESUME --> REQUEST
    REQUEST --> OUTCOME{"Outcome"}
    OUTCOME -->|"Accepted"| PLANS["Plans unlocks exact meeting point"]
    PLANS --> CHAT["Future participant chat"]
    OUTCOME -->|"Pending"| PENDING["Waiting for host"]
    OUTCOME -->|"Waitlisted"| WAIT["Queue position/status"]
    OUTCOME -->|"Full/rejected/error"| DETAIL
```

Authentication success is not onboarding success, and onboarding success is not Join success. Authentication proves identity; profile completion supplies the minimum application identity; the deployed Join transaction then evaluates availability, existing membership, capacity, join mode, and blocks. Activity chat, authenticated discovery, host participant projections, and exact-location release apply the same block predicate. Existing membership is not silently deleted; Leave or host removal remains explicit.

Current result semantics are explicit: an open activity returns `accepted` while capacity remains and `waitlisted` when full; an approval activity returns `pending`; an existing active membership is returned unchanged on retry. The 2026-08-15 hosted A/B/C/D run verified all participation outcomes through the RPC boundary. The rebuilt iPhone 17 Pro Simulator accepted the Actor C Auth/onboarding/Leave flow and Host A approval flow. Pending/waitlisted participant cards and host Reject still need Simulator acceptance.

## 3. Host creation

```mermaid
flowchart TD
    MAP["Tap Host"] --> SESSION{"Valid session?"}
    SESSION -->|"No"| AUTH["Save host intent and complete phone OTP"]
    AUTH --> PROFILE{"Profile complete?"}
    SESSION -->|"Yes"| PROFILE
    PROFILE -->|"No"| ONBOARD["Choose display name and character"]
    ONBOARD --> BASICS
    PROFILE -->|"Yes"| BASICS["Choose activity type and title"]
    BASICS --> TIME["Select start and end time"]
    TIME --> PLACE["Search or pin private meeting point"]
    PLACE --> RULES["Description, capacity, open/approval"]
    RULES --> PREVIEW["Preview approximate public area"]
    PREVIEW --> PUBLISH{"Publish succeeds?"}
    PUBLISH -->|"Yes"| LIVE["Live activity detail"]
    PUBLISH -->|"No"| RECOVER["Preserve draft and show actionable error"]
    RECOVER --> PREVIEW
```

The Host form now has two ways to choose a start: quick presets (30 minutes, one hour, and tomorrow) and a native date/time sheet for a specific future date and time. It also starts from the current discovery area but lets the host search for a landmark or drag a map pin to choose the exact private meeting point. The selected exact pin is written only through `create_activity`; the database creates a separately displaced public marker for discovery. A future public-area preview remains planned.

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

The deployed release policy requires `membership.status = accepted`, `activity.status = published`, and `ends_at > now()`. `my_plans` enforces it inside PostgreSQL: only accepted members of active published activities receive exact coordinates; pending, waitlisted, cancelled, completed, and ended cases receive `null`. Hiding a field in the UI would be insufficient because a modified client can inspect any data already received.

## 6. My Plans

```mermaid
flowchart TD
    OPEN["Open Plans tab"] --> SESSION{"Signed in?"}
    SESSION -->|"No"| CTA["Explain browse-first model and offer sign in"]
    CTA --> AUTH["Save openPlans intent and complete OTP"]
    AUTH --> RETURN["Return to Plans"]
    SESSION -->|"Yes"| LOAD["Load caller-scoped plans on focus"]
    RETURN --> LOAD
    LOAD --> RESULT{"Result"}
    RESULT -->|"Empty"| EXPLORE["Explore nearby"]
    RESULT -->|"Error"| RETRY["Keep safe state and retry"]
    RESULT -->|"Rows"| CARDS["Hosting / Going / Requested / Waitlisted cards"]
    CARDS --> ACCEPTED{"Accepted and active published?"}
    ACCEPTED -->|"Yes"| UNLOCK["Show exact meeting point"]
    ACCEPTED -->|"No"| LOCK["Explain locked or no-longer-available point"]
```

The signed-out state preserves an `openPlans` protected intent before routing to phone Auth. The Auth modal cannot be dismissed by a swipe that bypasses cleanup; the explicit close action clears the pending intent. The signed-in hook refreshes whenever the tab gains focus. During refresh or recoverable failure it can retain previously loaded rows rather than blanking the whole screen, but cached rows are keyed/gated by user ID so one account's private point cannot flash for another account. The current card displays type, membership/host status, time, accepted count/capacity, host, and either the exact coordinate or explicit locked/no-longer-available copy. Cancelled and ended cards suppress the exact point and use `Cancelled`/`Ended` status labels.

Verified in Simulator: the signed-in host saw the real hosted activity and unlocked exact meeting point. Actor C completed phone OTP/onboarding/resume, saw the accepted exact point, and confirmed Leave to remove the card/private point. Host A then opened Plans for `TEST UI HOST REQUEST`, saw a Join requests count of one for `Test Participant C`, and tapped Accept. The request section disappeared, the activity count changed from `1/2` to `2/2`, and the host's private meeting point remained displayed. This accepts the approval UI and coordinated request/Plans refresh; it does not accept Reject or pending/waitlisted participant cards.

## 7. Required interface states

| Surface | States |
| --- | --- |
| Location | explaining, requesting, ready, denied, unavailable, manual-searching, search-empty, search-error, saving |
| Authentication | restoring, signed-out, sending-code, awaiting-code, verifying, signed-in, recoverable-error |
| Discovery | initial-loading, results, empty, refreshing, stale-with-error, unavailable |
| Activity | published, active, completed, cancelled; open, pending, accepted, waitlisted, full, rejected |
| Plans | signed-out, initial-loading, empty, refreshing-with-rows, error-with/without-rows, populated; exact-location locked/unlocked |
| Write action | idle, submitting, succeeded, retryable-failure, non-retryable-failure |
| Chat | loading-history, ready, sending, send-failed, reconnecting, unauthorized |

Every asynchronous control must prevent accidental duplicate submission while still permitting an intentional retry.

## 8. Accessibility and recovery rules

- Do not communicate status only through color or motion.
- Use explicit control labels and minimum touch targets.
- Preserve entered data after recoverable network failures.
- Announce important status changes to assistive technology.
- Respect reduced-motion preferences.
- Never show a success state until the authoritative system confirms success.

## 9. Profile and avatar choice

```mermaid
flowchart LR
  ACCOUNT["Me tab"] --> EDIT["Edit profile"]
  EDIT --> DRAFT["Name + one of six bundled characters"]
  DRAFT --> SAVE{"Save succeeds?"}
  SAVE -->|"Yes"| PROFILE["Updated profile state"]
  SAVE -->|"No"| ERROR["Keep draft and explain error"]
  PROFILE --> MAP["Same character in Nearby markers"]
  EDIT -->|"Cancel"| ACCOUNT
```

New profiles see the editor as part of onboarding. Existing users reach it from
Me. Choosing a character is local draft state until Save, so Back cancels the
change. The write preserves the database-generated seed and stores a separate
allowlisted ID (`v1-01` to `v1-06`). The same stable avatar component renders Me,
Browse and map markers. Simulator save/reload and cross-surface acceptance is
still required before claiming this flow works end-to-end.
- Provide a safe route back from permission, authentication, and network failures.
