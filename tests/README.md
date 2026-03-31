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
minimal boundary strategy is defined in US-203
(`docs/13_paperjs_mock_boundary_strategy.md`). Use Level 0
(`global.paper = {}` factory-contract stubs) for basic module tests, then
Level 1 Paper-Lite fixtures for business logic. Reserve geometry semantics for
integration-level runtime tests.

### File I/O and settings mocking

US-302 introduces isolated tests for file persistence and settings loading
without touching the real filesystem or starting Electron:

- Mock filesystem calls (`existsSync`, `readFileSync`, `writeFileSync`,
  `removeSync`) with Jest stubs or in-memory maps.
- Keep file save/open logic in testable helper boundaries
  (`src/helpers/helper.file-io.js`) and pass dependencies as arguments.
- Keep settings persistence logic in a testable helper boundary
  (`src/helpers/helper.settings-store.js`) and verify default fallback behavior
  on malformed or missing config files.
- Treat Electron dialog/IPC concerns as caller boundaries and test only the
  pure file/settings logic in unit tests.

### Currently testable without mocking

The following modules can be required and partially tested in a plain Node.js
environment without any Electron or Paper.js mocking:

| Module | Reason |
|--------|--------|
| `src/gcode.js` | `require('./gcode')` itself has no side effects. The factory (`gcodeFactory()`) assigns helpers onto `global.paper` at invocation time (`paper.shapeFillPath`, `paper.layerContainsCompoundPaths`, `paper.previewCam`), so a minimal `global.paper = {}` stub is required before calling the factory. See `docs/13_paperjs_mock_boundary_strategy.md` for full boundary details. |
| `src/libs/clipper.js` | Pure JavaScript polygon clipping library, no external dependencies |
| `src/libs/jscut_custom.js` | Pure JavaScript CAM library, no external dependencies |

## Coverage Baseline

Current baseline (updated Sprint 3, US-303):

| Metric | Baseline |
|--------|----------|
| Statements | 52.98% |
| Branches | 45.38% |
| Functions | 63.33% |
| Lines | 54.29% |

Previous baseline (Sprint 2, US-202): ~0% (sample test only)

Coverage now includes additional helper-module measurement from US-303
(`helper.undo.js`, `helper.utils.js`) in addition to US-301/US-302 tests.
Run `npm run jest -- --coverage` to capture the current baseline and compare
against future sprint work.
