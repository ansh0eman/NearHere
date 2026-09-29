# Night Arcade: design decision and research

Date: 23 September 2026. **Visual target, not a shipped UI.**

24 September scope extension: the user asked to plan the richer profile and
previously deferred wardrobe. [The premium profile/character specification](../handoffs/premium-profile-avatar-spec.md)
now defines optional real bio/interests/city, bounded outfit looks and a separately
gated genuine 3D pipeline. The initial six-character/no-wardrobe limits below
describe the first release, not a prohibition on that staged roadmap. The
concept's fake handles/counts and live-tracking implications remain excluded.

The user rejected the inconsistent cream/orange forms, violet discovery, small
face markers, heavy cards, and sparse test map. They asked for a premium map-first
community: “if Reddit had a map,” with Pokémon GO-like delight and expressive
people. They liked the generated proposals and authorised proceeding, leaving
avatar complexity to the designer. They did not explicitly choose a letter.
The working choice is the previously recommended **Night Arcade**, not a claim
that the user specifically selected A. Preserve alternatives for later review.

## Three explored directions

| Direction | Palette | Character | Decision |
| --- | --- | --- | --- |
| Night Arcade | Charcoal, warm white, acid lime | Streetwear neighbourhood club | Working target |
| Expedition | Midnight blue, amber, teal | Outdoor exploration | More game-like; retained alternative |
| Daylight Club | Silver-white, vermilion, mint | Bright editorial community | Future light-mode reference, not now |

![Night Arcade concept, not application screenshot](night-arcade.png)

Alternative concepts: [Expedition](expedition.png), [Daylight Club](daylight-club.png).

## Research and what we actually take from it

