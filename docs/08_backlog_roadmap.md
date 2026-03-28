# 08 Backlog Roadmap

## Purpose

This document defines the backlog structure, sprint sequencing, and issue-ready user stories for **Revised Option A: Evolutionary Refactoring with Phase 0 Agent/Repository Alignment**.

It is intended to serve as an authoritative planning input for sprint planning and GitHub issue creation.

## Planning Scope

This roadmap covers:

- agent and prompt alignment to the real repository
- validation and test bootstrap
- Electron upgrade preparation and execution
- modularization of the most coupled application areas
- selective dependency modernization
- test expansion, documentation, and release readiness

This roadmap does not cover:

- a full rebuild
- a full UI rewrite
- large-scale architecture replacement
- new user-facing feature development beyond what is needed to de-risk modernization

## Product Outcome

### Refactoring MVP

The minimum successful outcome for this roadmap is:

1. The agent workflow is repository-native and executable.
2. The project has a real validation lane beyond manual testing.
3. Electron is upgraded to a supported modern version with core workflows still working.
4. The highest-risk modules have automated test coverage.
5. The codebase is meaningfully less coupled in the renderer layer.

### Success Definition

The roadmap is successful when the team can make future changes through small, reviewable, agent-assisted pull requests with materially lower regression risk.

## Planning Assumptions

1. **Assumption:** Sprint duration is two weeks.
2. **Assumption:** The team will prioritize platform stability and maintainability over new features during this roadmap.
3. **Assumption:** Existing documentation in `docs/refactoring-strategy.md`, `docs/testing-strategy.md`, and `docs/architecture-analysis.md` remains authoritative unless explicitly superseded.
4. **Assumption:** The current `.github` workflow files will be adjusted to become repository-native during Sprint 1.
5. **Assumption:** The repository remains a desktop Electron application with Paper.js-based drawing at least through Option A.

## Constraints

- Refactoring must remain incremental.
- Each sprint should produce issue-sized work items that can be independently reviewed.
- Do not couple Electron upgrade, modularization, and dependency replacement into a single large issue.
- Test infrastructure must precede or accompany risky modernization tasks.
- Agent workflow alignment is a blocker for all later refactoring work.

## Story Sizing Model

Use the following sizing when creating GitHub issues:

- `XS` = up to 0.5 day
- `S` = 1 day
- `M` = 2-3 days
- `L` = 4-5 days
- `XL` = larger than one sprint issue and must be split before issue creation

## Priority Model

- `P0` = blocker / prerequisite
- `P1` = critical path
- `P2` = important but not blocking
- `P3` = optional within Option A

## Epic Overview

### Epic E1: Agent/Repository Alignment
Goal: Make the pancake workflow executable in this repository.

### Epic E2: Validation and Test Foundation
Goal: Establish repeatable validation and initial automated test coverage.

### Epic E3: Electron Modernization
Goal: Move the application to a supported Electron baseline without breaking core workflows.

### Epic E4: Renderer Modularization
Goal: Reduce coupling in `app.js` and related renderer-side integration points.

### Epic E5: Tooling and Dependency Modernization
Goal: Improve maintainability through explicit contracts, better logging, and targeted dependency updates.

### Epic E6: Release Readiness
Goal: Complete coverage expansion, stabilize workflows, and document the modernized operating model.

## Cross-Sprint Dependency Rules

1. Stories in `E1` must be completed before `E3`, `E4`, or `E5` are started.
2. At least one working validation lane from `E2` must exist before the Electron upgrade is executed.
3. `E4` modularization stories must not begin until the Electron upgrade path is understood and validated.
4. Large dependency changes must be split by package or technical concern.
5. Each sprint must include at least one validation, testing, or documentation outcome in addition to structural refactoring.

## Sprint Roadmap Overview

| Sprint | Theme | Primary Outcome | Exit Criteria |
|------|------|------|------|
| 1 | Agent alignment | Repo-native prompt and validation contract | Prompt assumptions match repository reality |
| 2 | Safety net bootstrap | Smoke validation and initial Jest setup | First automated checks run reliably |
| 3 | Test foundation | Core tests for GCODE and file operations | Critical-path modules have first coverage |
| 4 | Electron upgrade readiness | Breaking-change inventory and migration prep | Upgrade scope is understood and staged |
| 5 | Electron upgrade execution | Supported Electron baseline running | App starts and core flows work on new Electron |
| 6 | Modularization I | File, settings, and state extraction | Most coupled non-UI logic is separated |
| 7 | Modularization II | UI bridge and tool/helper contracts | Renderer integration is more explicit |
| 8 | Dependency modernization | Paper.js, i18next, jQuery reduction, logging | High-risk legacy dependencies reduced |
| 9 | Release readiness | Coverage expansion, documentation, stabilization | Option A ready for controlled release |

