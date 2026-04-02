# 17 Post-Upgrade Regression Validation

## Purpose

This document is the Sprint 5 validation artifact for US-503.

It records the evidence gathered on the upgraded Electron baseline and defines
the remaining interactive regression checks needed before the Sprint 5
migration can be accepted on evidence rather than assumption.

## Baseline Under Validation

| Item | Value |
|---|---|
| Repository | PancakePainter |
| Branch validated | `master` |
| Validation date | 2026-04-02 |
| Electron runtime | 28.3.3 |
| Validation contract | `docs/10_validation_contract.md` |
| Startup smoke definition | `docs/12_startup_smoke_check.md` |
| Sprint 5 migration checkpoints | `docs/15_main_process_security_migration_plan.md` |
| Renderer workflow assumptions | `docs/16_renderer_compatibility_strategy.md` |

## Automated Evidence Captured

The following repository-native commands were executed from the repository root
on the baseline above:

| Command | Result | Evidence |
|---|---|---|
| `npm install` | PASS | Dependencies resolved without install failure |
| `npm test` | PASS | 9 Jest suites passed, 55 tests passed; JSHint passed first |
| `npm run smoke` | PASS | Application remained alive for the full 10-second startup window |

## Scope-to-Evidence Matrix

| Validation scope from US-503 | Current evidence | Status | Notes |
|---|---|---|---|
| App startup and main window initialization | `npm run smoke` pass | PASS | Confirms Electron main process and primary renderer stay alive through startup |
| IPC and menu dispatch wiring touched by Sprint 5 | `tests/unit/ipc.channels.test.js`, `tests/unit/menus/menu.init.test.js` via `npm test` | PASS | Covers the shared IPC registry and menu click dispatch contract |
| Settings load/save and reset behavior | `tests/unit/helpers/settings.store.test.js` via `npm test` | PASS | Covers default load, persisted overrides, malformed JSON fallback, save fallback, and reset |
| File persistence open/save behavior | `tests/unit/helpers/file.io.test.js` via `npm test` | PASS | Covers save, open, missing file, unreadable file, malformed content, and state updates |
| Export-to-GCODE generation core | `tests/unit/gcode.test.js` via `npm test` | PASS | Covers module contract plus header, footer, and pump-command generation |
| Undo state transitions behind editing workflow | `tests/unit/helpers/helper.undo.test.js` via `npm test` | PASS | Covers state capture, undo, redo, and stack reset behavior |
| Autotrace helper pathing and SVG post-processing | `tests/unit/helpers/helper.autotrace.test.js` via `npm test` | PASS | Covers injected app-path usage and SVG namespace normalization |
| Full interactive drawing/editing workflow | Manual S5-G checklist below | PENDING MANUAL | No DOM-level or Electron-driver automation exists in this repository yet |
| Export overlay and simulator interaction | Manual S5-G checklist below | PENDING MANUAL | Current automated coverage validates GCODE generation but not overlay/webview interaction |
| Autotrace image import, render, and clone flow | Manual S5-G checklist below | PENDING MANUAL | Current automated coverage validates helper behavior but not the end-to-end overlay path |

## Sprint 5 Checkpoint Matrix

| Slice | Required validation from Sprint 4 plan | Evidence captured here | Status |
|---|---|---|---|
| S5-A | App starts, no console errors | `npm run smoke` pass, but DevTools shows fatal renderer startup errors; see issue #35 | FAIL |
| S5-B | Editor loads, file open/save works | Automated file I/O tests pass; editor load still requires manual confirmation | PARTIAL |
| S5-C | Menu items trigger correctly | Menu dispatch unit coverage passes; full application menu click path still requires manual confirmation | PARTIAL |
| S5-D | Full editor workflow stable | Undo and startup coverage pass; drawing/editor interactions still require manual confirmation | PARTIAL |
| S5-E | Autotrace helper path resolution | Autotrace helper tests pass | PASS |
| S5-F | Autotrace and export workflows end-to-end | Helper and GCODE coverage pass; overlay/webview path still requires manual confirmation | PARTIAL |
| S5-G | Full application smoke regression | Automated baseline verified; context isolation fixes applied (#36); manual regression checklist ready for execution | READY |

## Manual Regression Checklist

Run this checklist in a graphical desktop session after the automated baseline is
green. Record the result of each step directly in this file or in the related
issue/PR conversation.

### Startup and Editor Shell

| Check | Expected result | Status | Notes |
|---|---|---|---|
 PASS | Context isolation and toolbar fixes verified. App starts cleanly, toolbar displays correctly, fill tool messages visible. |
 PASS | All UI elements present: logo, version, griddle, toolbar with pen/fill/select tools, color palette. |
 PASS | No startup errors. Verified 2026-04-03. |

### Drawing and Editing Baseline

| Check | Expected result | Status | Notes |
|---|---|---|---|
 OPEN | See #38 for regression tracking. |
 OPEN | See #38 for regression tracking. |
 OPEN | See #38 for regression tracking. |

### Export Workflow

| Check | Expected result | Status | Notes |
|---|---|---|---|
 OPEN | See #39 for regression tracking. |
 OPEN | See #39 for regression tracking. |
 OPEN | See #39 for regression tracking. |

### Autotrace Workflow

| Check | Expected result | Status | Notes |
|---|---|---|---|
 OPEN | See #40 for regression tracking. |
 OPEN | See #40 for regression tracking. |
 OPEN | See #40 for regression tracking. |

### Settings and File Persistence

| Check | Expected result | Status | Notes |
|---|---|---|---|
 OPEN | See #41 for regression tracking. |
| Save a `.pbp` project and reopen it | Drawing reloads and file state is correct | TODO | |
 OPEN | See #41 for regression tracking. |

## Defect Capture Rules

If any manual or automated step fails:

1. Create a follow-up defect issue before closing US-503.
2. Include the failing workflow, exact repro steps, observed error text, and
   whether the failure is startup, drawing, export, autotrace, settings, or
   file persistence.
3. Link the defect back to US-503 and keep this document updated with the
   defect issue number.

Defects captured from current validation pass:

- #35 Regression: renderer bootstrap fails under Electron isolation
   (require/jQuery undefined)

## Current Acceptance Readout

Status as of 2026-04-02 (updated):

- Automated acceptance baseline remains green on `master` (npm test: 55/55 green, npm run smoke: PASS).
- Renderer bootstrap regression (#35) has been fixed:
  - Removed `require()` calls from app.js for jquery, toastr, underscore
  - Added script tags to index.html to load libraries before app.js
  - Extended preload bridge with path module methods
  - Inlined file I/O helper functions
- Manual S5-G regression checklist is now ready to resume.
- **Next step**: Re-run the manual checklist in [Drawing and Editing Baseline](#drawing-and-editing-baseline) and following sections to complete validation.

