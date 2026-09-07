# Documentation Audit and Maintenance Plan

This file prevents the documentation set from becoming a pile of disconnected
notes. Each document has one job and one owner question.

| Document | Answers | Update when |
| --- | --- | --- |
| `product-bible.md` | Why should NearHere exist? | Product promise, audience, or non-goal changes |
| `prd.md` | What must the beta do? | Acceptance criteria or scope changes |
| `ux-flows.md` | What does the user experience? | New route, state, or recovery path |
| `design-system.md` | How should it look and feel? | New component, token, accessibility rule |
| `technical-architecture.md` | Which technologies and boundaries? | Dependency or deployment decision |
| `system-design.md` | How does the whole system behave and scale? | New trust boundary, invariant, or failure mode |
| `data-model.md` | What is persisted and constrained? | Migration, index, RLS, retention rule |
| `api-spec.md` | What does each operation accept and return? | RPC or future endpoint change |
| `code-tour.md` | How does a learner trace the code? | Every implemented vertical slice |
| `engineering-learning-guide.md` | What did we learn while building? | Every non-obvious challenge or correction |
| `practical-engineering-curriculum.md` | What should the learner study next? | New engineering topic or milestone |
| `engineering-backlog.md` | What is actionable now? | Completion or reprioritization |
| `roadmap.md` | What phase is the product in? | Evidence-backed phase transition |
| `ios-simulator-workflow.md` | How do I run the native app? | Toolchain or simulator workflow change |
| `visual-evidence.md` | What must be captured visually? | New user-facing state |
| `phase-3-acceptance-runbook.md` | Which gates are still open? | Hosted/Simulator acceptance result |
| `startup-launch-and-resume-plan.md` | How does this become a beta and resume story? | Metric, launch, or operating evidence |
| `competitive-research-plan.md` | What market evidence do we need? | Research question or competitor set |
| `gtm-plan.md` | How do we create local liquidity? | Launch experiment or metric change |
| `glossary.md` | What does each technical term mean? | New term appears repeatedly |

## Definition of a complete feature chapter

A feature is documented deeply enough when a learner can:

1. State the user rule in one sentence.
2. Draw the request/state/data flow.
3. Find the TypeScript domain type and explain each field.
4. Trace the screen event into the repository and database operation.
5. Identify the authorization and concurrency invariant.
6. Reproduce one success and one denial test.
7. Explain what is still unverified in the Simulator/device.
8. Give an honest interview explanation without claiming unsupported scale.

## Current audit result

The repository now has the first complete teaching chapter for durable activity
chat in [`code-tour.md`](code-tour.md), including TypeScript, repository,
Postgres, security, tests, exercises, and interview language. Visual evidence
is specified in [`visual-evidence.md`](visual-evidence.md); actual Simulator
captures remain an explicit acceptance task because the CoreSimulator service
was unavailable during this audit.
