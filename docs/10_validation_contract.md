# 10 Validation Contract

## Purpose

Define a repository-native validation contract for PancakePainter so humans and
agents run the same checks before implementation handoff, review, and merge.

This contract is PowerShell-safe and is the authoritative baseline until a
broader automated test suite is introduced.

## Scope and Authority

- Repository: PancakePainter (Electron desktop app)
- Default shell target: Windows PowerShell
- Authoritative command set (current state):
  1. `npm install`
  2. `npm test`
  3. `npm run smoke` (smoke check only when startup behavior changed)
- CI provider currently used by this repository: Travis CI (`.travis.yml`)

## Current Validation Commands

1. Install dependencies
   - Command: `npm install`
   - Purpose: ensure local dependency graph matches repository lock state

2. Lint/check baseline
   - Command: `npm test`
   - Current script target: `jshint src menus --exclude src/libs,node_modules`
   - Purpose: enforce repository lint baseline before review or merge

3. Startup smoke validation (conditional)
   - Command: `npm run smoke`
   - Delegates to `scripts/smoke-test.ps1` (Windows PowerShell).
   - Run only when changes can affect startup/runtime wiring (for example:
     Electron main-process initialization, `src/main.js`, `src/app.js`,
     `src/index.html`, menu wiring, or dependency changes).
   - Purpose: detect immediate startup crashes not visible from linting.
   - Full procedure and pass/fail criteria: `docs/12_startup_smoke_check.md`.

## Authoritative Workflow Before Broad Tests Exist

Use this order unless a prompt explicitly narrows scope:

1. `npm install`
2. `npm test`
3. `npm run smoke` only if startup behavior changed

Rationale:
- This repository does not yet have comprehensive automated tests for all
  critical paths.
- Lint + conditional smoke check is the current authoritative quality gate.

## Lint Baseline Strategy

Current baseline policy:
- Use **strict-fix now** for currently reported JSHint findings in tracked source files.
- Keep lint rules unchanged unless there is a documented reason to adjust them.
- Avoid broad stylistic rewrites; apply minimal behavior-safe edits.

If new lint debt appears but cannot be safely fixed in-scope:
- Create a follow-up issue documenting the exact findings.
- Record why deferral is necessary.
- Keep unrelated implementation work narrow and reviewable.

## Pass/Fail Expectations

| Check | Pass condition | Fail condition |
|---|---|---|
| `npm install` | exits 0 with dependencies installed | install error, lock/dependency resolution failure |
| `npm test` | exits 0 | JSHint reports one or more errors or command execution fails |
| `npm run smoke` (when required) | app process remains alive for check window (exit 0) | process exits prematurely or cannot start (exit 1) |

Overall validation pass criteria:
- Mandatory checks for all changes: `npm install`, `npm test`
- Additional mandatory check for startup-affecting changes: `npm run smoke`
- Required commands for the change type must all pass

## Prompt-Ready Usage

Prompt workflows should consume this command set directly:

- Implementation stage: run `npm test`; add `npm run smoke` when startup behavior
  changes
- Review stage: re-run `npm test` after review fixes
- Merge stage: verify `npm test` on the integration branch/default branch state

When a referenced validation task does not exist in the repository:
- State that explicitly in the checkpoint
- Continue with available authoritative commands from this contract

## Notes

- Keep commands cross-platform where possible; avoid shell-specific glob behavior.
- Revisit and expand this contract once a stable Jest/test harness baseline is
  adopted in the repository.
