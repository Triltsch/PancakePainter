# Refactoring Strategy & Options

## Executive Summary

PancakePainter has **good foundational architecture** but suffers from **critical security/stability issues** (outdated Electron) and **missing development practices** (no tests, global state). This document presents three refactoring strategies with increasing scope and risk.

The current `.github` agent structure improves **workflow control, review rigor, and merge safety**, but it does **not yet provide a repository-native implementation workflow** for this Electron/JavaScript codebase. The current prompts assume infrastructure such as Docker, pytest, VS Code tasks, and `LEARNINGS.md` that do not currently exist in this repository.

**Recommended:** **Revised Option A (Evolutionary Refactoring with Phase 0 Agent/Repository Alignment)** for the next 6-12 months. Option B should be deferred until the agent layer is expanded with implementation-specialized prompts or agents.

---

## Decision Matrix

| Factor | Option A | Option B | Option C |
|--------|----------|----------|----------|
| **Timeline** | 14-20 weeks | 6-9 months | 6-12 months |
| **Risk** | Low-Medium | Medium-High | High |
| **Effort** | 400-600 hours | 800-1200 hours | 1200-1600 hours |
| **Disruption** | Minimal | Moderate | Complete |
| **Breaking Changes** | Few | Some | All |
| **Preserves** | 80% code | 40% code | 0% (rewrite) |
| **Can Deploy Incrementally** | Yes | Partial | No |
| **Agent-Suitable** | After Phase 0 alignment | Limited with current agent set | No |

---

## Agent-Structure Baseline

The current agent layer is built around three effective capabilities:

1. **End-to-end orchestration** via `pancake-orchestrator`
2. **Strict PR review execution** via `mcp-pr-review`
3. **Read-only exploration** via `Explore`

This is a strong delivery shell, but it is not yet a refactoring platform for this repository.

### What the current agents support well

- Gated multi-stage delivery for small and medium scoped changes
- Strong PR review handling and structured follow-up on feedback
- Explicit checkpoints, blockers, and merge approvals
- Safe incremental rollout once repository-native validation exists

### What the current agents do not support well yet

- Repository-native implementation validation for this Electron app
- Specialized dependency-upgrade or legacy-migration execution
- Parallel multi-stream refactoring work
- Reliable automation based on the currently referenced prompts, because those prompts assume tasks and infrastructure that are not present in this repository

### Current mismatch that affects strategy

The implementation and review prompts currently assume all of the following:

- a `Checks` task
- a `Test: Verified` task
- Docker Compose
- Redis and PostgreSQL
- `pytest`
- `.vscode/tasks.json`
- `LEARNINGS.md`

Those assumptions do not match the current PancakePainter repository. As long as that mismatch remains, the agent structure is better suited for governance than for direct execution of major refactoring work.

---

## Option A: Evolutionary Refactoring ✅ **RECOMMENDED**

### Philosophy
Improve incrementally while preserving existing functionality, but first align the agent workflow to the real repository. The strategy starts with a short preparation phase so that subsequent refactoring work can be executed and validated through the current agent pipeline without relying on non-existent infrastructure.

### Timeline: 14-20 weeks

### Phase 0: Agent/Repository Alignment (Weeks 0-2) — **MANDATORY PRECONDITION**

#### 0.1 Make the agent workflow repository-native
**Why:** The current prompt and agent layer assumes a different stack than this repository actually uses.

**Steps:**
1. Rewrite the implementation and review prompts so they fit PancakePainter's JavaScript/Electron workflow.
2. Replace references to Docker, `pytest`, `Test: Verified`, Redis, PostgreSQL, and `.vscode/tasks.json` unless those are intentionally added later.
3. Define real validation commands for this repo:
   - install dependencies
   - linting or static checks
   - app startup smoke check
   - targeted tests once the test suite exists
4. Decide whether `LEARNINGS.md` should be introduced and maintained, or removed from the prompt contract.
5. Add missing implementation-specialized prompts or agents for:
   - legacy Electron upgrade
   - test bootstrap
   - module extraction
   - dependency modernization

