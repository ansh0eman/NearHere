# NearHere Mobile Application

This is the primary iOS/Android client. It uses Expo SDK 54, React Native, TypeScript, Expo Router, `react-native-maps`, Expo Location, AsyncStorage, and the Supabase JavaScript client.

## Mental model

```mermaid
flowchart LR
    TS["TypeScript source"] --> METRO["Metro transforms and serves JavaScript"]
    METRO --> APP["Installed NearHere development build"]
    APP --> NATIVE["Native iOS/Android views and APIs"]
```

The installed development build contains native code. Metro supplies frequently changing TypeScript/JavaScript during development. Most UI edits use Fast Refresh; adding or reconfiguring native modules requires rebuilding the binary.

## Prerequisites

- Node.js and npm
- Xcode and an installed iOS Simulator runtime for iOS development
- CocoaPods for compiling iOS native dependencies
- A hosted Supabase project when testing the configured fixed development OTP or later real phone delivery

## First setup

```bash
cd /Users/ansh0eman/Desktop/NearHere/apps/mobile
npm install
cp .env.example .env
```

The example environment file contains names, not credentials. Never commit `.env`, a Supabase service-role key, OTP, or access token.

## Daily development loop

If the NearHere development build is already installed:

```bash
npx expo start --dev-client
```

Open NearHere in Simulator. Saving TypeScript normally triggers Fast Refresh.

Build or rebuild the native application when dependencies, config plugins, permissions, entitlements, or native code change:

```bash
npx expo run:ios --device "iPhone 17 Pro"
```

The generated `ios/` directory is intentionally ignored because Expo's configuration is authoritative. If inspecting it in Xcode, open the `.xcworkspace`, not `.xcodeproj`, because CocoaPods dependencies are wired through the workspace.

## Environment variables

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

`EXPO_PUBLIC_` means the value is embedded in the client bundle and must be considered public. The publishable key is designed for this use when Row Level Security and server authorization are correct. A service-role key bypasses normal database protections and must never appear here.

Supabase's Connect dialog may display framework-specific examples. A Next.js example uses `NEXT_PUBLIC_`; NearHere must use `EXPO_PUBLIC_` because Expo CLI only substitutes that prefix into the mobile JavaScript bundle:

```text
NEXT_PUBLIC_SUPABASE_URL          -> Next.js convention; NearHere will not read it
EXPO_PUBLIC_SUPABASE_URL          -> Expo convention used by NearHere
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY -> Expo client configuration
```

The prefixes do not make values secure. Both `NEXT_PUBLIC_` and `EXPO_PUBLIC_` explicitly mean client-visible. Only the framework/build tool consuming the variable is different.

Changing an environment variable normally requires restarting Metro so the JavaScript bundle is rebuilt. It does not by itself require native recompilation.

## Project structure

```text
app/          screens and file-based navigation routes
components/   reusable presentation components
hooks/        reusable React state/lifecycle behavior
lib/          external-service and device-storage adapters
providers/    app-wide authentication and profile state machines
types/        mobile domain and state types
assets/       images and fonts compiled or bundled with the app
```

## Quality checks

```bash
npm run lint
npm run test:unit
npx tsc --noEmit
npx expo install --check
```

These checks answer different questions: lint checks configured code-quality rules, TypeScript checks contracts, and Expo checks dependency compatibility with SDK 54. None replaces testing the actual interaction in Simulator and later on a physical device.

## Current versus planned behavior

**Implemented:** live nearby-activity loading/empty/error states, map markers for public approximate geometry, a Host form, capacity-safe Join with accepted/pending/waitlisted outcomes, a caller-scoped Plans screen with accepted-active exact-location release, protected-intent resumption, permission states, manual location persistence, place search, tabs, hosted phone/OTP, session restoration, owner-profile loading, runtime boundary validation, and display-name onboarding.

**Hosted configuration verified:** a fixed development OTP requests and verifies successfully, issues a real hosted session, creates the triggered profile, and restores the session after an app restart. Real SMS-provider delivery remains deferred.

**Hosted/Simulator activity evidence:** a real activity was created and rediscovered. Joining as its existing host returned the durable accepted membership without duplicating the row or increasing the participant count. Plans then returned that caller's host card and active exact meeting point. Anonymous Join and Plans execution were denied. A second-user run is still required to prove caller isolation, new-participant acceptance, full-capacity waitlisting, approval-mode pending state, and concurrent last-place behavior.

**Planned:** Leave and host approval/rejection commands, full activity detail and useful meeting-point actions, the second-actor profile/Plans authorization matrix, chat, safety flows, MapLibre styling, and avatar builder.

For the complete runbook, see [`../../docs/ios-simulator-workflow.md`](../../docs/ios-simulator-workflow.md). For architecture, see [`../../docs/system-design.md`](../../docs/system-design.md).
