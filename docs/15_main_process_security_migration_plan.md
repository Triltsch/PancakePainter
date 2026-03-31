# 15 Main-Process Security Migration Plan

## Purpose

This document is the Sprint 4 output for US-402. It translates the US-401
breaking-change inventory (`docs/14_electron_breaking_change_inventory.md`)
into a concrete, implementation-ready security migration plan for the Electron
main-process upgrade in Sprint 5.

The plan covers:

- required runtime changes to enforce context isolation and disable direct
  Node integration in renderer processes
- a module-level map of all code surfaces that must change and their preload
  bridge touchpoints
- a sequenced set of implementation slices for Sprint 5 execution

---

## Part 1: Required Runtime Changes

### 1.1 Context Isolation

**Current state**: `contextIsolation` is not set in any `BrowserWindow`
`webPreferences`. In legacy Electron, this defaults to `false`, which allows
renderer code to access Electron and Node APIs directly and share the same
JavaScript context as any injected preload script.

**Required change**: Set `contextIsolation: true` in all `BrowserWindow`
instances. This enforces a hard boundary between the preload script context
and the renderer page context. All shared data must be explicitly bridged via
Electron's `contextBridge.exposeInMainWorld()` API.

**Impact**: Any renderer code that calls `require()`, accesses
`process`, or manipulates Node APIs directly will break. This includes:

- `src/app.js` — direct `require('electron').remote` usage
- `menus/menu-init.js` — `remote.Menu`, `remote.require('i18next')`
- `src/autotrace.ps.js` — `require('electron').ipcRenderer`, `remote.app`
- `src/simulator.ps.js` — `require('electron').ipcRenderer`, `remote.app`
- `src/helpers/helper.autotrace.js` — `require('electron').remote.app`

**Mitigation strategy**: Introduce a preload script that bridges the
required APIs via `contextBridge`. Renderer code switches from `require()`
to the bridged `window.appBridge.*` API surface.

---

### 1.2 Node Integration

**Current state**: `nodeIntegration` is not set in any `BrowserWindow`
instance, defaulting to `true` in legacy Electron. This allows all renderer
code to call `require()` for any installed Node module.

**Required change**: Set `nodeIntegration: false` in all `BrowserWindow`
instances. This prevents the renderer from calling `require()` directly.
All Node functionality needed in renderer context must be exposed through
bounded preload APIs.

**Impact**: Renderer code using Node modules must be refactored or proxied:

- `src/app.js` — `require('jquery')`, `require('toastr')`,
  `require('underscore')`, `require('path')`
- `src/app.js` — `require('./helpers/helper.file-io')`
- `src/windows/window.autotrace.js` — `require('jimp')`
- Webview processes (`src/autotrace.ps.js`, `src/simulator.ps.js`) —
  require entire Node dependency tree through webview-specific preloads

**Mitigation strategy**: Renderer-side libraries (`jquery`, `toastr`,
`underscore`) should be loaded through script tags or a bundler. Privileged
operations (`fs`, `path`, `app` metadata) are exposed exclusively through
the preload bridge.

---

### 1.3 Remote Module Removal

**Current state**: `remote` is used to access main-process objects from
renderer code: `remote.app`, `remote.require(...)`, `remote.BrowserWindow`,
and `remote.Menu`.

**Required change**: The `remote` module must be completely eliminated.
Modern Electron has removed it from core. The recommended migration is an
explicit IPC contract and preload bridge; `@electron/remote` is acceptable
only as a short-lived compatibility shim during a phased rollout.

**Impact**: All six hotspots in the US-401 inventory are affected. This is
the most pervasive breaking change in the codebase.

---

### 1.4 Webview Security Flags

**Current state**: Both overlay webviews use `nodeintegration="true"` and
`disablewebsecurity="true"` as HTML attributes.

**Required change**: Remove both flags. Node access within the webview
process must go through a webview-specific preload script. The
`disablewebsecurity` flag must not be carried forward; cross-origin access
requirements must be resolved with explicit CORS configuration or content
served from the same origin.