**Effort:** 20-40 hours
**Risk:** Low
**Output:** A repository-native agent workflow that can execute the rest of this strategy safely

---

### Phase 1: Minimal Safety Net (Weeks 3-6) — **CRITICAL PATH**

#### 1.1 Establish Real Validation First (Weeks 3-4)
**Why:** The current agent orchestration is only useful for refactoring once the repository has a real, repeatable validation lane.

**Steps:**
1. Establish one minimal but reliable validation path for the repo.
2. Start with repo-native checks instead of framework assumptions from the current prompts.
3. Add smoke validation for:
   - application startup
   - main renderer load path
   - export flow where feasible
4. Bootstrap initial automated tests around the highest-risk modules first.

**Effort:** 40-70 hours
**Risk:** Low-Medium
**Rollback Plan:** Easy, because this phase is additive

---

#### 1.2 Upgrade Electron to LTS Preparation (Weeks 4-6)
**Why:** Current version 1.0.1 (2016) is unsupported and insecure, but the upgrade should not begin until the repo has minimal validation and repo-native prompt support.

**Steps:**
1. Create feature branch: `upgrade/electron-lts`
2. Update `package.json`:
   ```json
   "electronVersion": "28.0.0",
   "devDependencies": {
     "electron": "^28.0.0"
   }
   ```
3. Audit breaking changes:
   - IPC API changes (use `ipcRenderer.invoke` instead of callbacks)
   - Deprecated APIs in main.js (window management, app APIs)
   - Security defaults (contextIsolation, nodeIntegration)
4. Update main.js:
   - Set `contextIsolation: true`, `nodeIntegration: false` for security
   - Update IPC patterns to modern async/await
5. Test thoroughly using the repo-native validation workflow established in Phase 0 and Phase 1
6. Merge and tag: `v1.5.0-electron-upgrade`

**Effort:** 40-60 hours
**Risk:** Medium (API breakage, testing required)
**Rollback Plan:** Easy (keep old branch, quick revert)

---

#### 1.3 Establish Test Infrastructure (Weeks 4-6)
**Why:** Cannot refactor safely without tests.

**Framework Choice:** Jest remains the best fit, but the supporting validation and execution model must be defined for this repository rather than inherited from the current generic prompts.

**Steps:**
1. Install Jest and supporting tooling.
2. Create a repo-native test structure for unit, integration, and fixtures.
3. Start with critical paths first:
   - GCODE generation
   - file I/O
   - settings handling
4. Mock Paper.js objects initially; add broader integration coverage later.
5. Define actual package scripts or tasks that agents can invoke reliably.

**Effort:** 80-120 hours
**Risk:** Low
**Outputs:** Passing initial tests, documented validation path, coverage baseline

---

#### 1.4 Add Type Safety (TypeScript/JSDoc) (Weeks 5-6, in parallel)
**Why:** Enables IDE support, catches bugs, and improves agent-assisted work by making contracts clearer.

**Approach:** Gradual TypeScript migration or TypeScript-compatible JSDoc, depending on what proves less disruptive during Phase 0.

**Steps:**
1. Install TypeScript support.
2. Add a loose `tsconfig.json` suitable for gradual adoption.
3. Add JSDoc to public APIs first.
4. Document Paper.js extensions and high-risk module boundaries.
5. Tighten type checking incrementally after the Electron upgrade stabilizes.

**Effort:** 40-60 hours
**Risk:** Low
**Output:** Better IDE support and self-documenting module boundaries

---

### Phase 2: Modularization (Weeks 7-12)

#### 2.1 Break Up app.js (Weeks 7-9)
**Why:** app.js is monolithic and remains one of the largest obstacles to safe change.

**Target Structure:**
```
src/
├── app.js (simplified launcher)
├── modules/
│   ├── ui/
│   │   ├── menu-handler.js
│   │   ├── dialog-handler.js
│   │   └── toolbar.js
│   ├── state/
│   │   ├── canvas-state.js
│   │   ├── undo-manager.js
│   │   └── file-manager.js
│   └── integration/
│       └── paper-bridge.js
```

