# NearHere iOS Simulator and Xcode Workflow

This guide explains how the TypeScript application, Metro, Expo, Xcode, and iOS Simulator work together.

## Current machine status

Xcode 26.6 is installed at `/Applications/Xcode.app`, and the active developer directory is `/Applications/Xcode.app/Contents/Developer`. The Xcode agreement has been accepted, CocoaPods 1.17.0 is installed through Homebrew, and an iOS 26.5 iPhone 17 Pro Simulator is available.

On 2026-08-15, NearHere completed its first native simulator build with zero errors. Xcode compiled and installed the application under the bundle identifier `com.nearhere.app`, Metro served the TypeScript bundle, and the app rendered its native map and iOS location-permission dialog.

Verify the toolchain with:

```bash
xcodebuild -version
xcode-select -p
xcrun simctl list devices available
```

## The five moving parts

### TypeScript source

Files under `apps/mobile/app`, `components`, `hooks`, `lib`, `providers`, and `types` contain most NearHere product code. These are normally edited in Codex, VS Code, or another TypeScript-aware editor.

### Metro

Metro is the React Native bundler. It starts through `npm start`, follows imports, transforms TypeScript/JavaScript into a bundle, serves it to the development app, and pushes changes during Fast Refresh.

### Expo Go

Expo Go is a prebuilt native application containing a fixed collection of native libraries. It can load NearHere's JavaScript bundle, but it cannot gain arbitrary new native modules.

### Xcode

Xcode contains Apple's compilers, SDKs, signing tools, native debugger, simulator management, and project editor. It builds the native application binary; it does not replace Metro for normal React Native TypeScript iteration.

### iOS Simulator

Simulator runs an iOS environment on the Mac. It is useful for interface iteration, navigation, network requests, and many permission flows. It is not performance-equivalent to a physical iPhone and cannot reproduce every hardware behavior.

## Normal fast loop: installed NearHere development build

NearHere now uses its installed development build as the normal iOS container:

```bash
cd /Users/ansh0eman/Desktop/NearHere/apps/mobile
npx expo start --dev-client
```

Open the NearHere app in Simulator or use the development URL printed by Metro. The app binary stays installed while Metro supplies changed JavaScript.

Keep three surfaces visible:

1. Code editor for TypeScript.
2. Terminal for Metro logs and commands.
3. iPhone Simulator for the running application.

Saving a TypeScript file should trigger Fast Refresh without rebuilding the native application.

Expo Go remains useful for projects whose complete native dependency set is included in Expo's generic container, but it is not required for the current NearHere workflow.

## Building or rebuilding NearHere

Use this for the first installation or after a native dependency/configuration change:

```bash
cd /Users/ansh0eman/Desktop/NearHere/apps/mobile
npx expo run:ios
```

To target the simulator used during initial setup:

```bash
npx expo run:ios --device "iPhone 17 Pro"
```

The first run performs several operations:

```text
Read app.json and config plugins
  -> generate the ios native project
  -> install CocoaPods dependencies
  -> ask Xcode to compile a debug application
  -> boot/select an iOS Simulator
  -> install NearHere into the simulator
  -> start/connect Metro
```

The generated `ios` directory is ignored in this project because Expo Continuous Native Generation treats `app.json`, config plugins, and package dependencies as the authoritative configuration.

After the project exists, open the generated `.xcworkspace`, not the `.xcodeproj`, because CocoaPods dependencies are represented in the workspace:

```bash
open ios/*.xcworkspace
```

Use Xcode for native build errors, signing, capabilities, schemes, breakpoints in native code, and Instruments. Continue editing NearHere TypeScript in the TypeScript-aware editor.

### Reconnecting an installed development build

If the native app is already installed, a normal work session does not require recompiling it. Start Metro in development-client mode:

```bash
npx expo start --dev-client
```

If Expo cannot bring Simulator to the foreground because macOS blocks AppleScript automation, launch the development URL through CoreSimulator instead:

```bash
xcrun simctl openurl booted \
  'com.nearhere.app://expo-development-client/?url=http%3A%2F%2F192.168.1.3%3A8081'
```

The IP address must match the URL printed by Metro. The first custom-URL launch can display an iOS confirmation dialog. After choosing **Open**, repeat the command if the app opened without receiving the URL.

## Choosing a simulator

List available devices:

```bash
xcrun simctl list devices available
```

Run a named simulator through Expo:

```bash
npx expo run:ios --device
```

The interactive selector lists available simulators and connected iPhones.

If no iOS runtime exists, open Xcode Settings and install the required iOS Simulator runtime under Components.

## Setting simulated location

Simulator does not automatically represent the Mac's physical location. Use Simulator's location controls to select a preset route or custom latitude/longitude. Then test:

- Permission allowed.
- Permission denied.
- Manual location fallback.
- Changing the simulated coordinate.
- App restart and persisted manual selection.

Always repeat hardware-sensitive checks on a real iPhone before claiming physical-device correctness.

## Side-by-side layout

A practical layout is:

```text
Left side:  Codex or VS Code with TypeScript
Right side: iPhone Simulator
Bottom:     terminal with Metro logs
Background: Xcode for native build/debug work
```

Xcode can remain open beside Simulator when investigating a native build. For ordinary UI edits, keeping the TypeScript editor beside Simulator is more useful than editing generated native files in Xcode.

## Rebuild boundary

Fast Refresh is sufficient when changing:

- React components
- TypeScript types
- styles
- application state
- API calls

Rebuild the development application when changing:

- native dependencies
- config plugins
- iOS permissions in generated native configuration
- native Swift/Objective-C code
- app capabilities or entitlements

This boundary explains why adding MapLibre requires a new development build while changing a NearHere card color does not.

Changing `EXPO_PUBLIC_` environment values normally requires stopping and restarting Metro so a new JavaScript bundle is produced. It does not normally require recompiling the iOS binary. Never put a Supabase service-role key or another secret in an `EXPO_PUBLIC_` variable.

## Troubleshooting order

1. Read the first error, not only the final failure summary.
2. Decide whether the error belongs to TypeScript, Metro, Expo configuration, CocoaPods, Xcode compilation, Simulator boot, or runtime application behavior.
3. Run the narrowest relevant diagnostic.
4. Change one cause at a time.
5. Re-run the smallest verification that could disprove the fix.
6. Record the challenge and evidence in the engineering learning guide.
