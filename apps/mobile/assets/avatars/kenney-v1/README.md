# NearHere Kenney character catalog v1

These are derived, bounded character images built from the
[Kenney Modular Characters](https://kenney.nl/assets/modular-characters) pack.
The included `LICENSE.txt` is the creator's CC0 notice. CC0 allows commercial
use and modification; NearHere keeps the notice and source provenance anyway.

`source/` contains only the selected building blocks. `compiled/` contains eight
512×768 transparent PNGs used by the mobile application. They share a feet
baseline, pose, camera and facial expression so the map and profile render the
same person consistently.

Regenerate the catalog from the repository root on macOS:

```sh
swift apps/mobile/scripts/build-kenney-avatars.swift
```

The source archive SHA-256 recorded during intake was
`ff08976d4b93c10cca1e2d67a99588fa82e63737676be543d6f5929606c13b93`.
This initial catalog is intentionally eight complete looks. It supports a useful
customisation choice while we prove the React Native and MapLibre path. Adding a
new option requires adding its source parts, compiling it, inspecting it at map
and profile sizes, then updating the validated catalog in code and SQL.