**Specific Tasks:**
1. Extract `FileManager`
2. Extract `UiManager`
3. Extract `PaperBridge`
4. Extract `SettingsManager`
5. Refactor app.js to orchestrate these modules

**Testing:** Write or expand unit tests for each extracted module
**Effort:** 120-160 hours
**Risk:** Medium

---

#### 2.2 Modernize Tool & Helper Architecture (Weeks 10-12)
**Why:** The tool/helper system is one of the better parts of the codebase, but it lacks explicit contracts that would help both human maintainers and agents.

**Steps:**
1. Create `BaseTool`
2. Create `BaseHelper`
3. Refactor existing tools/helpers to extend those bases
4. Add registry-based loading where it reduces implicit coupling

**Benefit:** Makes architecture explicit and improves testability
**Testing:** Each tool/helper becomes independently testable
**Effort:** 40-80 hours
**Risk:** Low

---

### Phase 3: Dependency Modernization (Weeks 13-16)

#### 3.1 Upgrade Core Dependencies
**Which packages and in what order:**

**Week 13:** Paper.js (0.10.2 → 0.12.x)
- Test all drawing and path operations
- May have minor API changes
- Effort: 20-40 hours

**Week 14:** i18next (1.10.4 → 23.x)
- Breaking API changes but straightforward migration
- Effort: 10-20 hours

**Week 15:** Replace jQuery → Vanilla JS
- Replace remaining jQuery patterns only after validation is stable
- Effort: 40-60 hours

**Week 16:** Review and test
- Integration testing
- Bug fixes
- Performance validation

---

#### 3.2 Add Error Handling & Logging (Weeks 14-16, in parallel)
**Steps:**
1. Integrate a logging library such as Winston
2. Add error boundaries around tool events and file I/O
3. Add user-facing error dialogs with clean messages

**Effort:** 30-50 hours
**Coverage:** All critical paths

---

### Phase 4: Polish & Documentation (Weeks 17-20)

#### 4.1 Complete Test Coverage (Weeks 17-18)
- Fill gaps in core modules
- Aim for 70%+ coverage on critical paths
- Add integration tests for export workflow

**Effort:** 60-80 hours

#### 4.2 Documentation (Weeks 19-20)
- Update this refactoring guide with what was done
- Document new module structure
- Document testing guidelines for contributors
- Document repo-native agent workflow conventions
- Add troubleshooting guidance

**Effort:** 40-60 hours

#### 4.3 Release (Week 20)
- Tag as `v1.6.0` or equivalent modernization release
- Release notes: Electron upgrade, tests, modularization, prompt alignment
- Gather user feedback

---

### Option A: Implementation Roadmap

| Week | Focus | Deliverable |
|------|-------|-------------|
| 0-2 | Agent alignment | Repo-native prompts, validation contract, missing agent roles defined |
| 3-4 | Safety net | Smoke checks, first validation lane, initial test bootstrap |
| 4-6 | Electron preparation + tests | v1.5.0 upgrade path validated, Jest setup |
| 5-6 | JSDoc/TypeScript | Type comments, IDE support |
| 7-9 | Break up app.js | Modular file structure |
| 10-12 | Formalize tools | Base classes, registry |
| 13-16 | Dependencies | Upgraded Paper.js, i18next, no jQuery |
| 14-16 | Error handling | Logger integration, user-facing errors |
| 17-18 | Test completion | 70%+ coverage, integration tests |
| 19-20 | Documentation + release | Guides, API docs, troubleshooting, production release |

### Option A: Success Criteria

- ✅ Agent prompts and workflow are aligned to this repository
- ✅ Real validation commands or tasks exist and are documented
- ✅ All tests passing (Jest, 40+ tests, 60%+ core coverage)
- ✅ Electron 28+ running stable
- ✅ No jQuery in main codebase
- ✅ Modular structure (ui, state, integration modules)
- ✅ Error handling on all critical paths
- ✅ TypeScript/JSDoc coverage on public APIs
- ✅ Full documentation updated

