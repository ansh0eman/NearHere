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
- A hosted Supabase project only when testing real phone authentication

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

Changing an environment variable normally requires restarting Metro so the JavaScript bundle is rebuilt. It does not by itself require native recompilation.

## Project structure

```text
app/          screens and file-based navigation routes
components/   reusable presentation components
hooks/        reusable React state/lifecycle behavior
lib/          external-service and device-storage adapters
providers/    app-wide context, currently authentication
types/        mobile domain and state types
data/         explicitly labeled development fixtures
assets/       images and fonts compiled or bundled with the app
```

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npx expo install --check
```

These checks answer different questions: lint checks configured code-quality rules, TypeScript checks contracts, and Expo checks dependency compatibility with SDK 54. None replaces testing the actual interaction in Simulator and later on a physical device.

## Current versus planned behavior

**Implemented:** map, fixture markers, permission states, manual location persistence, place search, tabs, phone/OTP screens, auth state provider, and Supabase client configuration boundary.

**Needs external configuration:** real SMS OTP and hosted sessions.

**Planned:** database-backed profiles and activities, transactional Join/Leave, host creation, chat, safety flows, MapLibre styling, and avatar builder.

For the complete runbook, see [`../../docs/ios-simulator-workflow.md`](../../docs/ios-simulator-workflow.md). For architecture, see [`../../docs/system-design.md`](../../docs/system-design.md).
