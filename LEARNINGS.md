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

**Validation docs should not hardcode passing test counts**
Test suite totals change as coverage grows, and stale counts make validation instructions look broken even when the suite is green.
- Rule: In docs and prompts, say the full suite must pass instead of pinning an exact `N/N` unless the count is part of the thing being tested.

---

## Electron Context Isolation (Sprint 5 Migration)

**contextIsolation and nodeIntegration conflict**
Setting both `contextIsolation: true` and `nodeIntegration: true` in webPreferences causes "cannot assign to read-only property" errors when preload tries to attach bridges to the window object.
- Rule: In webPreferences, set `contextIsolation: true` and `nodeIntegration: false` (exclusive pair for security).

**Preload bridge exposure condition**
The preload bridge should check if `contextBridge.exposeInMainWorld` exists, not probe `process.contextIsolated` (the property may be inaccessible or unreliable in preload context).
- Rule: Use `if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') { contextBridge.exposeInMainWorld(...) }` pattern.
- Consequence: Remove fallback code that tries to `window.appBridge = ...` when context isolation is active (it will fail).

---

## PowerShell / Windows

**Electron cleanup: use `taskkill /T`, not `Stop-Process`**
npm on Windows creates a process tree; stopping only the parent leaves Electron child processes running.
- Rule: In smoke-check and supervision scripts, clean up with `taskkill /F /T /PID`.

---

## Drawing Canvas & Zoom

