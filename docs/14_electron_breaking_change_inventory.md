# 14 Electron Breaking Change Inventory

## Purpose

This document is the Sprint 4 output for US-401 and provides a concrete,
prioritized inventory of Electron upgrade breaking changes affecting this
repository.

It is intended to de-risk Sprint 5 execution by mapping migration risks to
specific files, runtime surfaces, and issue-sized follow-up slices.

## Scope Covered

- main process Electron usage
- renderer process Electron usage
- webview-based sub-process communication
- startup, IPC, window lifecycle, and renderer access risk hotspots

## Baseline Context

- Current runtime metadata indicates Electron 1.0.1 in `package.json`.
- Target roadmap phase expects migration to a modern supported Electron line.
- The codebase currently relies heavily on `remote` and permissive renderer
  settings, both of which are high-risk for modern Electron defaults.

## Migration Inventory

| ID | Area | File(s) | Legacy Pattern | Breaking Change / Risk | Priority | Recommended Direction |
|---|---|---|---|---|---|---|
| E401-01 | Renderer access to main process | `src/app.js`, `menus/menu-init.js`, `menus/menu-darwin.js`, `menus/menu-win32.js`, `src/autotrace.ps.js`, `src/simulator.ps.js`, `src/helpers/helper.autotrace.js` | `require('electron').remote`, `remote.app`, `remote.require(...)`, `remote.BrowserWindow` | `remote` is deprecated and removed from Electron core in modern versions (optionally replaceable via `@electron/remote`, but the recommended path is preload + explicit IPC). Strong blocker for migration and security posture. | Critical | Replace `remote` usage with preload bridge + explicit IPC contracts. Evaluate `@electron/remote` as a transitional shim only if a full migration is out of scope for Sprint 5. |
| E401-02 | BrowserWindow security model | `src/main.js` | BrowserWindow created without explicit hardened `webPreferences` | Modern Electron security defaults and best practices require explicit hardening (`contextIsolation`, controlled Node exposure, etc.). Legacy assumptions likely break. | Critical | Define explicit `webPreferences` and migrate renderer dependencies through preload APIs. |
| E401-03 | Webview security and compatibility | `src/windows/window.autotrace.html`, `src/windows/window.export.html` | `<webview ... nodeintegration="true" disablewebsecurity="true" ...>` | Insecure and brittle for modern Electron; high risk of functional and security regressions during upgrade. | Critical | Replace permissive flags; move privileged actions behind bounded IPC and preload. |
| E401-04 | IPC transport between host and webview | `src/windows/window.autotrace.js`, `src/windows/window.export.js`, `src/autotrace.ps.js`, `src/simulator.ps.js` | `wv.send(...)`, `var ipc = require('electron').ipcRenderer; ipc.on(...)`, `ipc.sendToHost(...)`, `ipc-message` event channel contracts | APIs exist, but implicit channel contracts and global exposure (`window.ipc`, `window.app`) increase break risk under isolation. | High | Define explicit channel registry and typed payload contracts before migration. |
| E401-05 | Main process startup/load path | `src/main.js` | `mainWindow.loadURL('file://' + __dirname + '/index.html')`, legacy event wiring and dialog wrapper | Not inherently broken, but likely impacted by security model changes and preload introduction. | Medium | Keep startup flow stable; isolate migration changes to window config and IPC boundaries. |
| E401-06 | Menu integration from renderer | `src/app.js`, `menus/menu-*.js` | Renderer initializes application menu via `remote` | Architecture coupling likely fails once `remote` is removed and renderer privileges are reduced. | High | Move menu initialization and privileged actions to main process; expose safe renderer triggers only. |

## Highest-Risk Hotspots

### 1) `remote` usage across renderer and menu modules (Critical)

This is the primary migration blocker because multiple renderer-side modules
directly depend on main-process objects and Node modules through `remote`.

Primary hotspots:

- `src/app.js`
- `menus/menu-init.js`
- `menus/menu-darwin.js`
- `menus/menu-win32.js`
- `src/autotrace.ps.js`
- `src/simulator.ps.js`

### 2) Webview privilege model (Critical)

Both overlay webviews currently run with permissive flags that conflict with a
hardened modern Electron posture.

Primary hotspots:

- `src/windows/window.autotrace.html`
- `src/windows/window.export.html`

### 3) Implicit IPC contracts (High)

Current IPC channels are operational but largely implicit and globally exposed,
which increases migration and regression risk once isolation boundaries are
enforced.

Primary hotspots:

- `src/windows/window.autotrace.js`
- `src/windows/window.export.js`
- `src/autotrace.ps.js`
- `src/simulator.ps.js`

## Split-Ready Follow-Up Slices For Sprint 5

The following slices are intentionally issue-sized and can be sequenced under
US-501/US-502/US-503 execution work:

1. Introduce preload bridge and remove direct `remote` access from `src/app.js`.
2. Migrate menu modules away from renderer-side `remote` dependencies.
3. Harden BrowserWindow `webPreferences` in `src/main.js` with staged rollout.
4. Define IPC channel contract map for export/autotrace webview workflows.
5. Reduce webview privileges and verify export/autotrace functional parity.
6. Regression pass on startup, drawing, export, and settings after each slice.

## Suggested Sequencing

1. Establish preload + IPC contract skeleton.
2. Migrate `remote` dependencies in the main renderer shell (`src/app.js`).
3. Migrate menu wiring to main-process-owned integration.
4. Migrate autotrace/simulator webview bridges and remove global privileged
   objects.
5. Apply webview and BrowserWindow hardening defaults.
6. Run smoke and regression validation (startup, drawing, export, settings).

## Validation Impact

Critical validation checkpoints during Sprint 5 execution:

- app startup path remains functional
- editor load and basic drawing workflows still operate
- export workflow still generates GCODE
- settings persistence and retrieval remain stable

## Out Of Scope

- Implementing all migration code changes
- Completing full dependency modernization beyond Electron readiness
- Architecture replacement beyond Option A incremental constraints
