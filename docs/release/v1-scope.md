# NearHere V1 release scope (draft)

Status: engineering draft, 30 September 2026. This is the product contract
proposal used by the App Store T-pass. Items marked **owner decision** must be
settled before submission. It makes no legal or service-availability promise.

## Intended user experience

NearHere is a native iPhone and iPad map for discovering nearby small-group activities.
People may browse without an account. Phone verification and a profile are
required before someone hosts or joins. Each new account receives a persistent
illustrated character; V1 can use the finite authored 2D catalog. Characters
represent activity hosts, never a continuously tracked person.

Public activity markers are approximate. The exact meeting point is private and
is returned only to an authorized host or accepted participant while the event
is active. A person can create an activity with type, title, description, start
time, capacity/join mode and an explicitly selected meeting point. Participants
can join, request approval, wait, leave or report/block. Hosts can review
requests, remove participants, and cancel their activity. Accepted members use
the activity chat. These statements remain subject to the state/device tests in
the T-pass.

## In scope for free V1

- Native iPhone app, nearby map with a Browse/list alternative, category filters,
  location permission with manual-area fallback, public place lookup.
- Phone OTP account creation/sign-in; required public display name and stable
  default character; editable owner profile.
- Host/publish and the participation outcomes above; caller-authorized plans,
  activity detail and private meeting point; accepted-member activity chat.
- Report/block, operator moderation workflow, content safety, in-app account
  deletion request, privacy/support information and an operational response path.
- Map tiles and place search under a deliberately chosen production service
  arrangement with attribution, quotas, privacy review and failure fallback.

## Explicitly out of scope for V1

Payments, paid cosmetics, tickets/payouts, direct messages, recurring activity
series, complex/personalized recommendations, live-person presence, custom
WebSocket infrastructure, Redis, push delivery, and arbitrary/3D wardrobe.
The existing Realtime/polling refresh is not push notification delivery. Do not
show controls or App Store screenshots that imply these features exist.

## Open release decisions

| Decision | Current evidence | Must be decided by |
| --- | --- | --- |
| First launch territory | **India**, confirmed by owner 30 Sep 2026. Bengaluru is the current development/test area, not a restriction on a user's chosen map area. | Resolved for V1 |
| Audience/age rating | Owner requested adults and teens. Exact minimum age and guardian-consent flow are deferred; do not enable or market under-18 accounts until resolved and reviewed. | Release gate; not needed for current local coding |
| iPad distribution | **iPhone and iPad**, confirmed by owner 30 Sep 2026. `supportsTablet: true` already matches the intended scope; iPad acceptance is still required. | Scope resolved; QA open |
| Support identity/contact | No release support URL/contact found in app config/docs search. Owner says set this up later. | Before TestFlight/App Store submission |
| Privacy policy/retention | No release privacy URL/document located by current file search. Engineering data inventory is drafted. | Owner approves truthful policy and URL before submission |
| Production Supabase/SMS | Only a linked development environment was verified; development fixed OTP is not real SMS. | Owner/provider setup |
| Tiles/geocoder | Local custom style still references OpenFreeMap; `place-search.ts` directly queries public Nominatim. | Owner approves provider/cost; engineering integrates |
| Moderation staffing | Operator foundations exist; response owner/hours are not documented. | Owner |
| Reviewer access | No production reviewer account or App Store Connect record verified. | Owner after production backend exists |

## Claim rules for store text

May claim a feature only after its T-pass evidence exists. Do not claim host
identity/background verification, attendance verification, instant SMS in all
regions, push notifications, 3D avatars, or a live neighborhood community from
fictional test fixtures. Describe phone confirmation accurately; it does not
mean a host's real-world identity was verified.

## Acceptance check

This draft becomes an approved V1 contract when the owner resolves the decisions
above and the team maps each in-scope statement to an implemented requirement,
privacy rule, test case and release evidence. Keep unresolved decisions visible;
do not infer answers from local defaults.