**Impact**:

- `src/windows/window.autotrace.html` — webview must transition to preload
  and lose direct Node/Electron access
- `src/windows/window.export.html` — same requirement

---

## Part 2: Affected Module and Preload Touchpoint Map

The following table maps every affected module to its migration category and
the preload surface that replaces its current dependency. Modules marked
**Main Preload** transition through the main window preload script; those
marked **Webview Preload** transition through a dedicated webview preload.

| Module | Remote / Node pattern | Migration category | Preload exposure required |
|---|---|---|---|
| `src/main.js` | BrowserWindow without `webPreferences` | BrowserWindow hardening | Set `contextIsolation: true`, `nodeIntegration: false`, `preload: path` |
| `src/app.js` | `remote.app`, `remote.require('i18next')`, `remote.require('fs-plus')`, `remote.getCurrentWindow()` | Main Preload | `appBridge.app.getVersion()`, `appBridge.app.getPath()`, `appBridge.app.constants`, `appBridge.app.settings.*`, `appBridge.i18n.t()`, `appBridge.fs.*`, `appBridge.window.*` |
| `src/app.js` | `require('../menus/menu-init')(app)` | Main-process ownership | Move menu initialization to `src/main.js`; expose menu-click event signal via `appBridge.menu.onMenuClick(cb)` |
| `menus/menu-init.js` | `remote.Menu`, `remote.require('i18next')` | Main-process ownership | Execute entirely from `src/main.js` after IPC is available; remove renderer-side call |
| `menus/menu-darwin.js` | Platform menu template | Main-process ownership | No preload needed; menu is built and applied in main process |
| `menus/menu-win32.js` | Platform menu template | Main-process ownership | No preload needed; menu is built and applied in main process |
| `src/helpers/helper.autotrace.js` | `require('electron').remote.app` | Main Preload | Receive `app` paths via argument injection from caller, removing internal `remote` coupling |
| `src/autotrace.ps.js` (webview) | `remote.app`, `require('electron').ipcRenderer` | Webview Preload | `webviewBridge.app.getPath()`, keep `ipcRenderer.on/sendToHost` via webview preload |
| `src/simulator.ps.js` (webview) | `remote.app`, `require('electron').ipcRenderer` | Webview Preload | `webviewBridge.app.constants`, keep IPC channels via webview preload |
| `src/windows/window.autotrace.js` (host) | `wv.send(channel, data)`, `wv.addEventListener('ipc-message', ...)` | IPC channel registry | IPC channel names must be declared in a shared constant module; host-side API unchanged but should validate all channel names against registry |
| `src/windows/window.export.js` (host) | `wv.send(channel, data)`, `wv.addEventListener('ipc-message', ...)` | IPC channel registry | Same as above |
| `src/windows/window.autotrace.html` | `<webview nodeintegration="true" disablewebsecurity="true">` | Webview hardening | Remove flags; set `preload="path/to/webview-preload.js"` attribute |
| `src/windows/window.export.html` | `<webview nodeintegration="true" disablewebsecurity="true">` | Webview hardening | Remove flags; set `preload="path/to/webview-preload.js"` attribute |

---

## Part 3: Preload Bridge Design

### 3.1 Main Window Preload — `src/preload/main-preload.js`

This preload runs in the main window context with Node access and exposes a
bounded API surface via `contextBridge.exposeInMainWorld('appBridge', {...})`.

Required API surface:

```
appBridge
├── app
│    ├── getVersion()            → app.getVersion()
│    ├── getPath(name)           → app.getPath(name)   [restricted to: temp, userData, userDesktop]
│    ├── constants               → main-process read-only constant snapshot
│    └── settings
│         ├── get(key)           → read from settings store
│         └── set(key, val)      → write to settings store via IPC
├── window
│    ├── minimize()
│    ├── close()
│    └── onClose(cb)             → subscribe to close event
├── fs
│    ├── readFile(path, enc)
│    ├── writeFile(path, data)
│    ├── existsSync(path)
│    └── readdir(path)
├── i18n
│    └── t(key, vars)            → translates a key using main-process i18n
├── menu
│    └── onMenuClick(cb)         → subscribe to menu click events from main
└── dialog
     ├── showOpenDialog(opts)
     └── showSaveDialog(opts)
```

