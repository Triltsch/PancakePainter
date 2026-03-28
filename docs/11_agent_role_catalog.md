# 11 Specialized Agent Role Catalog

## Purpose

Define the specialized agent roles required to decompose and execute large
Option A refactoring tasks (Epics E2–E5) into safe, reviewable, agent-assisted
pull requests.

This catalog exists so:
- orchestration agents can delegate work with predictable scope boundaries
- sprint planners can assign work to the right role without ambiguity
- future `.agent.md` files can be derived from this specification

## Scope of this document

This document catalogs role definitions, boundaries, and input/output contracts.
It does **not** implement the agent files. Implementation is deferred to the
corresponding sprint when a role first becomes active.

## Relation to existing agents

| Existing Agent | Role | Scope |
|---|---|---|
| `pancake-orchestrator` | Workflow orchestration | Drives implement → commit → review → merge for any issue |
| `mcp-pr-review` | PR review response | Fetches and resolves Copilot review comments |
| `pancake-sprint-planner` | Sprint planning | Derives sprint issues from backlog docs |

The roles below are **not yet implemented** as agent files. They extend the
workflow for domain-specific refactoring tasks.

---

## Role Definitions

### Role 1: pancake-electron-upgrader

**Epic:** E3 — Electron Modernization
**Sprint activation:** Sprint 5 (Electron upgrade execution)
**Future prompt file:** `06_pancake_electron_upgrade.prompt.md` *(planned)*
**Future agent file:** `.github/agents/pancake-electron-upgrader.agent.md` *(planned)*

#### Purpose

Execute a targeted Electron version bump from the current legacy baseline to a
supported LTS release, resolving all API-level breaking changes without changing
application logic or business behaviour.

#### Boundaries

**In scope:**
- `package.json` Electron version and related devDependency updates
- IPC pattern migration (`ipcRenderer`/`ipcMain` API changes)
- `BrowserWindow` and `webContents` API call fixes
- `remote` module removal or replacement
- `nodeIntegration` / `contextIsolation` configuration
- Startup smoke verification

**Out of scope:**
- Application logic refactoring or behaviour changes
- Modularization of renderer code
- Test bootstrap (handled by Role 2)
- Dependency changes unrelated to Electron (handled by Role 4)
- Any UI modifications

#### Required inputs

| Input | Source |
|---|---|
| Breaking-change inventory | Sprint 4 output (`E3` prep story) |
| Current `package.json` | Repository root |
| Electron migration guide reference | Official Electron docs (version-specific) |
| Validation passing baseline | `npm test` exits 0 before starting |
| Smoke check definition | `docs/10_validation_contract.md` |

#### Expected outputs

| Output | Description |
|---|---|
| Updated `package.json` | Target Electron version pinned |
| Fixed source files | Only files requiring API-level fix |
| `npm test` passing | Lint baseline preserved |
| Smoke check result | App starts and no crash on launch |
| Commit message | Issue-prefixed, lists each fixed API call by file |

#### Failure modes and guard rails

- Abort if `npm test` fails after dependency install (do not proceed with broken lint)
- Abort if startup smoke fails after 2 fix attempts — report exact error and
  require human intervention
- Never combine Electron upgrade with application logic changes in the same PR

---

### Role 2: pancake-test-bootstrapper

**Epic:** E2 — Validation and Test Foundation
**Sprint activation:** Sprint 2 (safety net bootstrap)
**Future prompt file:** `07_pancake_test_bootstrap.prompt.md` *(planned)*
**Future agent file:** `.github/agents/pancake-test-bootstrapper.agent.md` *(planned)*

#### Purpose

Establish the test harness, initial test infrastructure, and the first working
test suite for a specified module, producing a repeatable baseline that later
roles depend on.

#### Boundaries

**In scope:**
- Jest installation and configuration (`jest.config.js`)
- Test directory structure and naming conventions
- Mock boundary definitions for Paper.js and Electron APIs
- Initial test files for a specified source module
- Coverage threshold configuration
- Validation contract update if test command changes

**Out of scope:**
- Production source code changes (tests only)
- Electron upgrade (handled by Role 1)
- Comprehensive end-to-end or integration test suites
- CI pipeline changes beyond updating the validation contract doc

#### Required inputs

| Input | Source |
|---|---|
| Target module to test | Issue scope |
| Validation contract | `docs/10_validation_contract.md` |
| Mock boundary strategy doc | Sprint 2 output (US-203) |
| Current `package.json` | Repository root |

#### Expected outputs

| Output | Description |
|---|---|
| `jest.config.js` | Test runner configuration |
| `tests/` directory structure | Conventions documented in commit |
| `tests/mocks/` stubs | Paper.js and Electron mock boundaries |
| At least one test file | For the target module, with passing tests |
| Updated validation contract | If `npm test` now also invokes Jest |
| `npm test` passing | Lint and Jest both exit 0 |

#### Failure modes and guard rails

- Do not change production source files to make tests pass — fix the test or the mock
- If Jest and JSHint conflict in the same `npm test` script, document both
  commands separately and report the conflict before changing `package.json`
- Coverage threshold must not be set above current measured coverage at
  bootstrap time (do not set a threshold that immediately fails)

---

### Role 3: pancake-modularizer

