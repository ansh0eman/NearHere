# NearHere continuation entry point

When the user says **continue** for the premium map/profile redesign:

1. Read `docs/handoffs/night-arcade-status.md` first.
2. Read `docs/handoffs/night-arcade-execution.md` completely before implementation.
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