**Security constraints**:
- `getPath` must accept only a whitelist of known Electron path names.
- `fs` must restrict accessible paths; apply a path-prefix allowlist covering
  `userData`, `temp`, and user Desktop.
- No callback or module reference from renderer code enters main-process scope.

---

### 3.2 Webview Preload — `src/preload/webview-preload.js`

Webview processes (`autotrace.ps.js`, `simulator.ps.js`) require IPC access
and a small subset of `app` paths. The webview preload script runs with Node
access inside the webview process, and exposes a scoped bridge.

Required API surface:

```
webviewBridge
├── app
│    ├── getPath(name)           → restricted to: temp
│    └── constants               → read-only snapshot passed from host at init
└── ipc
     ├── on(channel, handler)    → validated against channel registry
     └── sendToHost(channel, data) → validated against channel registry
```

**IPC channel registry** (`src/ipc-channels.js`):

All channel names must be declared in a shared module to eliminate string
literals scattered across host and webview code. Example registry:

```javascript
module.exports = {
  autotrace: {
    IN:  ['loadTraceImage', 'renderTrigger', 'pickColor', 'cleanup'],
    OUT: ['initLoaded', 'renderComplete', 'clonePreview', 'progress', 'colorPicked'],
  },
  export: {
    IN:  ['loadInit', 'renderTrigger', 'cleanup'],
    OUT: ['initLoaded', 'renderComplete'],
  },
};
```

---

## Part 4: Staged Migration Sequence for Sprint 5

The following slices are sized for individual issues and can be executed in
parallel where dependencies allow. The sequencing minimizes regression risk
by establishing the preload infrastructure before removing legacy `remote`
usage.

### Slice S5-A — Foundation: preload scaffolding and IPC channel registry
*(No functional changes; purely additive)*

1. Create `src/preload/main-preload.js` with the full `appBridge` surface.
   Leave current `remote` usage in place; test that preload loads cleanly.
2. Create `src/preload/webview-preload.js` with scoped `webviewBridge` surface.
3. Create `src/ipc-channels.js` with the channel registry for autotrace and
   export workflows.
4. Register the preload in `src/main.js` `webPreferences` without yet switching
   `contextIsolation` or `nodeIntegration` flags (allows dual-path testing).
5. Validation: `npm test` green; smoke check — app starts without errors.

---

### Slice S5-B — Main renderer: migrate `src/app.js` off `remote`
*(Depends on S5-A)*

1. Replace all `remote.app.*` calls with `window.appBridge.app.*`.
2. Replace `remote.require('i18next')` with `window.appBridge.i18n.t()`.
3. Replace `remote.require('fs-plus')` with `window.appBridge.fs.*`.
4. Replace `remote.getCurrentWindow()` with `window.appBridge.window.*`.
5. Remove the `require('../menus/menu-init')(app)` call from `src/app.js`.
6. Validation: `npm test` green; smoke check — editor loads and file open/save
   works.

---

### Slice S5-C — Menus: move initialization to main process
*(Depends on S5-A; can run parallel with S5-B)*

1. Move `require('../menus/menu-init')(app)` call into `src/main.js`,
   executed after `app.ready` and i18n initialization.
2. Replace menu click dispatch to renderer with an IPC message:
   `mainWindow.webContents.send('menu:click', key)`.
3. In `src/app.js`, subscribe to menu clicks via
   `window.appBridge.menu.onMenuClick(key => app.menuClick(key))`.
4. Remove `remote.Menu` and `remote.require('i18next')` from `menus/menu-init.js`.
5. Validation: `npm test` green; smoke check — all menu items trigger correctly
   on Windows and macOS.

---

### Slice S5-D — Enable hardened `webPreferences` in main window
*(Depends on S5-B and S5-C)*

