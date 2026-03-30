# LEARNINGS

> Actionable rules for PancakePainter development and agent workflows.
> Add new entries at the bottom of the relevant domain section.

---

## Validation & npm Scripts

**Repo-native validation only**
Prompts and agents contain non-repo-native assumptions (Docker, pytest, etc.) that silently break CI.
- Rule: Reference only commands that exist in this repository: `npm install`, `npm test`, `npm run smoke`. No external tool assumptions.

**JSHint: use directory args, not shell globs**
Shell glob patterns (`src/**/*.js`) break in PowerShell before JSHint runs.
- Rule: Use directory arguments (`jshint src menus --exclude src/libs,node_modules`), not glob patterns, in npm scripts.

**JSHint fixes: minimal, targeted edits**
Refactoring surrounding code while fixing lint violations risks introducing new failures.
- Rule: Change only what JSHint flags. Run `npm test` after each individual file change.

**Mandatory validation order**
Skipping `npm install` causes false-positive test passes on a stale dependency tree.
- Rule: Always run `npm install` → `npm test` (lint + jest). Run `npm run smoke` only for startup-affecting changes; document the decision in the stage checkpoint.

---

## PowerShell / Windows

**Electron cleanup: use `taskkill /T`, not `Stop-Process`**
npm on Windows creates a process tree; stopping only the parent leaves Electron child processes running.
- Rule: In smoke-check and supervision scripts, clean up with `taskkill /F /T /PID`.

**`$ErrorActionPreference = 'Stop'` makes `Write-Error` terminate before `exit`**
`Write-Error` throws an unhandled exception under `Stop` preference, bypassing the intended `exit 1` and producing a verbose trace instead of a clean message.
- Rule: Use `Write-Host -ForegroundColor Red` for user-facing error output in scripts with `$ErrorActionPreference = 'Stop'`. Reserve `Write-Error` only when a terminating caller exception is the intended behaviour.

---

## Testing (Jest)

**PancakePainter modules assign to `global.paper` at factory invocation time**
`gcode.js` (and similar modules) write helpers onto `paper` in the factory body — not inside the returned renderer — causing `ReferenceError: paper is not defined` on any `gcodeFactory()` call in tests.
- Rule: Before writing tests for any module, `grep` it for `paper.` at the top-level factory scope. If assignments exist at invocation time, add `beforeEach(() => { global.paper = {}; })` / `afterEach(() => { delete global.paper; })`. Full Paper.js mock is deferred to US-203.

**Paper.js testing boundary should use three levels, not one universal mock**
Trying to use one mock for all Paper-dependent behavior either over-mocks geometry (false confidence) or drags canvas runtime into unit tests (slow, brittle).
- Rule: Use Level 0 (factory contract with `global.paper` stub) and Level 1 (Paper-Lite fixtures for business logic) in unit tests; reserve geometry semantics (`CompoundPath`, clipping/transforms) for a separate integration-level runtime suite.

---

## Documentation / Markdown

**Numbered-list nesting: indent ≥3 spaces**
Two-space indentation on sub-bullets renders as flat lists in CommonMark/GitHub Markdown.
- Rule: Indent nested bullets and continuation lines at least three spaces beyond the parent list marker.

**Renaming a command in docs: remove the old name everywhere**
Adding a corrected line without removing the old one leaves contradictory guidance in the same file.
- Rule: When renaming any command or script reference in docs, search the entire file for the old name before committing.

---

## Agent Tooling

**Agent role files: catalog doc first, `.agent.md` only at activation sprint**
Creating agent definition files before a role is active adds unmaintained files and ambiguous sprint scope.
- Rule: Research and documentation issues produce catalog or design docs only (`docs/`). Do not create `.agent.md` files until the role's activation sprint; keep each role boundary single-concern.

**JSON config edits: verify on disk, not in the VS Code buffer**
`replace_string_in_file` and `multi_replace_string_in_file` may update the in-memory buffer without flushing to disk; terminal commands and `npm run` read the stale on-disk version.
- Rule: After editing any JSON config file (e.g., `package.json`), run `node -e "require('./package.json')"` in a terminal to confirm the change was persisted before proceeding.