**Paper.js stroke scaling with zoom**
By default, Paper.js scales all stroke widths when the view zooms. For drawing apps, this makes lines appear thinner when zooming in and thicker when zooming out (opposite of visual expectation).
- Rule: Set `view.strokeScaling = false` in PaperScript initialization to keep strokes at consistent pixel size regardless of zoom level.
- Implementation: Added in [src/editor.ps.js](src/editor.ps.js#L13-L14) after `paper.settings` initialization.
- Test: Draw a line, zoom view fully in/out - stroke width should remain visually consistent.

**SVG naturalWidth is unstable across Chromium versions — use viewBox constants**
`$img[0].naturalWidth` for an SVG `<img>` without explicit `width`/`height` attributes returns
`300` (CSS default) in Chrome ≤ 66 and the SVG viewBox width in Chrome 84+.
PancakePainter used this as the zoom denominator in `syncViewToScale`, so upgrading Electron
produced a ~4.8× coordinate-space shift that corrupted cross-version `.pbp` geometry.
- Fix: expose `griddleSvgNaturalSize: { width: 1437.2, height: 758.8 }` in `getAppConstants()`
	and use it instead of `$griddle[0].naturalWidth/naturalHeight` in `app.js`.
- Migration: `getPBP()` stores `project.data.ppScaleDenominator`; `loadPBP()` scales layers
	when the saved denominator differs from the current one.  Legacy files (no metadata, all
	coordinates < 350 units) are auto-detected and scaled up by 1437.2 / 300.
- Test: `main.config.test.js` verifies the constant value, migration factor, and coordinate width.

**Electron beforeunload for unsaved changes**
Using `window.onbeforeunload` with `return checkFileStatus()` blocks window close even when the user doesn't want to save. The function must return `undefined` (or nothing) to allow close, not `true`.
- Rule: In `beforeunload`, call dialog handlers but return `undefined` to allow Electron's close event to proceed.
- Anti-pattern: `return true` or `return checkFileStatus()` when checkFileStatus returns boolean - this prevents close.
- Implementation: Modified [src/app.js](src/app.js#L896-L907) to allow close while still showing save dialog on unsaved changes.
- Test: Make unsaved changes, click X button - should show save dialog, then close successfully.

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

**Markdown tables: avoid leading double pipes**
Using `||` at row starts creates an unintended empty first column in many renderers and can misalign headings.
- Rule: Use standard table syntax with single `|` separators and verify alignment in GitHub preview.

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

**Modern Electron migration can stay startup-safe via `@electron/remote` as a temporary bridge**
Jumping to a supported Electron baseline before removing renderer `remote` calls can block startup unless compatibility is retained during transition.
- Rule: For staged migration slices, initialize `@electron/remote/main` in `src/main.js`, enable it per BrowserWindow, and register preload scaffolding before enforcing hardened isolation defaults.

**Preload bridge exposure must match isolation mode**
`contextBridge.exposeInMainWorld` is only valid under isolated contexts; calling it while `contextIsolation: false` can crash preload initialization.
- Rule: In preload scripts, gate `exposeInMainWorld` with `process.contextIsolated === true` and keep a `window.*Bridge` fallback during staged migrations.

**Context-isolated renderer migration needs bridge-backed state methods, not shared object references**
Passing mutable main-process objects such as settings stores through preload is unreliable once `contextIsolation` is enabled because the renderer sees a copied/proxied view rather than shared state.
- Rule: Expose explicit preload methods like `getSettings()`, `saveSettings()`, `resetSettings()`, and menu event subscriptions over IPC instead of mutating main-process objects directly from renderer code.

**Webview preload `require` shims must be explicit allowlists, never pass-through**
A pass-through shim (`return require(moduleName)`) restores broad Node/Electron access inside webview content and undermines IPC channel allowlists.
- Rule: In webview preload bridges, allow only known-safe module specifiers actually needed by the webview scripts and reject everything else with a hard error.

**Platform-specific module selection in tests must be deterministic**
Modules that branch on `process.platform` at require-time can make tests pass on one OS and fail on another.
- Rule: For Jest tests covering platform-gated modules, set `process.platform` before `require(...)`, restore it in `finally`, and `jest.resetModules()` to avoid cross-test leakage.

## Toolbar & CSS Sprites

**CSS sprite positioning requires CSS-driven background-position, not inline style assignments**
The original toolbar used background-position-x and background-position-y via CSS rules indexed by active tool and color state. When refactoring replaced this with inline background-size: 100% 400% and background-position: center top, the entire sprite (all 4 color variants stacked) displayed in each toolbar cell.
- Root cause: Inline styles override CSS specificity; removing the CSS class-based selector left only the envelope size.
- Rule: For color-change tools, use pure background-image in DOM and let CSS drivers handle background-position-x (active state) and background-position-y (color variant selection via parent class).

**i18n text lookups must include fallback strings when locales are incomplete**
The fill tool warning/error toasts displayed empty orange boxes when i18n returned the key itself or an empty string.
- Rule: Create a helper (key, fallback) that checks truthy return and defaults to fallback English text.
- Fallbacks: "Error creating fill.", "Cannot flood fill without at least one closed line.", "Cannot flood fill on top of an existing line.", "Flood fill out of bounds.", "Flood fill area is not closed."

**Flood-fill alpha threshold must be low for anti-aliased strokes**
Setting alphaBitmapThreshold to 150 means semi-transparent anti-aliased pixels at stroke edges are not included in the rasterized boundary grid, causing false "not closed" detection.
- Rule: Use alpha threshold 10-30 for hand-drawn shapes to catch anti-aliased edges.
- Implementation: Changed from 150 to 10 in tool.fill.js line 28.

**Flood-fill grid dimensions and boundary checks must use exclusive upper bounds**
The ndarray grid is allocated with shape [w, h] (indices 0 to w-1, 0 to h-1). Boundary checks must use >= instead of >.
- Grid: ndarray(..., [w, h])
- Check: if (x >= w || y >= h) return; (not x > w)

**Settings reset confirmation should reuse one native dialog path and include fallback text**
Duplicating reset confirmation logic across windows caused behavior drift (missing prompt, inconsistent button handling, and empty dialog text in some runtimes).
- Rule: Route export reset through `mainWindow.resetSettings()` and keep one native `MessageBox` flow.
- Rule: For all reset dialog strings (`message`, `detail`, button labels), provide fallback English text when `i18n.t(...)` returns empty or unresolved keys.

**`checkFileStatus` callback must only be invoked for async Save-As, not all sync paths**
When `checkFileStatus` was called unconditionally at the end for sync paths (DISCARD, existing save), passing `window.close` as the callback caused re-entrant `window.onbeforeunload` execution.
- Rule: `checkFileStatus` should return `true` for synchronous success without calling any callback. Callers must handle `true` return directly and pass a callback only for the async Save-As path.
- Implementation: Renamed param `callback` → `onAsyncComplete`; removed `if (callback) callback()` at function bottom; updated `file.open` and `file.new/close` switcher cases to call their action function directly when `checkFileStatus` returns `true`.

**JSHint `unused: strict` flags all unused function parameters, including leading ones before used params**
Parameter names that become unused after simplification (e.g., after removing a dead branch that referenced them) will produce lint errors.
- Rule: Either use the parameter or remove it from the signature. In JavaScript, callers can still pass extra args safely. Update all call sites and tests accordingly.

**JSHint `unused: strict` + `expr: false` means no `void expr;` to silence unused-param warnings**
The `expr: false` option forbids expression statements, so `void param;` is rejected as a suppressor.
- Rule: Remove unused parameters from the signature; update callers. Do not rely on `void` or standalone expression statements to suppress lint warnings.

**Custom renderer module loaders can break npm packages that depend on Node built-ins**
The staged renderer loader resolves package paths manually and failed on dependencies that expect native Node core modules (for example, `util`), causing startup ENOENT errors like `node_modules/util/index.js`.
- Rule: In renderer flows that run through a custom module resolver, avoid introducing heavy packages with deep Node dependency trees unless built-ins are explicitly handled by the resolver. Prefer existing renderer-safe helpers (for example, Paper.js raster/export utilities) for image pipeline tasks.

**Webview preload top-level `require()` fails in the simulator/webview sandbox**
The Electron webview/simulator sandbox cannot resolve either Node built-ins (`path`) or
relative module paths (`../ipc-channels.js`) via `require()` at the top level of a preload
script. This causes the entire preload to refuse to load, breaking the IPC bridge.
- Rule: Any `require()` at the top level of a webview preload that could run in a sandbox
  must be wrapped in a `try/catch`. For Node built-ins (`path`), set the result to `null`
  and activate a pure-JS fallback. For relative requires (channel registries), provide an
  inline copy of the same definitions as the catch fallback to keep channels in sync with
  the authoritative source without duplicating them in a non-guarded way.
- Rule: Use `nodePath.join.apply(nodePath, args)` when `nodePath` is available; otherwise
  use a pure-JS fallback that detects the separator from the first argument.
- Implementation: `src/preload/webview-preload.js` — try/catch on both `require('path')`
  and `require('../ipc-channels.js')` with matching fallbacks.

**IPC channel allowlist defined in the preload will drift from the shared registry**
A local `channels` object in `webview-preload.js` that mirrors `ipc-channels.js` has no enforcement link.
New channels added to `ipc-channels.js` will not be automatically allowed in the preload.
- Rule: In `webview-preload.js`, attempt `require('../ipc-channels.js')` first and keep the preload allowlist sourced from the shared registry in normal contexts.
- Rule: Only duplicate the object literal inside a guarded fallback for module-resolution failures in sandbox/webview contexts; rethrow unexpected require errors.

**Polling scripts should be parameterized, not duplicated per PR**
Creating a new `.ps1` file for each PR number results in identical scripts that must all be updated when the detection logic changes.
- Rule: Maintain one `poll-copilot-review.ps1` that accepts `-PrNumber` (and optionally `-Owner`, `-Repo`, `-MaxIterations`, `-IntervalSeconds`) as `param()` parameters. Remove all per-PR copies when consolidating.

**CSS `transform: translate(-50%, -50%)` requires both `left` and `top` to be set**
Removing `top: 50%` from a centred overlay while keeping `left: 50%` and `transform: translate(-50%, -50%)` causes the element to be positioned near the top of its parent instead of the centre.
- Rule: Check that both positioning axes are set whenever the translate centring pattern is used. A linter or visual regression test for centering is preferable to relying on human review only.

