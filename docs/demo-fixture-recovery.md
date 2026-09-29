# Populated Map Fixture Recovery

Date: 30 September 2026

## The symptom

The map showed only one nearby activity even though the development project
already contained twelve labelled demo rows. This was not a renderer or map
filter bug: discovery intentionally returns only published activities whose
`ends_at` time is still in the future. The old rows had ended.

## Why the original seeder did not repair it

The fixture seeder is deliberately conservative. It asks each fictional host
for their own Plans and indexes descriptions that contain a marker such as
`[NEARHERE_DEMO_V1:4]`. That prevents duplicate activity creation if discovery
is temporarily unavailable, radius-limited, or block-filtered. Because the V1
rows were still visible in host Plans after they ended, the seeder correctly
reported all twelve slots as retained. It could not know that they no longer
made the public map feel populated.

## The V2 repair

`demo-activities-utils.mjs` now accepts an explicit marker value. The seeder
uses `NEARHERE_DEMO_V2`, leaving V1 as immutable historical development data.
It validates the marker before forming its matcher, then only treats matching
V2 host rows as occupied. This made it safe to create a current V2 batch
without deleting, cancelling, renaming, or overwriting the older rows.

The fixture runner retrieves only the already configured fictional test actors.
Their OTP values are never written to source, docs, screenshots, command output,
or Git. The successful run created twelve V2 activities across four fictional
accounts. A fresh Browse request returned thirteen total nearby rows, including
the pre-existing non-demo activity.

## What this proves

- The development map can be populated with a deliberate multi-user community.
- Existing historical fixture data is preserved.
- Browse lists the current results and a selected item returns to the map with
  the expected preview.
- The marker parser has a unit test proving V1 cannot block V2.

It does not prove production operations. The development database will still
accumulate old fixture rows because ordinary users cannot delete host activities
through this test boundary. Before a beta launch, define an operator-owned,
audited fixture lifecycle rather than relying on repeated versioned batches.

## Evidence

- [Populated map](screenshots/night-arcade-map-populated-v2-simulator-20260930.png)
- [Selected V2 activity](screenshots/night-arcade-map-selected-v2-simulator-20260930.png)
- [Visual evidence ledger](visual-evidence.md)

## Verification

`npx tsc --noEmit`, `npm run lint -- --no-cache`, and `npm run test:unit --
--test-reporter=dot` passed. The final unit result was 87 passed, 0 failed.