### Option A: Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Agent workflow does not match the repo | Complete Phase 0 before code modernization |
| Electron upgrade breaks features | Comprehensive testing before merge, parallel branch |
| Test maintenance overhead | Start with critical paths, auto-run in CI |
| Modularization creates new bugs | Gradual refactoring, feature-branch per module |
| Dependency conflicts | Test each upgrade independently |

---

## Option B: Partial Re-Architecture ⚠️ Moderate Scope

### Philosophy
Replace major components while preserving core logic. This only becomes realistic after Option A succeeds and the agent layer is expanded beyond orchestration and PR review.

### Timeline: 6-9 months

### Major Changes
1. **Replace Paper.js with Fabric.js or Konva.js** (more modern, better docs)
2. **Migrate UI to Vue.js 3** (lightweight, good for this use case)
3. **Implement state management** (Pinia for Vue)
4. **Restructure main process** (use modern IPC patterns)
5. **Replace autotrace** with JavaScript solution (Potrace.js or similar)

### New Structure
```
src/
├── main/                    # Node.js main process (Electron)
│   ├── main-window.ts       # Window management
│   ├── ipc-handlers.ts      # IPC message handlers
│   └── services/            # File I/O, autotrace, etc.
├── renderer/                # Vue.js app
│   ├── App.vue              # Root component
│   ├── components/          # UI components
│   │   ├── Canvas.vue       # Drawing canvas
│   │   ├── Toolbar.vue      # Tool selection
│   │   ├── Menu.vue         # Menu bar
│   │   └── SettingsPanel.vue
│   ├── store/               # Pinia state
│   │   ├── canvas-store.ts
│   │   ├── settings-store.ts
│   │   └── file-store.ts
│   ├── services/            # API layer
│   │   ├── canvas-service.ts
│   │   ├── export-service.ts
│   │   └── import-service.ts
│   └── main.ts              # Renderer entry
├── shared/                  # Shared types/utils
│   ├── types.ts
│   └── constants.ts
└── tests/                   # Full test coverage
```

### Migration Path
1. Create new directory structure in parallel
2. Start with core modules (GCODE generation, file I/O)
3. Migrate UI piece by piece (toolbar → canvas → menu)
4. Final cutover when feature-parity achieved
5. Keep old code for fallback during transition

### Effort Estimate: 800-1200 hours
### Risk: Medium (large refactoring, testing catches issues)
### Agent-Suitable: Limited with current agent set; reasonable only after adding implementation-specialized prompts or agents

---

## Option C: Full Rebuild / Greenfield ❌ Not Recommended

### Philosophy
Start from scratch using modern architecture and tools.

### Why not recommended for this project:
1. **Too disruptive** — Users of v1.4.0 are stable; complete outage risks loyalty
2. **Unnecessary** — Current architecture is sound, main issue is legacy tooling
3. **Excessive effort** — 1200-1600 hours = 6-8 developer-months
4. **Preservation failure** — Institutional knowledge of quirks lost
5. **Risk multiplication** — New bugs introduced during rewrite
6. **Poor fit for the current agent structure** — the current system is optimized for controlled staged delivery, not high-velocity greenfield execution

### When Option C might be justified:
- Complete architecture pivot needed (e.g., cloud-based vs desktop)
- Business model changes (e.g., from one-time purchase to SaaS)
- Performance requirements impossible to meet with current approach
- **None of these apply to PancakePainter today**

---

## Detailed Roadmap for Option A

### Week-by-Week Breakdown

#### Week 1-2: Electron Upgrade
**Branch:** `upgrade/electron-28`  
**Agent:** Copilot Code Review + Manual Testing
1. Day 1-3: Update package.json, dependencies, run `npm install`
2. Day 4-5: Identify breaking changes (run app, fix errors)
3. Day 6-7: Update main.js for new API patterns
4. Day 8-9: Update IPC patterns to async/await
5. Day 10-14: Comprehensive testing (drawing, export, settings)
6. Merge → tag v1.5.0

**Acceptance Criteria:**
- App launches without errors
- All drawing primitives work
- Export to GCODE works
- Settings persist
- No console warnings about deprecated APIs