## Detailed Backlog By Sprint

## Sprint 1: Agent Alignment

### Sprint Goal
Create a repository-native planning and implementation contract so future agent-driven work is executable and reviewable.

### Stories

#### US-101 Repository-Native Prompt Contract Audit
- Type: `Documentation`
- Epic: `E1`
- Priority: `P0`
- Estimate: `M`
- Labels: `documentation`, `agents`, `workflow`, `phase-0`, `sprint-1`
- Description: As a maintainer, I want the current pancake prompts audited against the actual repository so the workflow no longer assumes missing infrastructure.
- Scope:
  - identify mismatches between prompt assumptions and repository reality
  - document required prompt changes
  - define which assumptions are removed, replaced, or deferred
- Acceptance Criteria:
  - prompt assumptions are compared against the repository
  - mismatches are documented clearly
  - a remediation list is produced for follow-up issues
- Dependencies: none

#### US-102 Define Repository-Native Validation Contract
- Type: `Infrastructure`
- Epic: `E1`
- Priority: `P0`
- Estimate: `M`
- Labels: `infrastructure`, `validation`, `workflow`, `phase-0`, `sprint-1`
- Description: As a maintainer, I want a documented validation contract for this Electron app so agents and humans can run consistent checks.
- Scope:
  - define install, lint, smoke, and test commands
  - define pass/fail expectations
  - document which commands are authoritative before tests exist
- Acceptance Criteria:
  - validation commands are documented
  - commands are specific to this repository
  - the contract can be consumed by prompt workflows
- Dependencies: `US-101`

#### US-103 Decide LEARNINGS.md Strategy
- Type: `Documentation`
- Epic: `E1`
- Priority: `P1`
- Estimate: `S`
- Labels: `documentation`, `agents`, `phase-0`, `sprint-1`
- Description: As a maintainer, I want an explicit decision on whether `LEARNINGS.md` exists in this workflow so prompts stop depending on an undefined artifact.
- Scope:
  - choose between creating `LEARNINGS.md` or removing the dependency from prompts
  - document ownership and update rules if retained
- Acceptance Criteria:
  - a single clear decision is recorded
  - future workflow references are unambiguous
- Dependencies: `US-101`

#### US-104 Define Missing Specialized Agent Roles
- Type: `Research`
- Epic: `E1`
- Priority: `P1`
- Estimate: `M`
- Labels: `research`, `agents`, `workflow`, `phase-0`, `sprint-1`
- Description: As a maintainer, I want the missing specialized agent roles identified so large Option A tasks can be decomposed realistically.
- Scope:
  - define required specialized roles for Electron upgrade, test bootstrap, modularization, and dependency modernization
  - document each role's purpose, boundaries, and expected inputs/outputs
- Acceptance Criteria:
  - at least the key missing roles are defined
  - each role is linked to one or more roadmap epics
- Dependencies: `US-101`, `US-102`

## Sprint 2: Safety Net Bootstrap

### Sprint Goal
Establish the first reliable validation lane and the technical groundwork for automated tests.

### Stories

#### US-201 Create Application Startup Smoke Check
- Type: `QA`
- Epic: `E2`
- Priority: `P0`
- Estimate: `M`
- Labels: `qa`, `validation`, `electron`, `sprint-2`
- Description: As a maintainer, I want a smoke check for app startup so obvious breakages are caught before deeper refactoring.
- Scope:
  - define how to validate application launch
  - document expected success criteria
  - make the smoke path usable in local development and PR validation
- Acceptance Criteria:
  - a repeatable startup smoke check exists
  - expected outputs and failure modes are documented
- Dependencies: `US-102`

