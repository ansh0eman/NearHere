# NearHere continuation entry point

For the 2 October day/night map, custom Avatar Studio, username and multi-provider
sign-in request, read `docs/handoffs/daylight-avatar-identity-20261002.md` completely
after the status file. Start at D00 or its first unfinished ticket. This newer
request supersedes conflicting visual/wardrobe scope below; existing privacy,
fixture-preservation and evidence rules continue to apply.

When the user says **continue** for the premium map/profile redesign:

1. Read `docs/handoffs/night-arcade-status.md` first.
2. Read `docs/handoffs/premium-product-execution.md` completely. It is the current
   master plan (P00-P10); follow its read order and ticket gates. Read
   `premium-profile-avatar-spec.md` before P05-P08 and `premium-community-roadmap.md`
   before E01-E08. These are in `docs/handoffs/`. The older
   `night-arcade-execution.md` remains required baseline technical guidance;
   the premium plan supersedes its blanket wardrobe deferral, not privacy rules.
3. Read `docs/design-concepts/design-review.md` and inspect the chosen reference image.
4. Read `apps/mobile/AGENTS.md` before editing mobile code. Verify live Git/source/config rather than trusting a historical summary.
5. Execute the first unfinished ticket only, test it, update the handoff, then proceed to the next. Do not stop merely because a ticket is complete if the user asked to continue autonomously.

Preserve pre-existing edits. In particular, the historical blank-line edit in
`supabase/migrations/202608150002_create_activities.sql` is not this redesign's work.
Never delete/cancel existing development activities as part of a visual iteration.
Never reset the hosted database or run destructive fixture cleanup to obtain a screenshot.

## Output discipline

For verbose non-interactive tests, builds, logs, diffs, or searches, use `distill`
with a precise question and `set -o pipefail`. Small outputs and exact security,
migration, or destructive-action evidence should remain raw. If Distill omits
diagnostics or its summary conflicts with the exit code, inspect a bounded raw
slice. Do not request elevated permissions when this session's policy forbids it.

## Evidence discipline

Plans, concepts, code, hosted deployment, automated checks, Simulator inspection,
physical-device acceptance, and production readiness are different states. Never
mark one as another. Never invent a screenshot, provider credential, API, test
result, notification delivery, attendance count, or performance measurement.

See the handoff's escalation rules when blocked. No new agent delegation is
required by this file. Keep work sequential and economical unless the user
explicitly requests delegation.
