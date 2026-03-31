# 16 Renderer Compatibility Strategy

## Purpose

This document is the Sprint 4 output for US-403. It inventories renderer-side
main-process access paths and implicit global assumptions, categorizes their
risk under modern Electron isolation defaults, and defines compatibility steps
as issue-sized follow-up tasks for Sprint 5 execution.

The focus is the renderer process and webview processes. Main-process
changes and the preload bridge design are covered in
`docs/15_main_process_security_migration_plan.md` (US-402).

---

## Part 1: Renderer Context Overview

The PancakePainter renderer is not a single isolated script. It is a
coordinated group of JavaScript files that all run in the renderer process
(or a webview sub-process) and share state via globals and direct object
mutation:

| Context | Primary file(s) | How globals are shared |
|---|---|---|
| Main renderer window | `src/app.js` | Defines globals on `window.*`, attaches properties to `app` and `mainWindow` |
| PaperScript editor | `src/editor.ps.js` | Consumes `app`, `mainWindow`, `i18n`, `fs`, `path` globals via closure |
| Overlay window modules | `src/windows/window.autotrace.js`, `src/windows/window.export.js` | Loaded via `require()` inside `app.js`; inherit all renderer globals through shared scope |
| Autotrace webview | `src/autotrace.ps.js` | Runs in isolated webview; creates `window.app` and `window.ipc` via direct `require()` |
| Simulator/export webview | `src/simulator.ps.js` | Same pattern as autotrace webview |

Under `contextIsolation: true` and `nodeIntegration: false`, the global
sharing model breaks down. `require()` is unavailable in the renderer page
context, and objects assigned through `remote` no longer cross the
context boundary automatically.

---

## Part 2: Renderer Compatibility Risk Inventory

### R403-01 — Renderer-side library loading via `require()`

**File(s)**: `src/app.js`

**Pattern**:
```javascript
window.$ = window.jQuery = require('jquery');
window.toastr = require('toastr');
window._ = require('underscore');
var path = require('path');
```

**Risk**: With `nodeIntegration: false`, `require()` is not available in the
renderer page context. All four calls fail immediately on load, preventing the
entire renderer shell from initializing.

**Affected workflows**: All — app does not load.

**Compatibility step**: Load `jquery`, `toastr`, and `underscore` via `<script>`
tags in `src/index.html` (bundled or from a local `node_modules` path). Remove
their `require()` calls from `src/app.js`. The `path` module must be proxied
through the preload bridge (`appBridge.path.*`) or replaced with inline string
operations where usage is simple.

**Risk classification**: Critical blocker.

---

### R403-02 — Renderer direct `remote` access and `app` / `i18n` / `fs` acquisition

**File(s)**: `src/app.js`

**Pattern**:
```javascript
var remote = require('electron').remote;
var mainWindow = remote.getCurrentWindow();
var i18n = remote.require('i18next');
var app = remote.app;
var fs = remote.require('fs-plus');
```

**Downstream usage in `src/app.js`**:
- `app.constants` — read at startup for editor sizing and settings
- `app.settings.v`, `app.settings.save()` — settings read/write throughout
- `app.currentFile` — mutable object tracking current file state
- `app.menuClick` — callback defined on the remote app object
- `app.getPath('userDesktop')`, `app.getPath('temp')` — path resolution
- `app.getVersion()`, `app.getAppPath()` — app metadata
- `i18n.t()`, `i18n.translateElementsIn()` — all UI strings
- `fs.existsSync()`, `fs.readFileSync()` — overlay window HTML/JS loading

**Risk**: `remote` is removed in modern Electron core. All of the above fail
silently or throw at runtime. `app.currentFile` and `app.menuClick` are
mutable state attached to a main-process object, which is a synchronous
cross-process coupling pattern that does not work under isolation.

**Affected workflows**: All — app shell, file management, settings, menus.

**Compatibility step**: Replace all `remote` calls with the `appBridge` preload
surface (see US-402). Specifically:
- `app.getVersion()` → `window.appBridge.app.getVersion()`
- `app.getPath(name)` → `window.appBridge.app.getPath(name)`
- `app.constants` → `window.appBridge.app.constants` (snapshot)
- `app.settings.v` / `app.settings.save()` → `window.appBridge.app.settings.*`
- `app.currentFile` → local renderer state object, decoupled from main process
- `app.menuClick` → local function in renderer, subscribed via `window.appBridge.menu.onMenuClick()`
- `i18n.t()` → `window.appBridge.i18n.t()`
- `fs.*` → `window.appBridge.fs.*`