#### US-202 Bootstrap Jest Test Harness
- Type: `Infrastructure`
- Epic: `E2`
- Priority: `P1`
- Estimate: `M`
- Labels: `testing`, `jest`, `infrastructure`, `sprint-2`
- Description: As a maintainer, I want a Jest harness configured for this repository so unit tests can be added incrementally.
- Scope:
  - add test runner configuration
  - define folder structure for tests, mocks, and fixtures
  - document how tests are executed
- Acceptance Criteria:
  - Jest runs in the repository
  - test directory conventions are defined
  - at least one placeholder or sample test executes successfully
- Dependencies: `US-102`

#### US-203 Define Paper.js Mock Boundary Strategy
- Type: `Research`
- Epic: `E2`
- Priority: `P1`
- Estimate: `S`
- Labels: `testing`, `paperjs`, `research`, `sprint-2`
- Description: As a maintainer, I want a clear mocking strategy for Paper.js so tests can be written without unstable ad hoc stubs.
- Scope:
  - define what gets mocked versus integration-tested
  - document limits of mocks
  - identify modules that need real Paper.js coverage later
- Acceptance Criteria:
  - the mocking boundary is documented
  - high-risk areas that need integration tests are identified
- Dependencies: `US-202`

## Sprint 3: Core Test Foundation

### Sprint Goal
Create the first meaningful automated coverage on the highest-risk modules.

### Stories

#### US-301 Add GCODE Generation Test Suite
- Type: `QA`
- Epic: `E2`
- Priority: `P0`
- Estimate: `L`
- Labels: `testing`, `gcode`, `critical-path`, `sprint-3`
- Description: As a maintainer, I want automated tests around `gcode.js` so the core export path is protected before modernization.
- Scope:
  - create unit tests for basic generation, fill behavior, path processing, and settings application
  - add fixtures and golden outputs where appropriate
- Acceptance Criteria:
  - GCODE generation has a meaningful automated suite
  - happy path and edge cases are covered
  - failures are understandable and actionable
- Dependencies: `US-202`, `US-203`

#### US-302 Add File I/O and Settings Tests
- Type: `QA`
- Epic: `E2`
- Priority: `P1`
- Estimate: `M`
- Labels: `testing`, `file-io`, `settings`, `sprint-3`
- Description: As a maintainer, I want tests for file persistence and settings loading so common regressions are detected early.
- Scope:
  - cover save/load flows
  - cover malformed input handling
  - cover settings persistence and defaults
- Acceptance Criteria:
  - representative file I/O flows are tested
  - malformed or missing data behavior is checked
- Dependencies: `US-202`

#### US-303 Add Undo and Utility Test Coverage
- Type: `QA`
- Epic: `E2`
- Priority: `P2`
- Estimate: `M`
- Labels: `testing`, `undo`, `utilities`, `sprint-3`
- Description: As a maintainer, I want tests for undo behavior and utility helpers so later modularization can proceed with less risk.
- Scope:
  - cover undo stack behavior
  - cover selected utility functions with high reuse or high fragility
- Acceptance Criteria:
  - undo stack behavior is verified for representative scenarios
  - at least the highest-risk utilities are tested
- Dependencies: `US-202`

## Sprint 4: Electron Upgrade Readiness

### Sprint Goal
Reduce uncertainty around the Electron upgrade before changing runtime dependencies.

### Stories

#### US-401 Audit Electron Breaking Changes Against Current Code
- Type: `Research`
- Epic: `E3`
- Priority: `P0`
- Estimate: `M`
- Labels: `electron`, `research`, `upgrade`, `sprint-4`
- Description: As a maintainer, I want a mapped list of Electron breaking changes affecting this repo so upgrade work can be scoped accurately.
- Scope:
  - inspect main and renderer process usage
  - identify deprecated APIs and likely replacement patterns
  - document risk hotspots
- Acceptance Criteria:
  - a concrete migration inventory exists
  - the highest-risk areas are prioritized
- Dependencies: `US-201`, `US-301`

#### US-402 Prepare Main-Process Security Migration Plan
- Type: `Refactoring`
- Epic: `E3`
- Priority: `P1`
- Estimate: `M`
- Labels: `electron`, `security`, `main-process`, `sprint-4`
- Description: As a maintainer, I want a staged migration plan for Electron security defaults so the upgrade can be executed without uncontrolled breakage.
- Scope:
  - identify required changes for context isolation and node integration assumptions
  - document bridge or compatibility strategy where necessary