1. [Reddit avatar customisation](https://support.reddithelp.com/hc/en-us/articles/360043035352-How-do-I-customize-and-style-my-avatar)
   makes identity a recurring profile interaction through appearance and clothing.
   **Our inference:** use one persistent character across profile and hosted
   activities. Do not copy Snoo, its antenna, its artwork, or its premium economy.
2. [Pokémon GO Rediscover](https://pokemongo.com/rediscovergo)
   combines avatar expression and environment-aware visual changes.
   **Our inference:** expressive silhouettes and stylised parks/water can make
   the map inviting. Do not copy Pokémon assets or add unrelated capture mechanics.
3. [Snap Map Bitmoji/Actionmoji](https://help.snapchat.com/hc/en-gb/articles/7012324804628-How-do-I-use-Bitmoji-on-the-Snap-Map-and-what-is-Actionmoji)
   is a useful reference for character-led maps. NearHere has a different privacy
   contract: a character identifies an activity's host at an approximate activity
   area, **not the host's current position or presence**. Activity props are
   declared categories, never inferred movement, mood, attendance, or online state.
4. [Apple Maps guidance](https://developer.apple.com/design/human-interface-guidelines/maps)
   and [colour guidance](https://developer.apple.com/design/human-interface-guidelines/color)
   are interaction/accessibility references. Preserve map context, clear controls,
   readable labels, and legal attribution. Some Apple pages require JavaScript;
   check the live rendered documentation before attributing a specific rule.
5. [MapLibre requirements](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/)
   and [Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/)
   establish a technical boundary: a native rebuild is required, Expo Go is not
   supported, and demo tiles are for development. A production tile/style source
   still needs selection and terms review. Current documentation uses a `Map`
   export; old examples using other APIs are not interchangeable.
6. [Expo SDK 54 location](https://docs.expo.dev/versions/v54.0.0/sdk/location/)
   distinguishes permissions, service availability, current fixes, and cached
   fixes. That distinction drives the current location reliability changes.

These sources inform the design; none proves that a particular colour will
increase retention. Test usability with the user before making business claims.

## Intentional changes to the generated concept

The image generator added UI/content that is **not** the product specification:

- No standalone Inbox/DM product, fake photographs, fabricated bios or @handles.
- No always-visible category rail; filters live in Browse to keep the map clear.
- No duplicated Host/Create buttons and no four-item navigation bar on the map.
- No fabricated “6 hosted / 12 joined” totals. Either query honest counts with
  defined semantics or omit them. Attendance is not the same as joining.
- No globally exact public meeting point labels. Show the discovery area until
  the server authorises the exact point.
- No permanent glowing activity circles suggesting live people tracking.
- Dense geographic/3D map detail in the image is artistic, not a usable tile set.
  Use real vector geography, quiet roads, stylised water/parks, and legal credits.

## Design specification

Tokens below are design choices, not current implementation:

| Semantic token | Value | Use |
| --- | --- | --- |
| canvas | `#111516` | App/map backdrop |
| surface | `#1C2223` | Sheets, forms |
| raised | `#272F30` | Inputs, pressed controls |
| text | `#F4F5EF` | Primary copy |
| mutedText | `#AEBAB6` | Supporting copy; verify contrast |
| accent | `#D4F76A` | One primary action per surface |
| onAccent | `#182013` | Button text; never white on lime |
| border | `#3B4643` | Dividers, input boundaries |
| danger | `#FF9E96` | Destructive/error copy with icons/words |
| water | `#243E47` | Proposed map fill |
| park | `#304534` | Proposed map fill |

Use the existing platform font initially. Typography hierarchy: screen title
28/34 semibold, section title 20/26, body 16/23, secondary 14/20, compact labels
12/16. These are base sizes with accessibility scaling, not hard clipping boxes.
Spacing scale: 4, 8, 12, 16, 24, 32. Radii: 12 inputs, 20 sheets/cards, full only
for small floating controls. Avoid all-caps letter-spaced form labels everywhere.
Touch targets at least 44 by 44 points. Measure contrast instead of guessing.
Use subtle boundaries, not large black shadows on dark backgrounds.

### Map resting state

```text
┌────────────────────────────────┐
│ nearhere · Bellandur       [me]│  Safe-area aware
│                                │
│      character                 │
│      Coffee · in 2 hr           │
│                     character  │
│                     Walk       │
│                                │
│                       [locate] │
│  [Browse / Plans]      [+ Host] │
│  Legal map attribution visible │
└────────────────────────────────┘
```

Only selecting an activity opens a compact dismissible preview. It should not
occupy half the phone. Include title, host, start, approximate distance, spots,
and one correct next action. Long details/chat/safety live on Activity Detail.
Keep selection nullable. A loading or error state must never invent populated
markers. A collapsed list is not a replacement for an accessible Browse screen.

### Avatar complexity decision

Start with **six original pre-rendered full-body characters**, expanded only
after the six look coherent at map size. Transparent images, consistent camera,
lighting, floor baseline and padding; no 3D runtime, rigging, facial animation,
user-photo upload, remote AI call, or wardrobe combinatorics. A large portrait
can reuse the same bundled image. This achieves visual richness with ordinary
image rendering and predictable offline behaviour.

Assignment and artwork are separate. The server saves a random seed once. A
versioned fixed catalog maps it to a character. Later the user may choose another
catalog item explicitly. Do not use `Math.random()` inside a render or change an
assigned avatar on every login. Never infer gender/appearance from a name/phone.

Initial gamification is expressive characters, category props and restrained
selection feedback. No XP, streaks, leaderboards, paid cosmetics, fake badges,
or attendance rewards until genuine product rules/data exist.

## Concept-generation record

Tool mode: built-in image generation, three separate design concepts. They are
proposal assets only, stored here as documentation, not imported into the app.
The image-generation skill guided reference creation; generated embellishments
were reviewed and explicitly rejected above where outside product scope.

Prompt shared across variants: high-fidelity premium NearHere mobile proposal;
two large map/profile screens; street-level stylised Bengaluru neighbourhood;
six original expressive full-body human vinyl characters with diverse streetwear;
minimal area/profile controls; compact activity tray; readable typography;
no Snoo/Pokémon copies, no emoji placeholders, no fake live tracking, no XP.
Night Arcade variant specified graphite `#111516`, restrained lime `#D4F76A`,
moss parks/slate water and matte characters. Expedition specified ink `#101E2A`,
amber `#F5B84B`, teal water and outdoor explorers. Daylight Club specified silver
`#F3F5F5`, vermilion `#D94336`, pale cyan water and editorial streetwear.

## Definition of visual success

A real Simulator capture must have the same **hierarchy, palette and character
quality** as the target; a dark background plus old emoji markers is not success.
Review Map, Profile, Host, Activity Detail, Plans and Auth together. Run populated,
empty, error, keyboard-open, and large-text states. Record differences honestly.
The app must remain understandable without colour, artwork or map gestures.

## Implementation parity checkpoint — 2026-09-29

The first cross-screen consistency fix reuses the authored Night Arcade MapLibre
style in the manual area picker and private meeting-point picker. Before this,
the discovery map used the custom dark style but both selection flows fell back
to the bright iOS system map. `apps/mobile/components/map/selection-map.tsx`
now owns the shared basemap, attribution, camera movement, and viewport-center
callback; each screen retains its existing search, fixed center pin, and save
behavior. A Simulator screenshot confirmed the manual-area flow loads the dark
style and existing search/confirmation controls remain visible.

This fixes a jarring style switch; it does **not** establish concept parity.
The screenshot still uses conventional vector-map geometry, a simple branded
center pin, and dark panels rather than the concept's illustrated street scene
and full-body people. Map avatars, character artwork, and richer map-specific
composition remain separate work. The picker style should be checked on the
private meeting-point route and with physical-device network conditions before
calling the location experience accepted.

### Map character legibility follow-up — 30 September 2026

The map renderer now places every individual character on a dark circular
pedestal with a subtle border and increases its image scale (and its selected
scale). This establishes a readable visual unit against detailed vector streets:
an activity is a person in a place, rather than an unexplained tiny image. The
cluster treatment remains distinct and the public-safe feature contract is
unchanged. The legal attribution control remains available from the map; the
custom visible affordance is now the compact “Map data” label instead of a
repeated provider-name line. This reduces chrome without hiding credits.

The current discovery response contained one unexpired development row during
the visual capture. The demo seeder intentionally uses a current test-OTP
configuration and refused an obsolete credential with HTTP 403 before creating
or altering any data. Do not substitute local fake activities in the shipped
client to make a screenshot look busy; rerun the non-destructive seeder only
after the current development test OTP is available.
