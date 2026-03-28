# Agent-Based Development Workflow Recommendations

## Overview

This document explains how to effectively use **GitHub Copilot** and **multi-agent orchestration** to refactor PancakePainter using the strategies outlined in previous documents. It provides concrete task decomposition, execution order, and guardrails.

---

## 1. Agent Readiness Assessment

### Current State: **Requires Foundation Work**

PancakePainter is **not ready** for autonomous agent refactoring without preparation:

| Blocker | Impact | Mitigation |
|---------|--------|-----------|
| No test suite | ❌ Agents can't verify changes | Establish tests in Phase 1 |
| Global state | ❌ Agents can't safely refactor | Modularize in Phase 2 |
| Legacy Electron | ❌ APIs will break | Upgrade in Phase 1 |
| Monolithic files | ❌ Agents struggle with scope | Split in Phase 2 |

### After Foundation Work (Week 4): **Ready for Partnership**

Once test infrastructure + Electron upgrade complete:
- ✅ Agents can modify code with confidence
- ✅ Tests catch regressions automatically
- ✅ Smaller files = clear scope
- ✅ Modern APIs = no API chasing

---

## 2. Human + Agent Workflow Model

### The "Pair Programming" Approach

```
    Human              Copilot              Tests
      │                  │                   │
      │─ Review code ──→│                   │
      │                 │─ Generate fix ──→│
      │                 │                   │
      │    ←── Suggest ──┤                   │
      │                 │                   │
      │─ Accept/Reject ─→                  │ (auto-run)
      │                 │                   │
      │←─ Test Results ─┴─ Run & Report ────┤
      │
    Decision:
    Merge / Request changes / Rollback
```

### Best Practices

**DO:**
- ✅ Use Copilot for code generation + refactoring
- ✅ Use Copilot for writing tests
- ✅ Use Copilot for documentation
- ✅ Let tests drive acceptance
- ✅ Review Copilot suggestions carefully
- ✅ Commit frequently (small changeset per agent task)

**DON'T:**
- ❌ Merge without test verification
- ❌ Use Copilot before establishing tests
- ❌ Mix multiple refactorings in one PR
- ❌ Ignore test failures
- ❌ Let agents decide architecture (you decide, agents implement)

---

## 3. Task Decomposition for Option A (Evolutionary Refactoring)

### Decomposition Rules