- Acceptance Criteria:
  - required security-related runtime changes are documented
  - affected modules are listed explicitly
- Dependencies: `US-401`

#### US-403 Prepare Renderer Compatibility Strategy
- Type: `Refactoring`
- Epic: `E3`
- Priority: `P1`
- Estimate: `M`
- Labels: `electron`, `renderer`, `compatibility`, `sprint-4`
- Description: As a maintainer, I want a renderer compatibility strategy so the upgrade does not fail on hidden remote or global assumptions.
- Scope:
  - inventory renderer-side main-process access
  - define compatibility steps for remote usage and global access patterns
- Acceptance Criteria:
  - renderer compatibility risks are documented
  - upgrade tasks can be split into issue-sized follow-ups
- Dependencies: `US-401`

## Sprint 5: Electron Upgrade Execution

### Sprint Goal
Move the app onto a supported Electron baseline and stabilize core workflows.

### Stories

#### US-501 Upgrade Electron Runtime and Package Configuration
- Type: `Infrastructure`
- Epic: `E3`
- Priority: `P0`
- Estimate: `L`
- Labels: `electron`, `infrastructure`, `upgrade`, `sprint-5`
- Description: As a maintainer, I want the project upgraded to a supported Electron baseline so security and compatibility risk are reduced.
- Scope:
  - update Electron dependencies
  - update package-level configuration required for the upgrade
  - keep the change scoped to runtime upgrade concerns
- Acceptance Criteria:
  - project runs on the target Electron version
  - no known startup blockers remain
- Dependencies: `US-401`, `US-402`, `US-403`

#### US-502 Adapt Main and Renderer Processes for New Electron APIs
- Type: `Refactoring`
- Epic: `E3`
- Priority: `P1`
- Estimate: `L`
- Labels: `electron`, `refactoring`, `api-migration`, `sprint-5`
- Description: As a maintainer, I want the main and renderer processes adapted for new Electron APIs so the app remains functional after the upgrade.
- Scope:
  - update main process API usage
  - update renderer access patterns where necessary
  - preserve current user workflows
- Acceptance Criteria:
  - core interactions work under the new Electron version
  - major deprecated API usage on the critical path is removed
- Dependencies: `US-501`

#### US-503 Run Post-Upgrade Smoke and Regression Validation
- Type: `QA`
- Epic: `E3`
- Priority: `P0`
- Estimate: `M`
- Labels: `qa`, `electron`, `regression`, `sprint-5`
- Description: As a maintainer, I want post-upgrade smoke and regression validation so the Electron migration is accepted on evidence, not assumption.
- Scope:
  - validate startup, drawing, export, and settings flows
  - capture failures as follow-up defects if needed
- Acceptance Criteria:
  - the agreed smoke path passes
  - known regressions are documented explicitly
- Dependencies: `US-501`, `US-502`

## Sprint 6: Modularization I

### Sprint Goal
Extract low-risk but high-value renderer responsibilities into explicit modules.

### Stories

#### US-601 Extract File Management Module
- Type: `Refactoring`
- Epic: `E4`
- Priority: `P1`
- Estimate: `M`
- Labels: `refactoring`, `file-management`, `renderer`, `sprint-6`
- Description: As a maintainer, I want file management logic extracted from `app.js` so responsibilities become easier to test and change.
- Scope:
  - isolate current file state and related logic
  - preserve behavior during extraction
  - add or adjust tests around extracted behavior
- Acceptance Criteria:
  - file management logic is separated from the monolith
  - no functional regressions are introduced
- Dependencies: `US-302`, `US-503`

#### US-602 Extract Settings Management Module
- Type: `Refactoring`
- Epic: `E4`
- Priority: `P1`
- Estimate: `M`
- Labels: `refactoring`, `settings`, `renderer`, `sprint-6`
- Description: As a maintainer, I want settings handling extracted into a dedicated module so preferences become easier to reason about and validate.
- Scope:
  - isolate settings-related logic and boundaries
  - preserve persistence behavior
- Acceptance Criteria:
  - settings responsibilities are isolated
  - existing settings behavior remains intact
- Dependencies: `US-302`, `US-503`

