# Hosts Cannot Join Their Own Activities

Date: 30 September 2026

## The bug

A host is automatically created as an accepted `host` membership when they
publish an activity. The former `join_activity` RPC treated a later host Join
tap as an idempotent success and returned `accepted`. It did not create a second
membership, but it made the product misleading: the map still offered a Join
button for something the person was already hosting.

## The invariant

One person has one membership row per activity. If they are the host, their role
is `host`, their status is `accepted`, and they manage the activity rather than
joining it. The server, not the screen, owns this rule because a stale, modified,
or future client must not be able to bypass it.

## Implementation

Migration `202609300001_prevent_host_self_join.sql` does two related things:

1. `join_activity` loads and locks the activity, then rejects an actor whose ID
   is the `host_user_id` with application error `P0004`. It also preserves a
   defensive host-role check for malformed historical data.
2. The nearby-map RPC returns `viewer_is_host`, a caller-specific boolean. It
   exposes no user ID and resolves to `false` for anonymous or non-host callers.

The mobile parser treats only literal boolean `true` as ownership. The map
selection and Browse row say “You are hosting”; the Join action is replaced with
“Manage activity,” which opens the existing Activity Detail management surface.
The repository maps `P0004` to a clear fallback message if a stale client ever
tries the RPC anyway.

## Why both database and UI matter

```text
Host opens owned activity
        |
        v
Nearby RPC returns viewer_is_host = true
        |
        v
Mobile shows Manage activity, not Join
        |
        +-- stale/malicious client calls join_activity anyway
                    |
                    v
              PostgreSQL returns P0004
```

The first path prevents confusion. The second protects data integrity.

## Verification

- Migration deployed to the NearHere development project.
- 88 local unit tests, TypeScript, and lint passed.
- The hosted four-actor participation harness passed. It proved:
  - host self-join receives `P0004`;
  - the host sees `viewer_is_host: true` for their activity;
  - another participant sees `false` for that same activity;
  - no `host_user_id` is exposed by nearby discovery;
  - existing capacity, waitlist, block, private-location, and leave rules still
    pass.

The remaining acceptance item is a visual Simulator capture while signed in as
the activity host. The server and API behavior are already verified; this is a
presentation check, not a security gap.
