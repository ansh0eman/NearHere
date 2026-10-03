# Avatar Studio: one character across map, profile and activities

Implemented in source on 4 October 2026. The corresponding development
migrations (`202610030001` username and `202610040001` Avatar Studio) were
applied to the linked development Supabase project and the remote ledger matches.
Saving a new look through a fictional authenticated actor is still not claimed
as verified in this session.

## The product rule

A character is decorative, persistent identity—not a real-person likeness,
verification badge, presence indicator, or live-location tracker. On the map it
represents the host at the already approximate activity area. The exact meeting
point remains governed by existing participant authorization.

## The data flow

```mermaid
sequenceDiagram
  participant S as Avatar Studio
  participant P as ProfileProvider
  participant R as Supabase RPC
  participant DB as profiles row
  participant C as Map, Detail, Plans, Me
  S->>P: appearanceId + saved revision
  P->>R: save_my_avatar_v3(revision, finite ID)
  R->>DB: auth.uid(), row lock, revision check
  R->>DB: preserve seed; store v3 appearance + v1 fallback
  DB-->>P: updated owner profile
  P-->>C: one versioned appearance config
  C->>C: render local bundled asset; never fetch a profile image URL
```

The **revision** is a small integer that changes whenever the row changes. It
prevents two screens from silently overwriting each other: the database locks
the row, compares the supplied revision, then either writes once or returns a
conflict (`P0001`).

## Where to read the code

| Concern | Actual implementation |
| --- | --- |
| Versioned shared types | `packages/contracts/avatar.ts` |
| Safe runtime recognition and legacy fallback | `apps/mobile/lib/avatar-identity.ts` |
| Literal bundled image imports | `apps/mobile/lib/avatar-catalog.ts` |
| Same renderer for profile and activity surfaces | `apps/mobile/components/host-avatar.tsx` |
| Native Studio UI | `apps/mobile/app/avatar-studio.tsx` |
| Account-scoped save/reload race protection | `apps/mobile/providers/profile-provider.tsx` |
| RPC adapter and error mapping | `apps/mobile/lib/profile-repository.ts` |
| Database command and safe public projections | `supabase/migrations/202610040001_avatar_studio_v3.sql` |

`AvatarV3Configuration` stores five finite values: `version`, immutable `seed`,
`catalogVersion`, `appearanceId`, and `fallbackAvatarId`. It stores no path,
phone number, account ID, untrusted JSON, remote URL or image upload. The eight
new body images are compiled from selected CC0 Kenney layers and registered as
literal imports, which lets Metro bundle them and lets MapLibre refer to the
same image names offline.

## Compatibility and an important trap

The old six-character catalog is intentionally unchanged. Its old seed hash
still maps the same seed to the same legacy slot. A new v3 appearance supplies a
legacy fallback; unsupported/old clients can still draw a deterministic v1
character from the seed. The profile metadata command deliberately omits
`avatar_id` for v3 profiles. Without that guard, saving a bio would accidentally
downgrade a Studio selection to its old preset.

The app parser is deliberately stricter than raw JSON. It reduces an incoming
projection to the five approved v3 keys and rejects malformed IDs. This is a
useful boundary: UI code receives an application type, not whatever a database
column happens to contain.

## Evidence and remaining gates

- Generated and visually inspected eight transparent full-body PNGs under
  `apps/mobile/assets/avatars/kenney-v1/compiled/`.
- Focused parser/identity/map tests passed: 64 tests at this stage; complete
  unit suite subsequently passed 110 tests; TypeScript and Expo lint passed.
- A direct iOS Expo export subsequently succeeded: it bundled 1,600 modules,
  all eight Kenney assets, and a 5.15 MB Hermes bundle. The earlier `distill`
  wrapper was the stalled part, not Metro asset resolution.
- A direct Simulator `xcodebuild` likewise produced a Debug `.app` directory but
  did not return a final exit status after nearly two minutes; it was stopped.
  That is evidence of a build attempt, not a successful native build. Investigate
  the local Xcode build service/derived data before repeating it.
- The linked development database accepted both migrations; `supabase migration
  list` shows local/remote parity through `202610040001`. The anonymous
  projection smoke passed with zero nearby rows, which confirms no anonymous
  exact-point leak but does not prove a non-null v3 projection yet.
- Pending: run the hosted projection/concurrency harness with fictional actors,
  then capture Studio + map + Detail + Plans on Simulator and physical iPhone.

## Interview explanation

“I designed avatar persistence as a versioned finite contract rather than an
image-upload feature. A dedicated RPC derives the user from the authenticated
session, locks the profile row and checks an optimistic-concurrency revision.
The public activity read models project only validated avatar fields, while the
native app bundles all art locally. I preserved legacy seeded avatars so a new
client did not make older profile data unreadable.”
