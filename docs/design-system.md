# NearHere Design System Direction

Status: **principles and initial tokens**, not a finished component library.

## 1. Character

Warm, kinetic, local, and legible. NearHere should feel like a living neighborhood board—not a surveillance dashboard, dating grid, or conventional social feed.

## 2. Information hierarchy

```mermaid
flowchart TD
    MAP["1. Where are activities?"] --> CARD["2. What is happening and when?"]
    CARD --> TRUST["3. Is it suitable, available, and trustworthy?"]
    TRUST --> ACTION["4. Join, request, leave, or host"]
    ACTION --> STATUS["5. What happened and what is next?"]
```

The map is the persistent primary surface. Activity information appears above it in a card/bottom sheet. Nearby, Plans, and Me are the bottom tabs; Host is a prominent contextual action rather than a fourth permanent destination.

## 3. Design tokens

Tokens are named decisions reused across components. React Native will express them as TypeScript objects rather than CSS variables, but the conceptual starting values are:

| Token | Value | Use |
| --- | --- | --- |
| `ink` | `#16202A` | Primary text/icon |
| `muted` | `#66717D` | Secondary text with contrast verification |
| `paper` | `#F7F4EE` | Warm application background |
| `surface` | `#FFFFFF` | Cards/controls |
| `accent` | `#FF6B4A` | Primary action/highlight |
| `accentStrong` | `#DB4C2F` | Pressed/emphasis state |
| `mint` | `#BFE9D4` | Supporting category/status |
| `sky` | `#CFE8F6` | Supporting category/status |
| `radiusCard` | `22` | Major floating surface |
| `radiusPill` | `999` | Filters/status pills |

Color is never the only status channel. Text/icon/shape must distinguish pending, accepted, waitlisted, cancelled, full, and error states.

## 4. Component state contract

Every interactive component should define:

```text
default -> pressed/focused -> loading -> success
                  |             |
                  +-----------> error -> retry
disabled is a reasoned state, not hidden failure
```

Buttons prevent accidental duplicate submission while loading. Error copy explains whether retry is safe. A successful animation never occurs before server confirmation for authoritative writes.

## 5. Motion

- Use soft marker scale/fade and bottom-sheet transitions to preserve spatial context.
- Use brief confirmation motion after a successful join.
- Participant activity can use restrained pulses only if it communicates a real state.
- Respect reduced-motion settings.
- Never use motion to mask loading or change capacity truth.
- Keep continuous decorative animation minimal for battery and attention.

## 6. Accessibility baseline

- Minimum practical touch targets around 44×44 points on iOS and equivalent Android guidance.
- Semantic accessibility labels for icon-only controls and map actions.
- Dynamic text/layout testing; do not assume a single font size.
- Contrast verification against both map and floating surfaces.
- Logical focus order in sheets, modals, auth, and creation steps.
- Announce asynchronous success/error state changes.
- Read the system Reduce Motion preference through `apps/mobile/hooks/use-reduced-motion.ts`; remove decorative motion while preserving the same state and action semantics.
- Provide non-map ways to understand selected activity details; a future list view may improve accessibility even if not first beta scope.

## 7. Avatar direction

Avatars should be expressive and identifiable at marker size without becoming profile-first social currency. The builder is deferred; initial placeholders must still have consistent silhouette, contrast, fallback initials/shape, and accessibility labels.

Before implementing the builder, decide:

- Configuration JSON versus generated image assets
- Deterministic rendering across iOS/Android versions
- Moderation and cultural representation
- Marker-size readability and performance
- Editing/version migration
- Whether onboarding requires it or allows later personalization

## 8. Component inventory

Map shell, privacy-safe activity marker, filter pill, activity card/bottom sheet, participant cluster, walking-distance row, host trust row, Join/Request/Waitlist/Leave controls, Host floating action, creation stepper, place search, permission fallback, OTP input, profile form, chat composer, toast/banner, bottom tabs, safety menu, loading skeleton, empty state, and retry surface.