---

#### Week 2-4: Test Infrastructure
**Branch:** `feature/test-infrastructure`  
**Agent:** Test scaffolding automation
1. Install Jest, configure (Week 2, Days 1-2)
2. Write gcode.js tests: 40+ tests; 90%+ coverage (Week 2-3, Days 3-14)
   - Test with various path types, fills, colors
   - Edge cases: empty paths, overlapping fills, bounds
3. Write helper.undo.js tests: 20+ tests (Week 3, Days 1-7)
4. Write file I/O tests: 20+ tests (Week 3-4, Days 1-7)
5. Set up CI integration (Week 4, Days 1-3)

**Acceptance Criteria:**
- `npm test` runs 80+ tests
- 60%+ coverage of gcode.js, helpers
- All tests passing
- CI runs tests on pull requests

---

#### Week 3-4: JSDoc/Type Comments
**Branch:** `feature/improve-types` (parallel with testing)  
**Agent:** Copilot + verification
1. Document main.js (app constants, functions)
2. Document app.js public APIs
3. Document each tool and helper
4. Document gcode.js (complex algorithms)
5. Enable TypeScript checking for these files

**Effort:** 40-60 hours
**Format:**
```javascript
/**
 * Generate GCODE from a Paper.js layer
 * @param {paper.Layer} sourceLayer - Layer to export
 * @param {Object} settings - Export settings (flatten, speeds, fills)
 * @returns {string} GCODE text
 * @throws {Error} If layer contains invalid paths
 */
function generateGcode(sourceLayer, settings) { ... }
```

---

#### Week 5-7: Modularize app.js
**Branch:** `refactor/modularize-app`

**Create new structure:**
```
src/modules/
├── file-manager.js      (current file state, I/O)
├── ui-manager.js        (menu, dialogs, toolbar)
├── settings-manager.js  (app preferences)
├── paper-bridge.js      (paper.js integration)
└── index.js             (exports all managers)
```

**Steps per file:**
1. Extract logic into new module
2. Define clear public API (JSDoc)
3. Write unit tests
4. Update app.js to use new module
5. Test in isolation

**Effort:** 120-160 hours
**Tests:** New tests for each module; refactor existing tests

---

#### Week 8-9: Tool/Helper Refactoring
**Branch:** `refactor/tool-architecture`

**Create base classes:**
```javascript
// src/core/BaseTool.js
export class BaseTool {
  constructor(paper) {
    this.paper = paper;
  }
  activate() {}
  deactivate() {}
  getName() { throw new Error('Must implement'); }
}

// src/core/BaseHelper.js
export class BaseHelper {
  constructor(paper) {
    this.paper = paper;
  }
  getName() { }
}
```

**Refactor existing tools:**
1. `tool.pen.js` extends `BaseTool`
2. `tool.fill.js` extends `BaseTool`
3. `tool.select.js` extends `BaseTool`

**Create registry:**
```javascript
// src/core/ToolRegistry.js
export class ToolRegistry {
  static register(name, ToolClass) { ... }
  static getAll() { ... }
  static create(paper) { ... }
}
```

---

#### Week 11-14: Dependency Upgrades

**Week 11: Paper.js**
- Create feature branch `upgrade/paperjs`
- Update to 0.12.x (latest stable)
- Comprehensive testing
- Effort: 20-40 hours

**Week 12: i18next**
- Update to v23.x
- Minor API changes (old-style callback → async)
- Effort: 10-20 hours

**Week 13: jQuery → Vanilla JS**
- Identify all jQuery usages
- Replace with DOM API / Vue (if started UI migration)
- Effort: 40-60 hours

**Week 14: Integration testing**
- Run full app
- Test all workflows
- Performance check

---

#### Week 15-16: Complete Test Coverage
**Remaining coverage:**
- Tools: pen, fill, select tools (60+ tests)
- Integration: export end-to-end (30+ tests)
- UI: menu handlers, dialogs (if modularized)
- Edge cases: corrupted files, invalid settings

**Target:** 70%+ coverage of critical paths