**Risk classification**: Critical blocker.

---

### R403-03 — `mainWindow` custom API surface

**File(s)**: `src/app.js`, `src/editor.ps.js`, `src/windows/window.export.js`

**Pattern**: `src/app.js` attaches a rich runtime API directly to
`mainWindow` (the object returned by `remote.getCurrentWindow()`):
```javascript
mainWindow.overlay = { ... };      // Modal window management
mainWindow.resetSettings = function() { ... };
mainWindow.editorPaperScope = ...; // PaperScript scope reference
mainWindow.dialog = function(opts, cb) { ... }; // Native dialog wrapper
```

These APIs are consumed in:
- `src/editor.ps.js`: `mainWindow.dialog(...)` for image import
- `src/windows/window.export.js`: `mainWindow.overlay.toggleWindow(...)`, `mainWindow.resetSettings()`
- `src/windows/window.autotrace.js`: `mainWindow.overlay.windows.*`, `mainWindow.overlay.toggleWindow(...)`
- Various places in `src/app.js`: `mainWindow.overlay.*`, `mainWindow.dialog(...)`

**Risk**: `remote.getCurrentWindow()` returns a proxy to the
`BrowserWindow` instance. Attaching properties to this proxy and reading
them back from the same renderer works today only because `remote` shares a
reference. Under modern Electron, `getCurrentWindow()` is unavailable and
mutating a BrowserWindow proxy object in the renderer is architecturally
unsound regardless.

**Affected workflows**: Dialog boxes, overlay window management, settings
reset, all open/save/export user flows.

**Compatibility step**: Replace `mainWindow.*` as a runtime registry with
a plain local module (`src/overlay.js`) that owns the overlay API, and
replace `mainWindow.dialog()` with explicit `ipcMain`/preload dialog bridge
calls. The `editorPaperScope` reference should become a local renderer-side
variable in `src/app.js`.

**Risk classification**: Critical blocker.

---

### R403-04 — Mutable state on main-process objects (`app.currentFile`, `app.menuClick`)

**File(s)**: `src/app.js`, `src/editor.ps.js`

**Pattern**:
```javascript
// app.js:
app.currentFile = { name: "", path: ..., changed: false };
app.menuClick = function(menu, callback) { ... };

// editor.ps.js:
app.currentFile.name = "";
app.currentFile.changed = true;
app.currentFile.path = filePath;
```

**Risk**: `app` is a main-process object accessed via `remote`. Mutating
properties on it (`app.currentFile.*`) works only because `remote` returns
live object proxies. Under any isolation model the mutation does not persist
across the process boundary. This is also an anti-pattern: main-process
`app` should not carry renderer-originated mutable file state.

**Affected workflows**: File open, save, close, new — all file change
tracking.

**Compatibility step**: Move `currentFile` state into a plain renderer-side
module (e.g., `src/state/file-state.js`). Pass state snapshots to main
process only when needed (e.g., for window title updates) via a dedicated
IPC message.

**Risk classification**: Critical — subtle runtime breakage under isolation,
no immediate crash but state mutations silently lost.

---

### R403-05 — PaperScript renderer globals (`src/editor.ps.js`)

**File(s)**: `src/editor.ps.js`

**Pattern**: The PaperScript file assumes the following globals are in scope,
all provided by `src/app.js` via the renderer shared context:
```
app         — remote.app proxy
mainWindow  — remote.getCurrentWindow() proxy
i18n        — remote.require('i18next')
fs          — remote.require('fs-plus')
path        — Node.js path module
toastr      — require('toastr')
_           — require('underscore')
```

**Specific usages**:
- `app.constants.pancakeShades` — palette colors
- `app.currentFile.*` — file state read/write
- `mainWindow.dialog(...)` — image import dialog
- `i18n.t(...)` — string translation
- `toastr.*` — notifications
- `fs.*` — not directly in editor.ps.js but used in helpers loaded by it
- `path` — loaded in helpers

**Risk**: If any of the above globals are undefined (due to
`nodeIntegration: false` or `remote` removal), the PaperScript module fails
to load or throws on first use. Because PaperScript is loaded via
`paper.PaperScript.load()` with no explicit dependency injection, errors
surface as opaque editor load failures.

**Affected workflows**: Core drawing editor — the entire editing surface
becomes non-functional.

