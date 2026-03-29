# 12 Startup Smoke Check

## Purpose

Define a repeatable startup verification procedure for PancakePainter so
obvious launch regressions are caught before deeper refactoring or a new
release.

This is the first integration-level validation lane for the application and
complements the lint baseline established in `docs/10_validation_contract.md`.

## Scope

- Covers the main application launch path only.
- Verifies that the Electron main process and the primary renderer window start
  without an immediate fatal error.
- Does not replace automated unit or integration tests.

## When to Run

Run the startup smoke check whenever a change can affect the application launch
path, including but not limited to:

- Changes to `src/main.js` (main-process entry point)
- Changes to `src/app.js` (renderer entry point)
- Changes to `src/index.html` (main window markup)
- Dependency additions, removals, or version changes
- Changes to `menus/menu-init.js` or `menus/menu-*.js`
- Changes to `locales/` translation files loaded at startup
- Any change to the `scripts.start` entry in `package.json`

## Prerequisites

Before running any smoke check:

1. Ensure Node.js and npm are installed and available on `PATH`.
2. Run `npm install` to ensure dependencies are up to date.
3. A graphical session (monitor/display) must be active. The Electron renderer
   process requires a display. Headless CI environments are not supported
   without a virtual display driver.

## Automated Smoke Check

### Command

```powershell
npm run smoke
```

This invokes `scripts/smoke-test.ps1` via PowerShell with the bypass execution
policy required for non-interactive script execution.

### What the Script Does

1. Verifies npm and `node_modules` are available.
2. Launches the application using `npm start` (same path as `electron .`).
3. Watches the process for the configured check window (default: 10 seconds).
4. Evaluates whether the process is still alive at the end of the window.
5. Terminates the process tree cleanly after the check using `taskkill /F /T`.
6. Reports `PASS` (exit 0) or `FAIL` (exit 1) with an explanatory message.

### Extended Check Window

If startup is slow on a particular machine, extend the check window:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1 -WaitSeconds 20
```

### Expected Pass Output

```
=== PancakePainter Startup Smoke Check ===
Repository root : C:\...\PancakePainter
Check window    : 10 second(s)

Application launched (npm PID: XXXXX).
Watching process for 10 second(s)...

Terminating process tree (PID: XXXXX)...

PASS: Application remained alive for 10 second(s).
```

### Expected Fail Output (Immediate Crash)

```
FAIL: Process exited after N second(s) (exit code: 1).
```

### Pass / Fail Criteria — Automated Check

| Outcome | Condition |
|---------|-----------|
| PASS (exit 0) | Application process is still running after the full check window |
| FAIL (exit 1) | Process exited before the check window elapsed |
| FAIL (exit 1) | npm or node_modules not found |
| FAIL (exit 1) | `Start-Process` could not create the npm process |

## Manual Smoke Check

For changes that affect the visual layout, run the manual observation procedure
after the automated check passes.

### Steps

1. Run `npm start` from the repository root.
2. Observe the application window as it opens.
3. Verify the items in the pass checklist below.
4. Close the window once verification is complete.

### Pass Checklist (Manual)

After the window opens, confirm the following are visible and correct:

- [ ] PancakePainter window opens without an error dialog.
- [ ] Logo (`#logo`) is visible in the toolbar column.
- [ ] Application version string (`.ver`) is displayed next to the logo.
- [ ] Griddle image (`#griddle`) is rendered inside the editor area.
- [ ] Drawing canvas (`#editor`) fills the editor wrapper without overflow.
- [ ] Drawing note text (`#drawnote`, localised string `common.drawnote`) is
      visible below the editor.
- [ ] No JavaScript error dialog or Electron crash window appears.
- [ ] The browser console (DevTools → Console) shows no fatal startup errors.

### Failure Indicators (Manual)

Any of the following indicate a smoke check failure:

- A white blank window with no content (renderer failed to load).
- An "Aw, Snap!" Electron process crash page.
- A native OS error dialog before the window appears.
- The griddle or logo image is missing (resource path regression).
- A JavaScript `Uncaught Error` referencing core startup paths visible in the
  DevTools console.

## Relationship to the Validation Contract

The automated smoke check (`npm run smoke`) is listed in
`docs/10_validation_contract.md` as the conditional third step in the
validation workflow. It must be run after `npm test` whenever a change touches
the startup path.

Full validation sequence for startup-affecting changes:

```
npm install
npm test
npm run smoke
```

## Limitations and Future Work

- The automated check is process-level only: it verifies that the application
  did not crash, but does not inspect the renderer DOM or take screenshots.
- Renderer-level assertions (e.g. verifying specific DOM elements are present)
  require an integration test harness such as Spectron or a headless Electron
  test driver. This is deferred to `US-202` (Bootstrap Jest Test Harness).
- The script is Windows/PowerShell-native. On macOS or Linux, run the
  equivalent Bash commands to launch `npm start` and poll the process.