**Epic:** E4 — Renderer Modularization
**Sprint activation:** Sprint 6 (Modularization I)
**Future prompt file:** `08_pancake_modularize.prompt.md` *(planned)*
**Future agent file:** `.github/agents/pancake-modularizer.agent.md` *(planned)*

#### Purpose

Extract a single, well-scoped concern from a large coupled renderer-side file
into a discrete, independently testable module, preserving all existing
behaviour and test coverage.

#### Boundaries

**In scope:**
- Extraction of one named concern per PR (e.g. FileManager, SettingsManager)
- Creation of the new module file under an appropriate directory
- Update of all import/require references in the affected renderer files
- Ensuring `npm test` and any Jest tests continue to pass after extraction

**Out of scope:**
- Extracting more than one concern per PR (one extraction per issue)
- Electron upgrade work (handled by Role 1)
- Adding new features or business logic during extraction
- Changing the public interface of the extracted concern beyond what is
  required for module isolation
- Dependency version changes (handled by Role 4)

#### Required inputs

| Input | Source |
|---|---|
| Concern to extract (named) | Issue scope |
| Source file(s) containing the concern | Identified in issue |
| Passing test baseline | `npm test` exits 0 before starting |
| Architecture analysis | `docs/architecture-analysis.md` |
| Modularization strategy reference | `docs/refactoring-strategy.md` |

#### Expected outputs

| Output | Description |
|---|---|
| New module file | Contains the extracted concern |
| Updated source file(s) | Delegating to the new module via require/import |
| `npm test` passing | No regressions introduced |
| Jest tests passing (if applicable) | Coverage not reduced |
| Commit message | Names the extracted concern and lists all changed files |

#### Failure modes and guard rails

- Abort if `npm test` fails after extraction — do not assume it will be fixed
  in a later PR
- If the extraction cannot be done in a behaviour-preserving way without adding
  tests first, stop and report: "test coverage required before safe extraction"
- Never rename the extracted concern's public interface without an explicit
  follow-up issue for the rename

---

### Role 4: pancake-dependency-modernizer

**Epic:** E5 — Tooling and Dependency Modernization
**Sprint activation:** Sprint 8 (dependency modernization)
**Future prompt file:** `09_pancake_dependency_modernize.prompt.md` *(planned)*
**Future agent file:** `.github/agents/pancake-dependency-modernizer.agent.md` *(planned)*

#### Purpose

Update or remove a single named dependency safely, resolving all call-site
breaking changes without altering application logic, and verifying that the
baseline validation and tests continue to pass.

#### Boundaries

**In scope:**
- `package.json` version update or removal for ONE named package per PR
- Call-site fixes required by the new package API
- `npm install` and any lock file regeneration
- Validation of `npm test` passing after the change

**Out of scope:**
- Updating more than one unrelated package in the same PR
- Electron Modernization (handled by Role 1)
- Application logic refactoring beyond what the dependency change requires
- Adding new features that a new package version enables
- Removing jQuery or Paper.js without a dedicated, separately planned issue
  (these require their own tracked issues due to scope and risk)

#### Required inputs

| Input | Source |
|---|---|
| Package name and target version (or removal) | Issue scope |
| Current usage sites in source | Identified in issue or by search |
| Package changelog / migration notes | Package repository / npm |
| Passing test baseline | `npm test` exits 0 before starting |
| Existing test coverage for affected modules | Jest test report (if baseline exists) |

#### Expected outputs

| Output | Description |
|---|---|
| Updated `package.json` | Target version pinned or package removed |
| Fixed call sites | Only files that use the updated package API |
| `npm test` passing | Lint and Jest both exit 0 |
| Commit message | Names the package, version change, and each fixed file |

#### Failure modes and guard rails

- Abort if `npm install` produces peer dependency errors that cannot be resolved
  for the target version — report and ask for version decision
- If call-site changes require understanding of application business logic (e.g.
  removing jQuery event delegation), stop and file a child issue rather than
  guessing intent
- Never batch multiple package changes into one PR to "save time"

---

## Role-to-Epic Mapping

| Role | Agent file (planned) | Primary Epic | Supporting Epic | Sprint |
|---|---|---|---|---|
| `pancake-electron-upgrader` | `.github/agents/pancake-electron-upgrader.agent.md` | E3 | E2 (needs test baseline first) | 5 |
| `pancake-test-bootstrapper` | `.github/agents/pancake-test-bootstrapper.agent.md` | E2 | E3, E4 (prerequisite) | 2 |
| `pancake-modularizer` | `.github/agents/pancake-modularizer.agent.md` | E4 | E2 (requires test baseline) | 6–7 |
| `pancake-dependency-modernizer` | `.github/agents/pancake-dependency-modernizer.agent.md` | E5 | E2 (requires test baseline) | 8 |

## Cross-cutting dependency rules

1. `pancake-test-bootstrapper` must produce a passing test baseline before
   `pancake-electron-upgrader`, `pancake-modularizer`, or
   `pancake-dependency-modernizer` may be invoked on production source changes.
2. `pancake-electron-upgrader` must complete before `pancake-modularizer` begins
   (Electron API surface must be stable before extraction).
3. Each role operates on **one concern per PR**. The orchestrator
   (`pancake-orchestrator`) remains responsible for the commit → review → merge
   sequence for any issue regardless of which role performed the implementation.
4. `pancake-sprint-planner` uses this catalog to assign sprint issues to the
   correct role and to identify when a role's activation sprint has arrived.
