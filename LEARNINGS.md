# LEARNINGS

This file is mandatory for the pancake agent workflow.

## Purpose

- Capture implementation and review learnings that prevent repeated mistakes.
- Preserve repository-specific constraints for future agent runs.

## Entry Format

Use this template for each new entry:

### YYYY-MM-DD - Short Title

- Context: What was being changed.
- Problem: What failed or was risky.
- Resolution: What fixed it.
- Rule: What to do next time.
- Affected files: List the key files.

## Entries

### 2026-03-28 - Repository-Native Prompt Contract Baseline

- Context: Sprint 1 Phase 0 alignment of agent prompts and workflow contracts.
- Problem: Prompts contained non-repo-native assumptions (Docker, Redis, PostgreSQL, pytest, Test: Verified task) that do not exist in this repository.
- Resolution: Replaced those assumptions with repository-native validation guidance and documented the contract in docs.
- Rule: Keep validation requirements tied to commands and tasks that exist in this repository.
- Affected files: .github/prompts/01_pancake_implement.prompt.md, .github/prompts/03_pancake_review.prompt.md, .github/agents/pancake-orchestrator.agent.md, .github/agents/mcp-pr-review.agent.md, docs/09_prompt_contract_audit.md.

### 2026-03-28 - PowerShell-Safe Validation Command

- Context: Commit-time validation for Sprint 1 prompt contract alignment.
- Problem: The original npm test script relied on shell glob expansion and failed in PowerShell before JSHint could lint the repository.
- Resolution: Replaced the glob-based JSHint invocation with directory-based arguments that work cross-platform.
- Rule: Prefer cross-platform npm scripts that do not depend on shell-specific glob expansion.
- Affected files: package.json, docs/09_prompt_contract_audit.md.

### 2026-03-28 - JSHint Lint Baseline Cleanup

- Context: Issue #5 — fix all JSHint violations left in legacy source files so `npm test` exits cleanly (exit 0).
- Problem: 15 JSHint warnings across 5 files: unused globals in `/* globals */` comments, camelCase violations (`user_config`), duplicate loop variable declarations (`i`), unused `require()` assignments, and line-length violations that exceeded the configured JSHint `maxlen` (80 chars).
- Resolution: Minimal behaviour-safe edits only — removed unused globals from JSHint directive comments, renamed variable to camelCase, changed second loop counter to avoid redeclaration, removed unused `require` calls, wrapped long lines at logical operators or call sites.
- Rule: When fixing JSHint violations, change only what JSHint flags; do not refactor surrounding code. Verify with `npm test` after each file change to catch cascading failures early.
- Affected files: src/app.js, src/editor.ps.js, src/gcode.js, src/main.js, src/squirrel-update.js, docs/10_validation_contract.md.

### 2026-03-28 - Specialized Agent Role Catalog

- Context: Issue #3 (US-104) — define missing specialized agent roles for Option A refactoring epics.
- Problem: Large roadmap tasks (Electron upgrade, test bootstrap, modularization, dependency modernization) had no designated agent boundary, making sprint decomposition ambiguous.
- Resolution: Produced a role catalog (`docs/11_agent_role_catalog.md`) with four roles: pancake-electron-upgrader, pancake-test-bootstrapper, pancake-modularizer, pancake-dependency-modernizer. Each role has defined purpose, boundaries, inputs, outputs, and failure guard rails.
- Rule: Research/documentation issues produce catalog or design docs only — do not create `.agent.md` agent definition files until the role's activation sprint. Keep role boundaries single-concern.
- Affected files: docs/11_agent_role_catalog.md, LEARNINGS.md.

### 2026-03-29 - Authoritative Validation Order

- Context: Issue #4 (US-102) — define repository-native validation contract used by prompts and manual workflows.
- Problem: Validation guidance existed but did not clearly define authoritative command order and conditional smoke-check requirements before broader automated tests exist.
- Resolution: Updated `docs/10_validation_contract.md` with explicit command authority, ordered workflow (`npm install` -> `npm test` -> conditional `npm start`), pass/fail matrix, and prompt-ready usage guidance.
- Rule: Treat `npm install` + `npm test` as mandatory baseline checks; run `npm start` only for startup-affecting changes and document that decision in stage checkpoints.
- Affected files: docs/10_validation_contract.md, LEARNINGS.md.

### 2026-03-29 - Markdown Nested List Reliability In PR Docs

- Context: PR #10 Copilot review feedback on `docs/10_validation_contract.md`.
- Problem: Numbered-list sub-bullets used two-space indentation, which can render inconsistently as non-nested lists in CommonMark/GitHub Markdown.
- Resolution: Increased indentation for sub-bullets and wrapped lines under numbered items to preserve stable nesting.
- Rule: In numbered Markdown lists, indent nested bullets and continuation lines at least three spaces beyond the list marker for reliable renderer behavior.
- Affected files: docs/10_validation_contract.md, LEARNINGS.md.

### 2026-03-29 - Startup Smoke Check Process Supervision on Windows

- Context: Issue #11 (US-201) required a repeatable startup smoke check for the Electron app.
- Problem: Launching with npm on Windows creates a process tree where only killing the parent can leave child Electron processes running.
- Resolution: Added a PowerShell smoke script that starts `npm start`, monitors process liveness for a fixed window, and always cleans up with `taskkill /F /T /PID`.
- Rule: For Electron smoke checks started through npm on Windows, prefer `taskkill /T` over `Stop-Process` to avoid orphaned child processes.
- Affected files: scripts/smoke-test.ps1, package.json, docs/12_startup_smoke_check.md, docs/10_validation_contract.md.