Each agent task should:
1. **Be completeable in 1-3 hours** of Copilot time
2. **Have clear acceptance criteria** (tests pass, no warnings)
3. **Not depend on other tasks** (or explicitly declare dependency)
4. **Fit in one pull request** (one concern per PR)
5. **Be independently reviewable** (reviewer doesn't need context of previous tasks)

### Task Hierarchy

```
Phase 1: Foundation (Critical Path)
├─ Task 1.1: Electron Upgrade  [Human: 40h | Copilot: 4h]
├─ Task 1.2: Jest Installation  [Human: 2h | Copilot: 1h]
├─ Task 1.3: Write GCODE Tests  [Human: 2h | Copilot: 10h]
├─ Task 1.4: Write Helper Tests [Human: 2h | Copilot: 8h]
└─ Task 1.5: Write File Tests   [Human: 2h | Copilot: 8h]

Phase 2: Modularization
├─ Task 2.1: Extract FileManager   [Human: 2h | Copilot: 4h]
├─ Task 2.2: Extract UiManager     [Human: 2h | Copilot: 4h]
├─ Task 2.3: Extract SettingsManager [Human: 1h | Copilot: 3h]
├─ Task 2.4: Formalize Tool System [Human: 2h | Copilot: 5h]
└─ Task 2.5: Formalize Helper System [Human: 1h | Copilot: 3h]

Phase 3: Dependency Upgrade
├─ Task 3.1: Paper.js Upgrade   [Human: 10h | Copilot: 5h]
├─ Task 3.2: i18next Upgrade    [Human: 3h | Copilot: 2h]
├─ Task 3.3: Remove jQuery      [Human: 10h | Copilot: 8h]
└─ Task 3.4: Error Handling     [Human: 5h | Copilot: 5h]

Phase 4: Polish
├─ Task 4.1: Final Tests        [Human: 5h | Copilot: 5h]
└─ Task 4.2: Documentation      [Human: 10h | Copilot: 5h]
```

---

## 4. Detailed Task Specs for Agent Execution

### Task 1.1: Electron Upgrade (Not Ideal for Agent — Requires Manual Validation)

**Role:** Human-driven with Copilot assistance  
**Duration:** 40 hours human + 4 hours Copilot  
**Difficulty:** 🟠 Medium

**Steps:**
1. Human: Create feature branch `upgrade/electron-lts`
2. Human: Update package.json manually
3. Run: `npm install`
4. Copilot: "Identify breaking changes in our code"
   - Feed Copilot old main.js and error messages
   - Copilot suggests fixes to IPC patterns, window API, etc.
5. Human: Test extensively (each feature area)
6. Human: Merge with review

---

### Task 1.2: Jest Installation & Configuration

**Role:** Copilot-driven with human review  
**Duration:** 2 hours human + 1 hour Copilot  
**Difficulty:** 🟢 Easy

**Prompt for Copilot:**
```
Create a Jest configuration for PancakePainter with:
- Test directory: tests/
- File patterns: **/*.test.js
- Configure Babel for ES6
- Mock Paper.js objects
- Add code coverage thresholds (60% for now)
- Add CI integration with GitHub Actions

Files to generate:
1. jest.config.js
2. tests/.babelrc (if needed)
3. tests/mocks/paper.js
4. .github/workflows/test.yml
```

**Acceptance Criteria:**
- ✅ `npm test` runs without errors
- ✅ A sample test passes
- ✅ Coverage reports generate
- ✅ GitHub Actions workflow created

---

### Task 1.3: Write GCODE Generation Tests

**Role:** Copilot-driven with human review  
**Duration:** 2 hours human + 10 hours Copilot  
**Difficulty:** 🟠 Medium

**Prompt for Copilot:**
```
Write comprehensive unit tests for src/gcode.js. 

The gcode.js module exports a function that:
- Takes a Paper.js Layer and settings object
- Returns a GCODE string (PancakeBot format)
- Groups paths by color shade (0-3)
- Generates speed commands for shade changes
- Converts fill paths to zig-zag patterns
- Travel-sorts paths to minimize distance

Create tests covering:
1. Basic generation (header, simple paths, shadows)
2. Fill operations (line-fill, shape-fill with settings)
3. Path processing (flatten, cleanup, close conversions)
4. Travel optimization (distance sorting)
5. Settings application (speeds, fills angles, thresholds)
6. Edge cases (empty layers, single paths, nested fills)

Target: 40+ tests, 90%+ coverage

Use provided fixtures in tests/fixtures/

Use jest mocking for Paper.js objects (provided in tests/mocks/paper.js)
```

**File Structure:**
```
tests/
├── unit/
│   └── gcode.test.js          [← Copilot generates this]
├── fixtures/
│   ├── drawings/
│   │   ├── simple-paths.json
│   │   ├── with-fills.json
│   │   └── complex.json
│   └── expected-gcode/
│       ├── simple.gcode
│       └── complex.gcode
└── mocks/
    └── paper.js               [← Already exists from Task 1.2]
```

**Acceptance Criteria:**
- ✅ 40+ tests pass
- ✅ Coverage > 85%
- ✅ No console warnings
- ✅ Tests run in < 5 seconds

**Human Review Checklist:**
- [ ] Tests cover all major code paths
- [ ] Mocked objects are realistic
- [ ] Edge cases included (empty, invalid inputs)
- [ ] Test names are clear
- [ ] Comments explain complex test setups

---

### Task 1.4: Write Helper Tests (Undo, Clipboard, Utils)

**Role:** Copilot-driven with human review  
**Duration:** 2 hours human + 8 hours Copilot  
**Difficulty:** 🟠 Medium

**Prompt for Copilot:**
```
Write unit tests for the helper modules in src/helpers/:

1. helper.undo.js
   - Tests for undo stack push/pop
   - Tests for redo functionality
   - Tests for stack limits
   - Tests for state snapshots
   Target: 20 tests, 95% coverage

2. helper.clipboard.js
   - Tests for copy/paste operations
   - Tests for clipboard state management
   Target: 10 tests, 85% coverage

3. helper.utils.js
   - Tests for all utility functions
   - Geometry calculations, path operations
   Target: 15+ tests, 80% coverage

Create tests/unit/helpers/ directory with one file per helper.

Each test should:
- Use descriptive test names
- Test both happy path and error cases
- Be independent (no global state)
```

**Acceptance Criteria:**
- ✅ 45+ tests total
- ✅ All tests passing
- ✅ Combined coverage > 85%

---

### Task 1.5: Write File I/O Tests

**Role:** Copilot-driven with human review  
**Duration:** 2 hours human + 8 hours Copilot  
**Difficulty:** 🟠 Medium

**Prompt for Copilot:**
```
Write tests for file operations in src/app.js related to:
- saveDrawing(filepath, drawing)
- loadDrawing(filepath)
- exportToPNG(canvas, filepath)
- Settings persistence (load/save)

Tests should cover:
1. Valid file operations (happy path)
2. File format validation
3. Error handling (missing files, corrupt data)
4. Settings override hierarchy
5. Encoding/decoding (JSON, PNG)

Use mock-fs for file system isolation.

Target: 25 tests, 80% coverage
```

**Acceptance Criteria:**
- ✅ 25+ tests passing
- ✅ Coverage > 75%
- ✅ Error cases documented

---

### Task 2.1: Extract FileManager Class

**Role:** Copilot-driven with human review and testing  
**Duration:** 2 hours human + 4 hours Copilot  
**Difficulty:** 🟠 Medium

**Setup:**
```
Create src/modules/file-manager.js with:

class FileManager {
  constructor(app) {
    this.currentFile = { name: '', path: '', changed: false };
    this.app = app;
  }

  save(filepath) { ... }
  load(filepath) { ... }
  new() { ... }
  export(format, filepath) { ... }
  markChanged() { ... }
  getRecentFiles() { ... }
}

module.exports = FileManager;
```

**Prompt for Copilot:**
```
Extract file management logic from src/app.js into a new FileManager class.

Current file management code is scattered in app.js:
- app.currentFile state management
- File I/O operations (save/load)
- Export operations
- Recent file tracking

Create FileManager class that:
1. Encapsulates all file operations
2. Exposes clean public API
3. Emits events (file:loaded, file:saved, file:changed)
4. Validates inputs
5. Provides error-handling hooks

Then update app.js to use this class instead of internal file management.

Ensure all existing tests still pass.
```

**Acceptance Criteria:**
- ✅ FileManager class created
- ✅ All existing file tests pass
- ✅ No behavioral changes (black-box refactoring)
- ✅ Public API documented with JSDoc

---

### Task 2.2: Extract UiManager Class

**Role:** Copilot-driven with human review  
**Duration:** 2 hours human + 4 hours Copilot  
**Difficulty:** 🟠 Medium

**Similar to 2.1, but for UI concerns:**
- Menu initialization
- Toolbar/button event handling
- Dialog responses  
- Menu item state updates

---

### Task 2.3: Extract SettingsManager Class

**Role:** Copilot-driven with human review  
**Duration:** 1 hour human + 3 hours Copilot  
**Difficulty:** 🟢 Easy

---

### Task 2.4: Formalize Tool System (Base Classes + Registry)

**Role:** Copilot-driven with testing  
**Duration:** 2 hours human + 5 hours Copilot  
**Difficulty:** 🟠 Medium

**Prompt:**
```
Create a formalized tool system for PancakePainter:

1. Create src/core/BaseTool.js with abstract class
   - activate(), deactivate(), getName(), getIcon()
   - Event delegation pattern
   - Properties: paper, name, icon

2. Create src/core/ToolRegistry.js
   - Static registry for tool classes
   - register(name, ToolClass), getAll(), create(paper)

3. Refactor existing tools to extend BaseTool:
   - tool.pen.js → class ToolPen extends BaseTool
   - tool.fill.js → class ToolFill extends BaseTool
   - tool.select.js → class ToolSelect extends BaseTool

4. Update tool loading in editor.ps.js to use registry

Ensure:
- All existing functionality preserved
- Tests continue to pass
- API is clean and extensible
```

**Acceptance Criteria:**
- ✅ Base class created with clear contract
- ✅ Registry implemented
- ✅ All 3 existing tools refactored
- ✅ Existing tests pass
- ✅ Tool loading mechanism modernized

---

### Task 2.5: Formalize Helper System

**Role:** Copilot-driven with testing  
**Duration:** 1 hour human + 3 hours Copilot  
**Difficulty:** 🟢 Easy

Similar pattern to tools (BaseHelper, HelperRegistry).

---

### Task 3.1: Upgrade Paper.js (0.10.2 → 0.12.x)

**Role:** Human-driven with Copilot assistance  
**Duration:** 10 hours human + 5 hours Copilot  
**Difficulty:** 🟠 High (API changes)

**Steps:**
1. Create feature branch `upgrade/paperjs`
2. Update package.json: `"paper": "0.12.x"`
3. Run `npm install` and identify errors
4. Copilot: "Fix these errors in editor.ps.js and tools"
5. Human: Validate each fix
6. Human: Run full test suite
7. Human: Manual UI testing (drawing, fills, selection)
8. Merge

---

### Task 3.3: Remove jQuery

**Role:** Copilot-driven with extensive testing  
**Duration:** 10 hours human + 8 hours Copilot  
**Difficulty:** 🟠 High

**Approach:**
1. Identify all jQuery usage: `grep -r '\$\(' src/`
2. Group by type (DOM selection, manipulation, events)
3. Replace methodically:
   - Event handling → addEventListener
   - DOM selection → querySelector
   - DOM manipulation → innerHTML, appendChild, etc.
   - AJAX → fetch
4. Test after each major replacement
5. Verify all tests pass

**Acceptance Criteria:**
- ✅ No `$` in production code
- ✅ All tests pass
- ✅ All UI features work
- ✅ Performance not degraded

---

### Task 3.4: Error Handling & Logging

**Role:** Copilot-driven with human review  
**Duration:** 5 hours human + 5 hours Copilot  
**Difficulty:** 🟠 Medium

**Setup:**
```javascript
// Create src/utils/logger.js
class Logger {
  error(message, error) { ... }
  warn(message) { ... }
  info(message) { ... }
  debug(message) { ... }
}

module.exports = new Logger();
```

**Prompt:**
```
Implement error handling and logging across PancakePainter:

1. Create Logger module (Winston-based)
   - Log to file: ~/.config/PancakePainter/app.log
   - Log to console in dev mode
   - Levels: error, warn, info, debug

2. Add error handling to critical paths:
   - File I/O (save/load): catch and log errors
   - Export workflow: catch and report to user
   - Settings persistence: log failures
   - Tool operations: catch drawing errors

3. Create user-facing error dialogs:
   - Show friendly messages (not stack traces)
   - Suggest actions ("Try saving as a new file", etc.)

4. Add error telemetry hooks (don't send, just prepare):
   - Log error details for future analysis

Test all error paths with new test cases.
```

---

## 5. Execution Model: Serial vs Parallel

### Serial Execution (Recommended for Beginners)

**One task at a time:**
```
Task 1.1 → Merge → Task 1.2 → Merge → Task 1.3 → ...
```

**Advantages:**
- ✅ No merge conflicts
- ✅ Simple to debug
- ✅ Each PR is easy to review
- ✅ Can rollback individual changes

**Timeline:** 18 weeks (5-7 tasks per week)

---

### Parallel Execution (For Experienced Teams)

**Multiple tasks in parallel branches:**
```
              Task 1.1 (Electron) → can block Tasks 2.*, 3.*
              Task 1.2 (Jest) → required for Tasks 1.3-1.5
         ┌────Task 1.3 (GCODE tests)
         ├────Task 1.4 (Helper tests)  (Tasks 1.3, 1.4, 1.5 can run in parallel)
         └────Task 1.5 (File tests)

         ┌────Task 2.1 (FileManager)
         ├────Task 2.2 (UiManager)    (Tasks 2.* can run in parallel after Phase 1)
         └────Task 2.3 (SettingsManager)
```

**Advantages:**
- ✅ Faster overall timeline (could reduce 18 weeks → 12)
- ✅ Team parallelization

**Disadvantages:**
- ❌ Requires good merge discipline
- ❌ Harder to debug when things break
- ❌ Review latency matters more

**Recommendation:** Start serial, move to parallel after week 4 (when patterns established).

---

## 6. Guardrails & Safety Checks

### Pre-Merge Checklist (for Every Agent-Generated PR)

**Automated:**
- ✅ Tests pass (`npm test`)
- ✅ Linting passes (`npm run lint`)
- ✅ Coverage targets met (e.g., 60%+ for gcode.js)
- ✅ No console errors/warnings
- ✅ Build succeeds (`npm run build`)

**Manual (Human Reviewer):**
- ✅ Code is readable and well-commented
- ✅ No breaking changes to public APIs
- ✅ No accidental global state introduced
- ✅ Tests cover the happy path + edge cases
- ✅ Commit messages are clear
- ✅ PR description explains "why"

**Functional:**
- ✅ Manual testing of affected features
- ✅ No regression in related features

### Rollback Plan

**If Something Breaks:**
1. Revert commit: `git revert <hash>`
2. Take 2 hours to understand what went wrong
3. File a "defect" task: document the issue
4. Re-attempt with different approach

**Example Rollback Trigger:**
```
- PR merges, app crashes on launch → Immediate revert
- Tests pass, but feature broken in manual testing → Investigate first, then revert if not obvious
- 2+ reviewers flag concerns → Request changes, don't merge
```

---

## 7. Code Review Guidelines for Agent-Generated Code

### What to Look For

🟢 **Accept if:**
- Tests are comprehensive
- Code is readable
- No obvious bugs
- Follows project style

🟡 **Request changes if:**
- Tests are incomplete
- Code is complex but not documented  
- Performance concerns
- Missing error handling
- Inconsistent style

🔴 **Reject if:**
- Tests don't pass
- Code breaks existing tests
- Breaking API changes without discussion
- Harmful performance regression
- Security issues (e.g., CLI injection)

### Sample Review Comment

```
Great work on the FileManager extraction!

Minor notes:
1. Line 42: Missing JSDoc for `markChanged()` method
2. Tests should include error case for non-existent file
3. Consider emitting events instead of returning status

Otherwise, looks good! Ready to merge after addressing #2.
```

---

## 8. Communication Protocol

### Between Human and Copilot

**Good Prompt:**
```
Write tests for gcode.js that cover:
- Color shade grouping (test with 1-4 shades)
- Fill operation modes (line-fill vs shape-fill)
- Travel sort optimization
- Speed parameter application

Use provided mocks in tests/mocks/paper.js.
Target 40+ tests, 90%+ coverage.
```

**Bad Prompt:**
```
Write tests for gcode.js
```

---

### Between Team Members

**In Pull Request:**
- Link to task specification
- Reference Seed.md strategy phase
- Highlight any deviations from plan

**In Commit Message:**
```
feat(gcode): Add comprehensive unit tests

- Covers color grouping, fill operations, travel sort
- 40+ tests, 90% coverage
- Closes #TASK-NUMBER (#Agent-1.3)

See: docs/testing-strategy.md for rationale
```

---

## 9. Sample Agent Workflow: Start to Finish

### Scenario: Complete Task 1.3 (GCODE Tests)

**Step 1: Setup (Human)**
```bash
cd PancakePainter
git checkout -b feature/gcode-tests
# Pre-create test structure
mkdir -p tests/unit tests/fixtures/drawings tests/mocks
touch tests/unit/gcode.test.js
touch tests/mocks/paper.js
```

**Step 2: Prompt Copilot (Human)**
```
Open: tests/unit/gcode.test.js

Prompt Copilot:
"Write comprehensive unit tests for src/gcode.js.
See docs/testing-strategy.md section 3.1 for requirements.
Use mocks from tests/mocks/paper.js.
Target: 40+ tests, 90%+ coverage.
Modules to test:
- GCODE generation with headers
- Fill operations (line-fill, shape-fill)
- Path processing (flatten, cleanup)
- Travel sort optimization
- Settings application

Include both happy path and edge cases."
```

**Step 3: Review Copilot Output (Human)**
- Does it match requirements?
- Are tests readable?
- Does it compile?

**Step 4: Run Tests (Human)**
```bash
npm test -- gcode.test.js
# Review output coverage
npm run coverage -- --collectCoverageFrom='src/gcode.js'
```

**Step 5: Iterate (Human + Copilot)**
```
If tests fail:
1. Copilot: "Fix these failing tests: [error list]"
2. Copilot: "Add edge case test for [scenario]"
3. Repeat until all pass

If coverage < 85%:
1. Copilot: "Add tests for uncovered lines: [line numbers]"
```

**Step 6: Submit PR (Human)**
```
Title: "feat(tests): Comprehensive GCODE generation tests"

Description:
Adds 40+ unit tests for gcode.js covering:
- Basic generation and headers
- Fill operations (line-fill, shape-fill)
- Path processing and optimization
- Settings application
- Edge cases (empty layers, invalid data)

Achieves 90%+ coverage of gcode.js.
All tests passing. No warnings.

Implements: Task 1.3 per refactoring-strategy.md Phase 1

See: docs/testing-strategy.md Section 3.1
```

**Step 7: Code Review (Human Reviewer)**
- Run tests: ✅ Passing
- Check coverage: ✅ 90%+
- Review code: ✅ Readable, well-commented
- Approve: ✅ Merge

**Step 8: Post-Merge (Human)**
```bash
git checkout master
git pull
# Next task: Task 2.1 or 1.4
```

---

## 10. Dealing with Failures

### Scenario: Agent-Generated Code Has a Bug

**Example: GCODE test passes, but actual feature breaks**

```
1. User files issue: "Export produces invalid GCODE"
2. Human investigates: gcode.js works in tests, but fails with real data
3. Root cause: Gap in test coverage (specific path configuration not covered)
4. Fix: Add test case for this specific configuration
5. Copilot: "Implement fix for [specific code path]"
6. Merge: Now fixed, tests prevent regression
```

**Lesson:** Tests catch most bugs, but not all. Integration and manual testing still matter.

---

## 11. Agent Specialization & Workflow

### Copilot Code Review Skill

**Good for:**
- Generating tests (understands Jest patterns)
- Extracting classes (modularization patterns)
- Writing documentation (clear explanations)
- Refactoring (rename, extract, inline)

**Not great at:**
-Architecture decisions (you decide, it implements)
- Trade-off analysis (you evaluate, it follows direction)
- Manual Electron testing (no test infrastructure for that)

### Using Specialized Agents

If you have access to specialized agents (like "Explore" agent):

**For codebase understanding:**
```
Agent: Explore
"Understand the current implementation of GCODE generation in src/gcode.js.
What are the main algorithms? What data structures?"
→ Returns: Summary of code structure, key functions, algorithms
```

**For finding relationships:**
```  
Agent: Explore
"Which files/functions depend on gcode.js?"  
→ Returns: List of usages in export.js, windows/export.js, etc.
```

---

## 12. Checkpoints & Milestones

### Week 4 Checkpoint: Foundation Complete

**Criteria:**
- ✅ Electron 28+ running
- ✅ Jest installed and 60+ tests passing
- ✅ Critical paths have test coverage
- ✅ TypeScript/JSDoc started
- ✅ Zero regressions reported

**Decision Point:** Continue to Phase 2 or pause?

### Week 10 Checkpoint: Modularization Complete

**Criteria:**
- ✅ app.js split into modules (FileManager, UiManager, etc.)
- ✅ Tool system formalized (Base classes, registry)
- ✅ Helper system formalized
- ✅ 60%+ overall test coverage
- ✅ No behavioral changes

**Decision Point:** Continue to Phase 3 or stabilize?

### Week 18 Checkpoint: Release Ready

**Criteria:**
- ✅ All dependencies upgraded
- ✅ jQuery removed
- ✅ Error handling comprehensive
- ✅ 75%+ coverage on critical paths
- ✅ Documentation completed
- ✅ v1.6.0 ready for release

---

## Summary: Agent Partnership Model

| Activity | Human | Copilot | Time |
|----------|--------|---------|------|
| Architecture decisions | 100% | 0% | Human decides |
| Test writing | 20% | 80% | Copilot generates, human validates |
| Code generation | 10% | 90% | Copilot writes, human reviews |
| Code review | 100% | 0% | Human only |
| Testing | 60% | 40% | Tests run automated, human interprets |
| Documentation | 30% | 70% | Copilot drafts, human refines |

**Key takeaway:** Copilot is powerful for *implementation*, but humans are responsible for *strategy*, *review*, and *decisions*.

---

## References

- [refactoring-strategy.md](refactoring-strategy.md) — Task roadmap
- [testing-strategy.md](testing-strategy.md) — Test implementation details
- [architecture-analysis.md](architecture-analysis.md) — Codebase understanding
- Seed.md — Overall project guidance