1. Update `BrowserWindow` creation in `src/main.js` to set:
   ```javascript
   webPreferences: {
     contextIsolation: true,
     nodeIntegration: false,
     nodeIntegrationInSubFrames: false,
     sandbox: false,       // Preload needs Node; sandbox to be evaluated post-migration
     preload: path.join(__dirname, 'preload', 'main-preload.js'),
   }
   ```
2. Remove any remaining `remote` usage from all main-window renderer files.
3. Validation: `npm test` green; smoke check — full editor workflow (open,
   draw, undo, autotrace, export) must stay functional.

---

### Slice S5-E — Helpers: decouple `helper.autotrace.js` from `remote`
*(Can run parallel with S5-B)*

1. Replace `require('electron').remote.app` with an injected `appPaths`
   argument passed from the calling context (already has access to
   `appBridge.app.getPath()`).
2. Update callers to pass the required path values explicitly.
3. Validation: `npm test` green.

---

### Slice S5-F — Webview processes: migrate to webview preload
*(Depends on S5-A; can run in parallel with S5-D)*

1. Add `preload` attribute to webview tags in
   `src/windows/window.autotrace.html` and `src/windows/window.export.html`,
   pointing to the built/compiled webview preload path.
2. Remove `nodeintegration="true"` and `disablewebsecurity="true"` from both
   webview tags.
3. Replace `require('electron').remote.app` in `src/autotrace.ps.js` and
   `src/simulator.ps.js` with `window.webviewBridge.app.*`.
4. Replace raw `require('electron').ipcRenderer` with
   `window.webviewBridge.ipc.*`, validated against the channel registry.
5. Validation: autotrace workflow (image load → render → clone) and export
   workflow (GCODE generation + preview) must complete without errors.

---

### Slice S5-G — Regression and validation pass
*(Depends on all above slices)*

1. Full smoke check: app startup, editor load, drawing, undo, autotrace,
   export, settings persistence.
2. Run `npm test`; confirm 49/49 green.
3. Any regressions found here trigger targeted fixup issues before close.

---

## Part 5: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Preload path not resolved at runtime (packaged build) | Medium | High | Use `path.join(__dirname, ...)` relative to preload file location; verify in packaged build |
| IPC channel mismatch between host and webview after registry introduction | Low | Medium | Registry validation at `on()` and `sendToHost()` boundaries; throw on unregistered channel in development |
| `helper.autotrace.js` path injection breaks callers | Low | Low | Pass paths explicitly; keep existing signature for backward compatibility until all callers updated |
| Webview CORS issues after removing `disablewebsecurity` | High | Medium | Webview content is file-protocol and local; verify content origin; document any cross-origin fetch needs |
| `contextBridge` structured-clone limits (no function or class instance crossing) | Medium | Medium | Values crossing the `contextBridge` boundary must be structured-cloneable (no functions, DOM nodes, class instances). Keep preload APIs plain-data for args/returns, and use wrapper patterns like `onClose(cb)` / `onMenuClick(cb)` where the renderer callback stays in renderer scope and preload wires IPC events to that callback. |
| Regression in platform-specific menu behavior | Low | Medium | Validate both `menu-darwin.js` and `menu-win32.js` in Slice S5-C; keep platform detection logic unchanged |

---

## Part 6: Validation Checkpoints Per Slice

| Slice | `npm test` | Smoke check scope |
|---|---|---|
| S5-A | Required | App starts, no console errors |
| S5-B | Required | Editor loads, file open/save works |
| S5-C | Required | All menu items trigger correctly |
| S5-D | Required | Full editor workflow stable |
| S5-E | Required | Autotrace helper unit path resolution |
| S5-F | Required | Autotrace and export workflows end-to-end |
| S5-G | Required | Full application smoke regression |

---

## Out of Scope

- Implementing the migration code changes (Sprint 5 execution work)
- Selecting or evaluating a module bundler for renderer library loading
- Full dependency version upgrades beyond Electron security surface changes
- macOS notarization or Windows code-signing requirements