**Compatibility step**: Provide the above globals explicitly through the
preload bridge and module restructuring (see R403-02 and R403-03). Consider
converting `editor.ps.js` from implicit global dependency to a factory
function that receives `app`, `mainWindow` equivalents as arguments, breaking
the implicit coupling. This is a Sprint 5 medium-priority refactor slice.

**Risk classification**: High — editor non-functional if globals are missing.

---

### R403-06 — Webview global exposure (`window.ipc`, `window.app`)

**File(s)**: `src/autotrace.ps.js`, `src/simulator.ps.js`

**Pattern**:
```javascript
// autotrace.ps.js:
var ipc = window.ipc = require('electron').ipcRenderer;
var remote = require('electron').remote;
var app = window.app = remote.app;

// simulator.ps.js:
var ipc = window.ipc = require('electron').ipcRenderer;
var remote = require('electron').remote;
var app = window.app = remote.app;
```

**Specific usages in autotrace.ps.js**:
- `app.getPath('temp')` — intermediary and trace BMP paths
- `app.constants.pancakeShades` — color snapping setup
- `ipc.on(channel, handler)` — receives `loadTraceImage`, `renderTrigger`, `pickColor`, `cleanup`
- `ipc.sendToHost(channel, data)` — sends `initLoaded`, `renderComplete`, `clonePreview`, `progress`, `colorPicked`

**Specific usages in simulator.ps.js**:
- `app.constants.printableArea` — print area bounds
- `ipc.on(channel, handler)` — receives `loadInit`, `renderTrigger`, `cleanup`
- `ipc.sendToHost(channel, data)` — sends `initLoaded`, `renderComplete`

**Risk**: Both webview processes use direct `require('electron')` calls.
With the webview `nodeintegration="true"` flag removed these calls fail
immediately. Additionally, globally exposing `window.app` and `window.ipc`
from inside the webview creates a broad attack surface if webview content
is ever compromised.

**Affected workflows**: Autotrace workflow (image load, render, color pick),
export/GCODE simulation workflow.

**Compatibility step**: Provide both `app` path/constants and `ipc`
channel access through the webview preload bridge (`webviewBridge`)
defined in US-402 Slice S5-F. Replace `window.app` and `window.ipc` global
assignments with scoped local references provided by the webview preload.

**Risk classification**: Critical — both overlay workflows (autotrace and
export) become non-functional.

---

### R403-07 — Overlay window modules inherit renderer globals

**File(s)**: `src/windows/window.autotrace.js`, `src/windows/window.export.js`

**Pattern**: These modules are loaded via `require()` inside `src/app.js`
and receive access to renderer globals through the shared scope comment at
the top of each file:
```javascript
/* globals window, $, path, app, mainWindow, i18n, _, paper */   // autotrace.js
/* globals window, mainWindow, app, $, paper, i18n, fs, toastr, path */  // export.js
```

**Specific usages in window.autotrace.js**:
- `path.join(app.getPath('temp'), ...)` — intermediary file path construction
- `mainWindow.overlay.toggleWindow(...)` — overlay dismiss
- `app` — passed into `require('jimp')` dependent workflows implicitly
- `paper.*` — access to current drawing layer for autotrace clone

**Specific usages in window.export.js**:
- `app.constants.*` — print area for GCODE config
- `app.getVersion()` — version string written to GCODE header
- `mainWindow.overlay.toggleWindow(...)` — cancel/close export window
- `mainWindow.resetSettings()` — settings reset trigger
- `paper.mainLayer.exportJSON()` — drawing data sent to simulator webview
- `fs.*`, `toastr.*` — file write and user notification

**Risk**: If any inherited global (`app`, `mainWindow`, `i18n`, `fs`,
`path`) is undefined or changed in shape due to migration, these modules
break silently because their dependencies are not declared as explicit
arguments. The `require()` loading of these modules is also blocked under
`nodeIntegration: false`.

**Affected workflows**: Export GCODE, autotrace import, settings reset.

**Compatibility step**: Refactor both modules to receive all required
dependencies as explicit constructor arguments (dependency injection pattern)
instead of relying on implicit globals. Replace `require()` load mechanism
with a bundler-friendly `<script>` tag approach for renderer context, or
keep `require()` in the preload-context helper only.

**Risk classification**: High — export and autotrace flows fail on missing
globals.

---

## Part 3: Critical Renderer Workflow Assumptions