#### US-603 Add Module-Level Tests for Extracted Services
- Type: `QA`
- Epic: `E4`
- Priority: `P2`
- Estimate: `M`
- Labels: `testing`, `modularization`, `sprint-6`
- Description: As a maintainer, I want tests around the newly extracted modules so modularization gains are protected.
- Scope:
  - add tests for extracted file and settings logic
  - validate preserved behavior against legacy flows
- Acceptance Criteria:
  - extracted modules have direct automated coverage
  - legacy behavior remains intact
- Dependencies: `US-601`, `US-602`

## Sprint 7: Modularization II and Tool Contracts

### Sprint Goal
Reduce renderer coupling further and formalize the tool/helper boundaries.

### Stories

#### US-701 Extract UI and Paper Bridge Responsibilities
- Type: `Refactoring`
- Epic: `E4`
- Priority: `P1`
- Estimate: `L`
- Labels: `refactoring`, `ui`, `paperjs`, `sprint-7`
- Description: As a maintainer, I want UI orchestration and Paper.js bridge logic separated from `app.js` so renderer composition becomes explicit.
- Scope:
  - separate UI event wiring from business logic
  - isolate integration between renderer shell and Paper.js
- Acceptance Criteria:
  - major UI and bridge responsibilities are extracted
  - the new boundaries are documented
- Dependencies: `US-601`, `US-602`

#### US-702 Introduce BaseTool and BaseHelper Contracts
- Type: `Refactoring`
- Epic: `E5`
- Priority: `P1`
- Estimate: `M`
- Labels: `refactoring`, `tools`, `helpers`, `sprint-7`
- Description: As a maintainer, I want explicit base contracts for tools and helpers so extension points become clearer and more testable.
- Scope:
  - define base abstractions
  - document expected responsibilities and lifecycle boundaries
- Acceptance Criteria:
  - base contracts exist and are used as the target abstraction
  - contract purpose is documented clearly
- Dependencies: `US-301`, `US-701`

#### US-703 Add Registry-Based Tool Loading
- Type: `Refactoring`
- Epic: `E5`
- Priority: `P2`
- Estimate: `M`
- Labels: `refactoring`, `tool-registry`, `sprint-7`
- Description: As a maintainer, I want registry-based tool loading so the tool system becomes less implicit and easier to extend.
- Scope:
  - replace direct implicit loading where appropriate
  - preserve runtime behavior
- Acceptance Criteria:
  - tool loading is more explicit than before
  - the system still supports the existing tool set
- Dependencies: `US-702`

## Sprint 8: Dependency Modernization and Operational Hardening

### Sprint Goal
Reduce key legacy dependencies and improve operational resilience.

### Stories

#### US-801 Upgrade Paper.js with Regression Coverage
- Type: `Refactoring`
- Epic: `E5`
- Priority: `P1`
- Estimate: `L`
- Labels: `paperjs`, `refactoring`, `dependencies`, `sprint-8`
- Description: As a maintainer, I want Paper.js upgraded with regression protection so the drawing engine becomes less dependent on legacy library behavior.
- Scope:
  - upgrade Paper.js
  - validate critical drawing and path flows
  - record any compatibility gaps
- Acceptance Criteria:
  - target Paper.js version is integrated
  - major drawing workflows are validated
- Dependencies: `US-503`, `US-701`

#### US-802 Upgrade i18next and Stabilize Translation Flow
- Type: `Refactoring`
- Epic: `E5`
- Priority: `P2`
- Estimate: `M`
- Labels: `i18n`, `dependencies`, `refactoring`, `sprint-8`
- Description: As a maintainer, I want i18next upgraded so localization remains maintainable on current dependencies.
- Scope:
  - upgrade i18next
  - verify translation helpers and menu strings
- Acceptance Criteria:
  - i18n upgrade is complete
  - core translation flows still work
- Dependencies: `US-503`

#### US-803 Reduce jQuery Dependence on the Critical Path
- Type: `Refactoring`
- Epic: `E5`
- Priority: `P2`
- Estimate: `L`
- Labels: `jquery`, `refactoring`, `renderer`, `sprint-8`
- Description: As a maintainer, I want jQuery usage reduced on critical paths so the renderer becomes easier to modernize later.
- Scope:
  - identify and replace the most critical jQuery usage first
  - avoid large UI rewrites in this sprint
- Acceptance Criteria:
  - critical-path jQuery use is reduced
  - no broad UI rewrite is introduced unintentionally
