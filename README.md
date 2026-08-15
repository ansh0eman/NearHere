# NearHere

NearHere is a map-first mobile product for discovering nearby activities and joining people in real life.

> See what is happening nearby and join in.

## Current status

NearHere is an installable Expo/React Native application for iOS and Android. The current working vertical slices include native map discovery with explicitly labeled fixture activities, foreground location permission, persistent manual map-pin selection, submit-only place search, native tab navigation, and provider-gated phone OTP screens. The first native iOS development build is running in Simulator.

The Supabase development project is connected and the first profile/RLS migration is deployed. Real SMS OTP, authenticated profile-policy tests, live activities, joins, chat, and the custom avatar builder are not implemented yet.

## Repository layout

- `apps/mobile/` — primary Expo/React Native application
- `apps/web/` — legacy visual concept; not a production client
- `services/api/` — future modular-monolith application API boundary
- `packages/contracts/` — framework-independent domain contracts
- `supabase/migrations/` — versioned PostgreSQL/PostGIS schema changes
- `docs/` — product, system-design, learning, business, and delivery records

## Product decisions

1. Anyone can browse; Join and Host require phone OTP authentication.
2. Discovery starts with foreground location permission and falls back to searchable manual selection.
3. Activities—not profiles or a feed—are the primary unit.
4. Public locations are approximate; exact continuous user location is never exposed.
5. The custom avatar is important differentiation but is deferred until identity and activity correctness exist.
6. Redis, custom WebSockets, payments, direct messages, recurring-event administration, and complex recommendations are not first-slice infrastructure.

## Start the installed development build

```bash
cd /Users/ansh0eman/Desktop/NearHere/apps/mobile
npm install
npx expo start --dev-client
```

Open the already-installed NearHere development build in iOS Simulator. Rebuild it only when native dependencies or native configuration change:

```bash
npx expo run:ios --device "iPhone 17 Pro"
```

See [`apps/mobile/README.md`](apps/mobile/README.md) for the exact daily workflow and [`docs/ios-simulator-workflow.md`](docs/ios-simulator-workflow.md) for the first-principles explanation.

## Documentation

Start with [`docs/README.md`](docs/README.md). It defines the reading order and source-of-truth rules. The main references are:

- [`docs/system-design.md`](docs/system-design.md) — end-to-end architecture and scaling
- [`docs/engineering-learning-guide.md`](docs/engineering-learning-guide.md) — chronological implementation lessons and challenges
- [`docs/practical-engineering-curriculum.md`](docs/practical-engineering-curriculum.md) — practical software-engineering syllabus
- [`docs/glossary.md`](docs/glossary.md) — terms used throughout the project
