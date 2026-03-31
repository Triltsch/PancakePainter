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

**Mock helper functions must be registered in global.paper by the factory**
gcode.js attaches `shapeFillPath`, `layerContainsCompoundPaths`, and `previewCam` to `global.paper` during factory invocation, and internal functions reference these helpers.
- Rule: In test setup, provide mock implementations of these functions on `global.paper` after factory invocation to prevent `TypeError` when internal code tries to call them.

**Paper.js project object must exist in mock to prevent undefined reference errors**
gcode.js internal helper functions reference `paper.project.activeLayer` as a fallback when layer is undefined.
- Rule: Always include `global.paper.project = { activeLayer: mockLayer }` in test setup, not just an empty object stub.

**Underscore.js mocking requires implementing only the subset of methods actually used**
gcode.js uses `_.isArray()`, `_.each()`, and `_.extend()` throughout, causing `ReferenceError: _ is not defined` if the module is tested without global `_`.
- Rule: Create a minimal `_` mock with only the methods the module calls. Avoid hauling in the full underscore.js library for unit tests.

**Paper-Lite path fixtures must calculate path length as cumulative segment distances, not Euclidean**
Mock paths use `length` property for preshutoff and travel-sort thresholds in gcode.js. Simple Euclidean distance from first to last point can underestimate path length for multi-segment paths.
- Rule: Calculate `length` as sum of distances between consecutive points: `sum of sqrt((p[i].x - p[i-1].x)^2 + (p[i].y - p[i-1].y)^2)`.

**File persistence tests should isolate dialog/UI boundaries from file logic**
Testing save/open directly through renderer menu handlers requires DOM and Electron remote setup, causing brittle tests that do not improve logic confidence.
- Rule: Keep save/open behavior in dependency-injected helpers (e.g. pass `fs`, `paper`, `toastr`, `i18n`, `currentFile`) and unit-test these helpers independently.

**Settings loading should parse user config from file contents, not `require()`**
Using `require(configPath)` caches parsed JSON and can hide runtime changes in repeated reads/tests.
- Rule: Parse config files with `JSON.parse(fs.readFileSync(path))` for predictable reload behavior and easier mocking.

**Graceful file-open failure should verify existence before load delegate**
Delegating directly to `paper.loadPBP(filePath)` without checking file readability obscures missing/unreadable path errors.
- Rule: For open flow unit boundaries, check `existsSync` and `readFileSync` first, then call parser/loader; catch and surface errors consistently.

**Undo helper can be tested with plain project/view stubs, no canvas runtime**
`helper.undo.js` state operations rely on `project.exportJSON/importJSON`, layer activation, and `view.update` calls, not on actual Paper.js rendering.
- Rule: Unit tests for undo should stub `paper.project`, `paper.view`, and selection helpers (`deselect/reselect/emptyProject`) with plain objects.

**Utility helper tests should mock top-level optional dependencies even when testing pure functions**
`helper.utils.js` requires modules like `electron-canvas-to-buffer`, `fs-plus`, and `progress-promise` at helper factory creation time.
- Rule: In Jest, mock these modules up front so pure utility function tests (`rgbToHex`, `colorStringToArray`, `fitScale`, etc.) remain isolated and runtime-agnostic.

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

**Canonical repository source has precedence over ambient context metadata**
Workspace or tool context can point to similarly named upstream forks and cause issue/PR operations in the wrong repository.
- Rule: Use `.github/copilot-instructions.md` repository URL as the hard canonical target for all `gh` and MCP owner/repo operations unless the user explicitly overrides it in the current turn.

**`gh pr view` JSON fields differ across GH CLI versions**
Some GH CLI builds do not support `--json reviewComments`, even though review data is available via other endpoints.
- Rule: For PR review discovery, use `gh pr view --json reviews,comments` plus `gh api repos/{owner}/{repo}/pulls/{number}/comments` (and GraphQL `reviewThreads` for `isResolved`/`isOutdated`) when `reviewComments` is unavailable.