- Dependencies: `US-701`

#### US-804 Add Logging and User-Facing Error Handling
- Type: `Infrastructure`
- Epic: `E5`
- Priority: `P1`
- Estimate: `M`
- Labels: `logging`, `errors`, `quality`, `sprint-8`
- Description: As a maintainer, I want structured logging and better user-facing errors so failures are diagnosable during and after modernization.
- Scope:
  - add a logging strategy
  - add error handling on critical paths
  - define user-facing error messaging behavior
- Acceptance Criteria:
  - critical failures are logged
  - user-facing messages are clearer than silent failures
- Dependencies: `US-503`

## Sprint 9: Release Readiness

### Sprint Goal
Complete the Option A safety net, documentation, and release preparation.

### Stories

#### US-901 Expand Integration and Regression Coverage
- Type: `QA`
- Epic: `E6`
- Priority: `P1`
- Estimate: `L`
- Labels: `testing`, `integration`, `regression`, `sprint-9`
- Description: As a maintainer, I want integration and regression coverage expanded so the modernized codebase is stable enough for release.
- Scope:
  - add integration coverage for export and key workflow interactions
  - add golden-file style regression checks where valuable
- Acceptance Criteria:
  - key integration paths have automated coverage
  - regression outputs are captured for critical workflows
- Dependencies: `US-301`, `US-601`, `US-801`

#### US-902 Document Repo-Native Workflow and Contributor Path
- Type: `Documentation`
- Epic: `E6`
- Priority: `P1`
- Estimate: `M`
- Labels: `documentation`, `workflow`, `contributors`, `sprint-9`
- Description: As a maintainer, I want documentation updated for the new workflow so contributors can work with the modernized repo and agent setup.
- Scope:
  - update contributor-facing workflow documentation
  - update validation and testing documentation
  - document new module boundaries and operational expectations
- Acceptance Criteria:
  - contributor workflow is documented
  - testing and validation docs reflect the actual repo state
- Dependencies: `US-102`, `US-202`, `US-701`, `US-804`

#### US-903 Prepare Controlled Modernization Release
- Type: `Documentation`
- Epic: `E6`
- Priority: `P2`
- Estimate: `M`
- Labels: `release`, `documentation`, `planning`, `sprint-9`
- Description: As a maintainer, I want a controlled release plan for Option A so modernization outcomes are shipped with explicit validation evidence and rollback awareness.
- Scope:
  - define release checklist
  - define rollback considerations
  - define release note structure
- Acceptance Criteria:
  - release checklist exists
  - release note inputs are prepared
  - rollback considerations are documented
- Dependencies: `US-901`, `US-902`

## Sequencing Guidance For Sprint Planning Prompt

When selecting issues for a specific sprint, the planning agent should apply these rules:

1. Always include unresolved `P0` and `P1` blockers before optional work.
2. Do not schedule stories whose dependencies are not already completed or planned within the same sprint.
3. Avoid placing more than one `L` infrastructure or dependency issue in the same sprint unless the sprint goal is explicitly a stabilization sprint.
4. Pair risky refactoring stories with at least one QA or documentation story in the same sprint where possible.
5. Do not schedule Option B or Option C work while Option A is in progress.

## Suggested Milestone Naming

- `Sprint #1`
- `Sprint #2`
- `Sprint #3`
- `Sprint #4`
- `Sprint #5`
- `Sprint #6`
- `Sprint #7`
- `Sprint #8`
- `Sprint #9`

## Suggested Labels

### Type Labels

- `feature`
- `bug`
- `tech-debt`
- `infrastructure`
- `security`
- `documentation`
- `qa`
- `refactoring`
- `research`

### Domain Labels

- `agents`
- `workflow`
- `testing`
- `electron`
- `paperjs`
- `renderer`
- `file-io`
- `settings`
- `tools`
- `helpers`
- `logging`
- `release`

### Roadmap Labels

- `phase-0`
- `phase-1`
- `phase-2`
- `phase-3`
- `phase-4`
- `option-a`
- `critical-path`

## Authoritative References

- [refactoring-strategy.md](./refactoring-strategy.md)
- [testing-strategy.md](./testing-strategy.md)
- [architecture-analysis.md](./architecture-analysis.md)
- [agent-workflow-recommendations.md](./agent-workflow-recommendations.md)