---

#### Week 16-18: Documentation & Release
**Documents to create/update:**
- [ARCHITECTURE.md](ARCHITECTURE.md) — Updated structure
- [TESTING.md](TESTING.md) — How to write tests
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Common issues
- Update README with new build/test commands

**Release:**
- Tag: `v1.6.0-modernized`
- Release notes: bullet points on Electron, tests, modularization
- GitHub release post

---

## Comparing the Three Options

### Option A (Evolutionary) — **Recommended**
**Pros:**
- ✅ Low risk, incremental validation at each phase
- ✅ Can deploy incrementally; not "big bang"
- ✅ Preserves existing working code
- ✅ Learning opportunity for team
- ✅ Users don't experience outage
- ✅ Best fit for the current orchestrator + review-agent structure once Phase 0 is completed

**Cons:**
- ❌ Longer timeline (20 weeks if Phase 0 is included)
- ❌ Requires up-front workflow and prompt cleanup before refactoring starts
- ❌ Some "technical compromises" (e.g., Paper.js not fully replaced)

**Who should choose:** Most teams; especially important for production software with user base

---

### Option B (Partial Re-Architecture) — **Future Consideration**
**Pros:**
- ✅ Modern architecture after completion
- ✅ Better extensibility for future
- ✅ Clear component separation
- ✅ Vue.js is easier for teams to maintain

**Cons:**
- ❌ Significant effort (9 months)
- ❌ Medium risk (large refactoring)
- ❌ May introduce new bugs
- ❌ User gap: older version vs new version
- ❌ Current agent structure does not yet include the implementation-specialized roles needed for this approach

**Who should choose:** Teams that have completed Option A, stabilized validation, and expanded the agent layer with migration-specific prompts or subagents

**Timing:** Do Option A first, then re-evaluate for Option B in Year 2

---

### Option C (Full Rebuild) — **Not Recommended**
**Pros:**
- ✅ Greenfield simplicity
- ✅ No legacy code baggage

**Cons:**
- ❌ High risk (massive scope)
- ❌ Knowledge loss (why quirks exist)
- ❌ New bugs introduced
- ❌ 6-8 developer-months
- ❌ User experience interruption

**Not Recommended Because:**
- PancakePainter is not broken; it's just old
- Incremental improvement is safer and cheaper
- Current architecture is sound; tooling is the issue
- The current agent structure does not support greenfield rebuild work efficiently enough to justify the risk

---

## Recommendations by Persona

### For Product Managers
- **Choose revised Option A** — Maintains user stability while modernizing and reduces delivery risk by aligning the workflow before technical changes
- Timeline: 5-6 months to production
- Cost: ~$100K-150K (600 hours @ $150-250/hr)
- Benefit: Modern, maintainable codebase; unbroken user experience

### For Development Teams
- **Phase 0 first** — Align prompts, validation, and agent contracts to the real repo
- **Then Phase 1** — Safety net, test bootstrap, Electron preparation
- **Then later phases** — Modularization, dependency modernization, release

### For CTOs / Technical Leads
- **Risk Assessment:** Low-Medium with revised Option A; medium-high with Option B under the current agent layer
- **Technical Debt Reduction:** Significant (eliminates security/stability blockers)
- **Agents Readiness:** The current setup is governance-ready, not implementation-ready; Phase 0 closes that gap
- **Recommendation:** Pursue revised Option A, not direct modernization from the current prompt set

---

## Next Steps

1. **Update the agent prompts and contracts first** so they match the PancakePainter repository
2. **Read [agent-workflow-recommendations.md](agent-workflow-recommendations.md)** for task decomposition and control flow
3. **Read [testing-strategy.md](testing-strategy.md)** and adapt it to repo-native validation commands
4. **Start Phase 0:** define real validation, decide on `LEARNINGS.md`, and add missing implementation-specialized prompts or agents
5. **Checkpoint:** after Phase 0, confirm that the repo is ready for Electron modernization and test expansion

**Done!** This revised strategy is your roadmap for the next 6-12 months of development under the current pancake agent structure.
