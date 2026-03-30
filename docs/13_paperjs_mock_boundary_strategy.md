# 13 Paper.js Mock Boundary Strategy (US-203)

## Purpose

Define a practical test boundary for Paper.js-dependent code so Jest tests can
verify business logic without requiring a real canvas/runtime.

This strategy is intentionally incremental and aligned with the existing
PancakePainter architecture (global `paper`, legacy PaperScript modules,
Electron-era renderer assumptions).

## Scope

In scope:
- identify where Paper.js is tightly coupled
- define the test boundary between geometry/runtime and business logic
- provide a viable prototype target (`src/gcode.js`)
- define limitations, non-goals, and next implementation steps

Out of scope:
- full decoupling of all modules from global `paper`
- replacing Paper.js or redesigning renderer architecture
- introducing browser/canvas E2E test runtime in this issue

## Current Coupling Map

### High coupling (requires real Paper runtime today)

- `src/editor.ps.js`
- `src/autotrace.ps.js`
- `src/simulator.ps.js`
- `src/helpers/helper.utils.js`

These modules instantiate and mutate Paper.js objects directly
(`Layer`, `Group`, `Raster`, `CompoundPath`, `view`, project globals).

### Medium coupling (business logic mixed with Paper globals)

- `src/gcode.js`

`gcode.js` contains testable orchestration/business logic (grouping, mapping,
travel ordering, command generation) but also depends on Paper types and global
side effects:
- assigns helper functions to `paper` at factory invocation time:
  - `paper.shapeFillPath`
  - `paper.layerContainsCompoundPaths`
  - `paper.previewCam`
- uses Paper constructors in-path (`new paper.Point`, `new paper.CompoundPath`)
- expects Paper-like path/layer methods (`clone`, `flatten`, `segments`, etc.)

## Boundary Definition

Use a two-boundary model for tests:

1. Paper Boundary (Runtime Adapter Boundary)
- everything that creates or mutates Paper runtime objects is treated as an
  adapter/runtime concern
- examples: `paper.Point`, `paper.CompoundPath`, `paper.view.update()`,
  `instanceof paper.CompoundPath`, layer/path mutation side effects

2. Business Logic Boundary (Unit-Test Target)
- algorithmic behavior is tested with lightweight fixtures and minimal runtime
  shims
- examples: gcode command composition, path grouping by shade, speed selection,
  map/remap transformations, short-path shutoff behavior, ordering decisions

## Mocking Levels

### Level 0: Factory Contract Tests (already in place)

Goal:
- verify module load and factory behavior without full Paper runtime

Technique:
- minimal `global.paper = {}` stub in Jest `beforeEach`
- assert factory returns renderer and registers public helpers

Use when:
- validating module boundaries and exported contract quickly

### Level 1: Paper-Lite Fixture Tests (next implementation target)

Goal:
- test renderer business behavior without canvas/DOM

Technique:
- create plain-object fixtures for layer/path/segment shape
- implement only methods used by `gcode.js`:
  - layer: `clone`, `activate`, `children`, `insertChild`, `remove`
  - path: `flatten`, `reverse`, `add`, `remove`, `getPointAt`, `segments`
  - point: `getDistance`
- provide minimal `global.paper` shim for required constructors and helpers

Use when:
- validating generation logic deterministically in Node-only Jest

### Level 2: Integration Runtime Tests (deferred)

Goal:
- validate behavior that depends on true Paper geometry semantics

Technique:
- run tests in a dedicated integration suite with actual Paper runtime setup
  (or renderer-compatible harness)

Use when:
- verifying geometry correctness (`CompoundPath` flattening, clipping,
  transforms) beyond unit-level fixtures

## Prototype Module Plan: `src/gcode.js`

### Why `gcode.js` is the prototype

- high business value (export correctness)
- existing Jest foothold from US-202
- mixed coupling profile makes it ideal to establish boundary pattern

### Proposed test slices (incremental)

Slice A (stable, low risk):
- header/footer command generation expectations
- color speed switching behavior
- early/late pump shutoff conditions

Slice B (moderate):
- color grouping and draw-order rules
- travel-sort behavior using deterministic point fixtures

Slice C (integration/deferred):
- shape-fill/compound-path behavior requiring true geometry semantics

## Limitations and Risks

- Paper-Lite fixtures can diverge from real Paper.js behavior if fixture shape
  drifts; this can create false confidence.
- `instanceof` checks against Paper classes reduce mock flexibility.
- Global mutable state (`global.paper`) requires strict setup/teardown per test
  file to avoid cross-test contamination.
- Geometry-heavy operations (clipper/jscut + CompoundPath behavior) are not
  fully validated at unit level and need integration coverage.

## Non-Goals

- no API-breaking refactor of `gcode.js` in US-203
- no extraction of all pure functions in a single pass
- no migration of editor/autotrace modules into framework-independent services

## Actionable Follow-Up (for implementation issues)

1. Add `tests/fixtures/paper-lite-gcode.js` with minimal path/layer/point
   helpers required by `gcode.js`.
2. Add targeted unit tests in `tests/unit/gcode.behavior.test.js` for Slice A.
3. Add deterministic fixture scenarios for Slice B ordering/grouping rules.
4. Add one integration test ticket for Slice C geometry semantics with real
   runtime harness.
5. Document fixture contract assumptions in `tests/README.md` and keep them in
   sync when Paper-facing APIs change.

## Acceptance Criteria Mapping

- Documented strategy exists: yes (this document)
- Viable prototype module identified: yes (`src/gcode.js`)
- Limitations and non-goals documented: yes
- Actionable for test-harness follow-up: yes (five concrete next steps)