The following workflow assumptions are tightly coupled to the current access
model and must be explicitly tracked during Sprint 5 migration. Any
regression in these paths is a Sprint 5 blocker.

| Assumption ID | Workflow | Assumption | Breaks When |
|---|---|---|---|
| WA-01 | App startup | `app.constants` and `app.settings.v` are populated before `initEditor()` runs | `remote.app` is unavailable; preload must snapshot constants at launch |
| WA-02 | File default path | `app.getPath('userDesktop')` resolves synchronously at module initialization | `appBridge.app.getPath()` must be synchronous or `currentFile.path` init deferred |
| WA-03 | Editor load | `mainWindow.editorPaperScope` is written by `app.js` and read by the editor module | Must become a local renderer variable, not a `BrowserWindow` property |
| WA-04 | Image import dialog | `mainWindow.dialog()` is called synchronously and returns the dialog result | All Electron dialogs are async post-isolation; dialog wrapper must return a Promise |
| WA-05 | Settings change | `app.settings.v[key] = value; app.settings.save()` mutates and persists in one call | Settings must route through `appBridge.app.settings.set(key, value)` which uses async IPC |
| WA-06 | File dirty state | `app.currentFile.changed = true` is set from `editor.ps.js` and read in `app.js` | After moving `currentFile` to renderer state, both files must reference the same local module |
| WA-07 | Autotrace image pipeline | `app.getPath('temp')` is used for intermediary files in both host and webview contexts | Both contexts must get the same temp path; webview preload must receive it at init |
| WA-08 | GCODE version stamp | `app.getVersion()` is called in `window.export.js` when building render config | Must be available synchronously at render config init; preload bridge should cache it |
| WA-09 | Overlay initialization | `mainWindow.overlay.initWindows()` loads HTML and JS via `fs.existsSync` + `require` | Must move to a pure DOM-based or bundled loading strategy not dependent on `fs` |
| WA-10 | Menu click dispatch | `app.menuClick(key)` is called by menu handlers; the function is defined on the renderer-side | After moving to IPC-based dispatch, the function must be wired before any menu event fires |

---

## Part 4: Issue-Sized Follow-Up Tasks for Sprint 5

The following tasks are ready to be created as individual GitHub issues for
Sprint 5. Each is self-contained and maps to one or more compatibility risks
above.

### Task T403-01 — Load renderer libraries via script tags

**Addresses**: R403-01  
**Description**: Remove `require('jquery')`, `require('toastr')`, and
`require('underscore')` from `src/app.js`. Add corresponding `<script>` tags
in `src/index.html` pointing to the bundled or local `node_modules` paths.
Verify `window.$`, `window.toastr`, and `window._` are available before
`src/app.js` initialization runs.  
**Estimate**: S  
**Dependency**: None; can start immediately.

---

### Task T403-02 — Extract renderer file state to local module

**Addresses**: R403-04, WA-06  
**Description**: Create `src/state/file-state.js` exporting a plain
`currentFile` object (`{ name, path, changed }`). Remove `app.currentFile`
assignment from `src/app.js`. Update `editor.ps.js` and all references in
`src/app.js` to use the local module. Emit an IPC notification to main process
when `changed` transitions to `true` (for window title updates if needed).  
**Estimate**: S  
**Dependency**: None; can start in parallel with T403-01.

---

### Task T403-03 — Replace `mainWindow.overlay` with a local overlay module

**Addresses**: R403-03, WA-03, WA-09  
**Description**: Create `src/overlay.js` that owns the window list, toggle
logic, and frosted glass effect. Remove `mainWindow.overlay = {...}` from
`src/app.js`. Update all callers (`editor.ps.js`, `window.autotrace.js`,
`window.export.js`) to import from the new module. Move
`mainWindow.editorPaperScope` to a local renderer variable in `app.js`.  
**Estimate**: M  
**Dependency**: T403-02 (shared state decoupling helps isolate this module).

---

### Task T403-04 — Replace `mainWindow.dialog()` with async dialog bridge

**Addresses**: R403-03, WA-04  
**Description**: Define a dialog bridge function in the preload
(`appBridge.dialog.showOpenDialog`, `appBridge.dialog.showSaveDialog`,
`appBridge.dialog.showMessageBox`) that returns Promises. Replace all
synchronous `mainWindow.dialog({t: ...})` calls in `src/app.js` and
`src/editor.ps.js` with `await appBridge.dialog.*()` calls. Adjust callers
that consumed a synchronous return value (`checkFileStatus`,
`mainWindow.resetSettings`) to use async/callback patterns.  
**Estimate**: M  
**Dependency**: Preload bridge from US-402 Slice S5-A must exist.

