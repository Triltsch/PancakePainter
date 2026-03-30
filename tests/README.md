# Tests

This directory contains all automated test files for PancakePainter.

## Directory Structure

```
tests/
  unit/                 Unit tests for isolated modules and pure functions
  integration/          Integration tests for multi-module workflows (future)
  __mocks__/            Manual Jest mocks for modules that require Electron or
                        Paper.js APIs (see Jest Mocking Strategy below)
```

## Running Tests

```powershell
# Run all unit tests:
npm run jest

# Run tests and collect a coverage report:
npm run jest -- --coverage

# Run the full validation chain (lint + unit tests):
npm test
```

## Conventions

- Each test file mirrors the path of the source file it covers:
  - `src/gcode.js` → `tests/unit/gcode.test.js`
  - `src/helpers/helper.undo.js` → `tests/unit/helpers/helper.undo.test.js`
- Test files must follow the `*.test.js` naming pattern.
- Each test file should have a top-level JSDoc header that describes its scope
  and the module under test.
- Each `describe` block covers one logical unit or function.
- Each `test`/`it` block has a descriptive name that reads as a sentence.

## Jest Mocking Strategy

PancakePainter is an Electron application. Most source modules either:
1. Import Electron APIs (`electron`, `remote`, `ipcRenderer`) directly, or
2. Receive a `paper` instance as a factory argument (all `helper.*` modules).

### Electron mocking

Place manual mocks in `tests/__mocks__/`. Jest will automatically use a file
named after the module it replaces (e.g. `tests/__mocks__/electron.js` for
`require('electron')`).

The mock strategy for Electron is deferred to US-203 (Define Paper.js Mock
Boundary Strategy). No broad `electron` mock is provided yet. Tests that
require Electron-free modules (such as pure GCODE utility logic) do not need
this mock.

### Paper.js mocking

Modules that receive `paper` as a factory argument (e.g. `helper.undo.js`,
`helper.clipboard.js`, `helper.utils.js`) require a `paper` stub to test. A
minimal stub will be added in a follow-up issue (US-203). Until then, only
modules that do not require a `paper` argument at call time are unit-tested.

### Currently testable without mocking

The following modules can be required and partially tested in a plain Node.js
environment without any Electron or Paper.js mocking:

| Module | Reason |
|--------|--------|
| `src/gcode.js` | `paper` and `_` are used only inside the returned renderer; the module and its factory can be loaded and inspected without calling the renderer |
| `src/libs/clipper.js` | Pure JavaScript polygon clipping library, no external dependencies |
| `src/libs/jscut_custom.js` | Pure JavaScript CAM library, no external dependencies |

## Coverage Baseline

Current baseline (established Sprint 2, US-202):

| Metric | Baseline |
|--------|----------|
| Statements | ~0% (sample test only) |
| Branches | ~0% |
| Functions | ~0% |
| Lines | ~0% |

Coverage expansion is planned in Sprint 3 (US-301, US-302, US-303). Run
`npm run jest -- --coverage` to capture the current baseline and compare
against future sprint work.