---

### Task T403-05 — Replace `remote`-bound `app` globals with preload bridge

**Addresses**: R403-02, WA-01, WA-02, WA-05, WA-08, WA-10  
**Description**: Replace all `remote.*` calls in `src/app.js` and
`src/windows/window.export.js` with `window.appBridge.*` equivalents. Remove
the `var remote` declaration. Move `app.menuClick` definition to a local
renderer function triggered by `appBridge.menu.onMenuClick()`. Use
`appBridge.app.settings.get/set()` for settings I/O. Cache `getVersion()` and
`constants` from preload at startup.  
**Estimate**: L  
**Dependency**: US-402 Slice S5-D (hardened `webPreferences` must be active).

---

### Task T403-06 — Inject dependencies explicitly into overlay window modules

**Addresses**: R403-07  
**Description**: Refactor `window.autotrace.js` and `window.export.js` to
accept all required dependencies (`app`, `fs`, `path`, `i18n`, `paper`,
`mainWindow` equivalents) as constructor arguments rather than relying on
implicit globals. Update `src/app.js` to pass the required values when it
calls `require(jsFile)(context)`. This makes the modules testable in
isolation and removes the hidden global coupling.  
**Estimate**: M  
**Dependency**: T403-03 (overlay module must exist), T403-05
(preload-provided app object must be the source).

---

### Task T403-07 — Migrate `editor.ps.js` global dependencies

**Addresses**: R403-05, WA-06  
**Description**: Audit and replace each implicit global consumed by
`editor.ps.js`: `app.constants` → snapshot from preload; `app.currentFile` →
local file-state module (T403-02); `mainWindow.dialog` → async dialog bridge
(T403-04); `i18n.t()` → preload bridge. Add an explicit initialization
callback pattern so editor globals are guaranteed populated before
`paper.PaperScript.load()` is called.  
**Estimate**: M  
**Dependency**: T403-02, T403-04, T403-05.

---

### Task T403-08 — Migrate webview processes to webview preload bridge

**Addresses**: R403-06, WA-07  
**Description**: Replace `require('electron').remote.app` and `window.app`
assignments in `src/autotrace.ps.js` and `src/simulator.ps.js` with
`window.webviewBridge.app.*`. Replace raw `require('electron').ipcRenderer`
and `window.ipc` assignments with `window.webviewBridge.ipc.*`. Remove
permissive webview flags and add the `preload` attribute per US-402
Slice S5-F.  
**Estimate**: M  
**Dependency**: US-402 Slice S5-F (webview preload must be implemented first).

---

## Part 5: Renderer Compatibility Risk Summary

| ID | File(s) | Risk Level | Affected Workflows | Follow-Up Task |
|---|---|---|---|---|
| R403-01 | `src/app.js` | Critical | All (app does not load) | T403-01 |
| R403-02 | `src/app.js` | Critical | All (app shell, file, settings, menus) | T403-05 |
| R403-03 | `src/app.js`, `editor.ps.js`, `window.export.js` | Critical | Dialogs, overlay, settings reset | T403-03, T403-04 |
| R403-04 | `src/app.js`, `editor.ps.js` | High | File open/save/close/new, all dirty-state tracking | T403-02 |
| R403-05 | `src/editor.ps.js` | High | Core drawing editor | T403-07 |
| R403-06 | `src/autotrace.ps.js`, `src/simulator.ps.js` | Critical | Autotrace workflow, export/simulation workflow | T403-08 |
| R403-07 | `src/windows/window.autotrace.js`, `src/windows/window.export.js` | High | Export GCODE, autotrace import, settings reset | T403-06 |

**Critical blockers**: R403-01, R403-02, R403-03, R403-06 — must be resolved
before any migration release is usable.

**High-severity items**: R403-04, R403-05, R403-07 — cause targeted workflow
failures; must be resolved before each affected feature is validated in Sprint
5.

---

## Out of Scope

- Implementing any of the compatibility changes (Sprint 5 execution work)
- Selecting a module bundler for renderer library loading
- Adding automated test coverage for overlay and window modules (deferred to
  a later testing story)
- API design of `appBridge` and `webviewBridge` (defined in US-402)
