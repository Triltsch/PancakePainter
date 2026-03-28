# Testing Strategy

## 1. Current State Assessment

### Existing Test Coverage

| Aspect | Status | Details |
|--------|--------|---------|
| Linting | ✅ Partial | JSHint only; no style rules |
| Unit Tests | ❌ None | Zero test files |
| Integration Tests | ❌ None | Manual testing only |
| E2E Tests | ❌ None | Manual QA only |
| Snapshot Tests | ❌ None | No regression detection |
| Performance Tests | ❌ None | No baseline metrics |

### Current Workflow
1. Developer makes changes
2. Developer runs `npm test` (jshint only)
3. Manual testing of affected features
4. Merge to master
5. Manual QA by maintainers

### Risks of Current Approach
- 🔴 **Regression introduction** — Changes silently break existing features
- 🔴 **Slow release cycles** — Manual testing is time-consuming
- 🔴 **Low confidence** — Small PR = big risk
- 🔴 **Knowledge loss** — No "specification" of expected behavior
- 🔴 **Agent-incompatible** — Agents cannot verify changes work

---

## 2. Test Pyramid Architecture

### Ideal Test Distribution (by count)

```
          ┌──────────────────────┐
          │   E2E Tests (10%)    │  User workflows (5-10 tests)
          │   Real browser app   │
          ├──────────────────────┤
          │ Integration Tests    │  Component interaction (30-50 tests)
          │  (30-40%)            │
          ├──────────────────────┤
          │ Unit Tests (50%)     │  Isolated functions (80-120 tests)
          │ Fast feedback        │
          └──────────────────────┘
```

### For PancakePainter Specifically

```
Total Target: 150-200 tests
├─ Unit Tests (80-120)         [60 hours]
│  ├─ gcode.js                 [40 tests]
│  ├─ helpers/* (undo, clipboard, utils)  [30 tests]
│  ├─ tools/* (pen, fill, select) [20 tests]
│  └─ utils & lib functions    [15 tests]
│
├─ Integration Tests (40-60)   [40 hours]
│  ├─ File I/O (load/save PNG + JSON)  [15 tests]
│  ├─ Export workflow (draw → GCODE)   [15 tests]
│  ├─ Undo/Redo flows           [10 tests]
│  └─ Import/Autotrace flows    [10 tests]
│
└─ E2E Tests (10-20)            [20 hours]
   ├─ Full drawing workflow     [5 tests]
   ├─ Export complete cycle     [4 tests]
   └─ Settings persistence      [3 tests]

Timeline: 120 hours total (~2-3 weeks with Copilot assistance)
```

---

## 3. Unit Test Strategy

### 3.1 Core Module: GCODE Generation (`gcode.js`)

**Why First:** Most critical path; complex logic; high bug risk

**Current Issues:**
- No validation of input paths
- Silent failures on invalid data
- Color grouping logic is complex

**Test Coverage Areas:**

#### Test Group 1: Basic Generation (8 tests)
```javascript
describe('GCODE Generation', () => {
  test('generates header with bot constants', () => { ... });
  test('processes empty layer', () => { ... });
  test('adds color shade comments', () => { ... });
  test('groups paths by color', () => { ... });
  test('applies speed settings', () => { ... });
  test('handles single path', () => { ... });
  test('handles multiple paths', () => { ... });
  test('resets coordinates', () => { ... });
});
```

#### Test Group 2: Fill Operations (12 tests)
```javascript
describe('GCODE Fill Operations', () => {
  test('converts line fill with custom spacing', () => { ... });
  test('converts shape fill with polygon clipping', () => { ... });
  test('applies fill angle parameter', () => { ... });
  test('handles nested fills', () => { ... });
  test('skips empty fill paths', () => { ... });
  test('generates zigzag pattern', () => { ... });
  // ... more edge cases
});
```

#### Test Group 3: Path Processing (10 tests)
```javascript
describe('Path Processing', () => {
  test('flattens compound paths', () => { ... });
  test('converts closed paths', () => { ... });
  test('cleans empty paths', () => { ... });
  test('handles self-intersecting paths', () => { ... });
  // ... edge cases
});
```

#### Test Group 4: Travel Optimization (6 tests)
```javascript
describe('Travel Sort Optimization', () => {
  test('sorts paths by distance to reduce travel', () => { ... });
  test('respects color grouping', () => { ... });
  // ...
});
```

#### Test Group 5: Settings Handling (4 tests)
```javascript
describe('Settings Application', () => {
  test('applies flatten curve parameter', () => { ... });
  test('applies speed parameters', () => { ... });
  test('applies line fill settings', () => { ... });
  test('applies shape fill settings', () => { ... });
});
```

**Total: 40+ tests for gcode.js**

**Mock Strategy:** Mock Paper.js Layer, Path objects with test fixtures

**Fixtures:**
```javascript
const sampleLayer = {
  children: [
    { data: { color: 0, fill: false }, points: [...] },
    { data: { color: 1, fill: true }, points: [...] }
  ]
};
```

---

### 3.2 Helpers: Undo/Redo (`helper.undo.js`)

**Tests (20+ tests):**
```javascript
describe('Undo Stack', () => {
  test('records initial state', () => { ... });
  test('undoes single operation', () => { ... });
  test('redoes single operation', () => { ... });
  test('limits stack depth', () => { ... });
  test('clears stack on new operation after undo', () => { ... });
  test('handles rapid state changes', () => { ... });
});
```

---

### 3.3 File I/O Operations

**Tests (20+ tests):**
- Save drawing as JSON
- Load drawing from JSON
- Handle malformed files (gracefully)
- Handle missing required fields
- Validate file format
- PNG export via canvas-to-buffer
- Settings persistence

---

### 3.4 Helper Functions (`helper.utils.js`)

**Tests (15+ tests):**
- Path clipping
- Geometry calculations
- Color shade conversions
- Bounds calculations

---

### 3.5 Tool Operations (if extractable logic)

**Tests (20+ tests):**
- Pen tool path creation
- Fill tool flood-fill algorithm
- Select tool bounds calculation
- Point snapping and grid alignment

---

## 4. Integration Test Strategy

### 4.1 File Load/Save Cycle

**Test Scenario:**
```javascript
describe('File Operations', () => {
  test('save → load preserves drawing', () => {
    const drawing = { paths: [...] };
    saveDrawing(drawing);
    const loaded = loadDrawing();
    expect(loaded).toEqual(drawing);
  });
});
```

---

### 4.2 Export Workflow End-to-End

**Test Scenario:**
```javascript
describe('Export Workflow', () => {
  test('drawing → GCODE generates valid output', () => {
    const layer = createLayerWithPaths();
    const gcode = exportToGCode(layer, defaultSettings);
    expect(isValidGCode(gcode)).toBe(true);
  });

  test('exported GCODE matches expected format', () => {
    // Compare with golden file
  });
});
```

---

### 4.3 Undo/Redo Integration

**Test Scenario:**
```javascript
describe('Undo/Redo with Canvas', () => {
  test('undo reverts canvas state', () => {
    drawPath(point1, point2);
    undo();
    expect(canvas.isEmpty()).toBe(true);
  });

  test('redo restores canvas state', () => {
    drawPath(point1, point2);
    undo();
    redo();
    expect(canvas.pathCount()).toBe(1);
  });
});
```

---

### 4.4 Autotrace Integration

**Test Scenario:**
```javascript
describe('Autotrace Integration', () => {
  test('imports image and generates paths', () => {
    const imageFile = 'test-image.png';
    const paths = autotraceImage(imageFile);
    expect(paths.length).toBeGreaterThan(0);
  });
});
```

---

## 5. E2E Test Strategy

### Framework: Playwright (Electron support)

**Recommendation:** Prefer Playwright's maintained Electron support for new E2E investment.

**Setup (example):**
```bash
npm install --save-dev @playwright/test playwright
```

**Note:** Spectron is deprecated/archived and should only be treated as historical context.

### 5.1 Drawing Workflow E2E

**Scenario: User draws a simple shape and exports**

```javascript
describe('E2E: Drawing → Export', () => {
  test('complete user workflow', async () => {
    const app = new Application({ path: electronPath });
    await app.start();

    // Draw simple circle
    await app.client.click('.tool-pen');
    await app.client.click(200, 200);
    await app.client.click(220, 180);
    await app.client.click(240, 200);
    await app.client.keys('Return');  // Complete polygon

    // Verify path appears
    const pathCount = await app.client.execute(() => {
      return paper.project.activeLayer.children.length;
    });
    expect(pathCount).toBe(1);

    // Export
    await app.client.click('File > Export');
    await selectFileLocation('test-output.gcode');
    await waitForExportComplete();

    // Verify file was created
    expect(fs.existsSync('test-output.gcode')).toBe(true);

    await app.stop();
  });
});
```

---

### 5.2 Settings Persistence E2E

```javascript
describe('E2E: Settings Persistence', () => {
  test('settings survive restart', async () => {
    const app = new Application(...);
    await app.start();

    // Change setting
    await app.client.click('Edit > Preferences');
    await app.client.setInputValue('[name=botspeed]', '50');
    await app.client.click('OK');

    // Restart app
    await app.stop();
    await app.start();

    // Verify setting persisted
    await app.client.click('Edit > Preferences');
    const value = await app.client.getInputValue('[name=botspeed]');
    expect(value).toBe('50');

    await app.stop();
  });
});
```

---

## 6. Infrastructure & Tools

### 6.1 Testing Framework: Jest

**Why Jest:**
- Fast, zero-config for most setups
- Great for Node.js testing
- Good Electron support via jest-electron
- Snapshot testing built-in
- Excellent CLI and watch mode

**Installation:**
```bash
npm install --save-dev jest @babel/preset-env babel-jest jest-electron
```

**Configuration (`jest.config.js`):**
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/libs/**',
    '!src/main.js'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60
    }
  }
};
```

---

### 6.2 Mocking Strategy

#### Mock Paper.js Objects

```javascript
// tests/mocks/paper.js
class MockPath {
  constructor() {
    this.data = { color: 0, fill: false };
    this.children = [];
  }
}

class MockLayer {
  constructor() {
    this.children = [];
  }
  clone() { return new MockLayer(); }
  activate() {}
}

module.exports = {
  Path: MockPath,
  Layer: MockLayer
};
```

#### Mock File System

```javascript
jest.mock('fs-plus', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn()
}));
```

#### Mock Autotrace CLI

```javascript
jest.mock('child_process', () => ({
  execFile: jest.fn((cmd, args, callback) => {
    callback(null, mockVectraces);
  })
}));
```

---

### 6.3 Test Fixtures

**Directory structure:**
```
tests/
├── fixtures/
│   ├── drawings/
│   │   ├── simple-triangle.json
│   │   ├── complex-with-fills.json
│   │   └── with-images.json
│   ├── gcode/
│   │   ├── expected-simple.gcode
│   │   └── expected-complex.gcode
│   ├── images/
│   │   └── lena.png
│   └── settings/
│       └── sample-config.json
└── unit/
```

---

### 6.4 CI/CD Integration

**Current state:** This repository is currently configured for Travis CI (`.travis.yml`).

**Repository-native approach now:**
- keep CI validation aligned with the existing Travis pipeline
- ensure `npm test` and any future coverage command work in the Travis job

**Future migration option (explicitly deferred):**
- If the project later migrates from Travis to GitHub Actions, add a workflow under `.github/workflows/` and align supported Node/Electron compatibility first.

---

## 7. Testing Guidelines for Contributors

### Adding a New Feature

1. **Write tests first** (TDD style):
   ```bash
   # Create tests/unit/new-feature.test.js
   npm test -- new-feature  # Watch mode
   ```

2. **Implement feature**:
   - Test fails → implement → test passes

3. **Add integration tests**:
   - How does it interact with other modules?

4. **Check coverage**:
   ```bash
   npm run coverage
   # Verify new code is tested
   ```

---

### Fixing a Bug

1. **Write failing test** that reproduces bug
2. **Verify test fails** with current code
3. **Implement fix**
4. **Verify test passes**
5. **Check for regressions** (`npm test`)

---

### Refactoring

1. **Ensure full test coverage** before refactoring
2. **Run tests continuously** during refactoring (`npm test -- --watch`)
3. **Never refactor and add features simultaneously**
4. **Commit frequently** in case rollback needed

---

## 8. Coverage Targets

### By Module

| Module | Target | Priority |
|--------|--------|----------|
| gcode.js | 90%+ | 🔴 Critical |
| helper.undo.js | 95%+ | 🟠 High |
| helper.clipboard.js | 85%+ | 🟠 High |
| helper.utils.js | 80%+ | 🟡 Medium |
| File I/O | 85%+ | 🟠 High |
| Settings | 75%+ | 🟡 Medium |
| Tools | 70%+ | 🟡 Medium |

### Overall Target
- **Phase 1 (Weeks 2-4):** 40-50% of critical paths
- **Phase 2 (Weeks 5-10):** 60-70% overall
- **Stable Release:** 75%+ of critical paths

---

## 9. Regression Testing Strategy

### Automated Regression Suite

**Golden File Comparison:**
1. For each major feature, save "golden" output
2. After code changes, generate output again
3. Compare byte-for-byte (or semantic equivalence)

**Example: GCODE Generation**
```javascript
test('regression: GCODE output matches golden file', () => {
  const layer = loadDrawing('fixtures/drawings/complex.json');
  const gcode = generateGcode(layer, defaultSettings);
  const golden = fs.readFileSync('fixtures/gcode/expected.gcode', 'utf8');
  expect(gcode).toBe(golden);
});
```

---

## 10. Performance Testing Strategy

### Baseline Metrics

**Measure on v1.4.0 (before upgrades):**
```javascript
test('performance: GCODE generation completes in < 1s', () => {
  const layer = loadLargeDrawing(1000); // 1000 paths
  const start = performance.now();
  generateGcode(layer, settings);
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(1000);
});

test('performance: Undo stack handles 100 operations', () => {
  const stack = new UndoStack();
  for (let i = 0; i < 100; i++) {
    stack.record(state);
  }
  const elapsed = performance.measure(...);
  expect(elapsed).toBeLessThan(100);
});
```

---

## 11. Manual Testing Checklist (for Human QA)

### Pre-Release Checklist

**Platform: macOS**
- [ ] Draw freehand line
- [ ] Draw polygon (click points, press Enter)
- [ ] Fill enclosed area
- [ ] Select and move object
- [ ] Rotate/scale object
- [ ] Undo/redo drawing operations
- [ ] Import image (manual)
- [ ] Import image (autotrace)
- [ ] Export to GCODE
- [ ] Load previously saved drawing
- [ ] Change settings, verify persistence

**Platform: Windows**
- [ ] (Same as macOS)
- [ ] Squirrel installer/updater

**Platform: Linux**
- [ ] (Same as macOS)

---

## 12. Known Testing Challenges

### Challenge 1: Paper.js Integration Testing

**Issue:** Paper.js canvas operations are hard to test without DOM

**Solution:**
- Use node canvas library: `npm install canvas`
- Or mock Paper.js at boundary layer
- Integration tests with jsdom or happy-dom

---

### Challenge 2: Autotrace CLI Testing

**Issue:** Autotrace is an external binary; slow to test

**Solution:**
- Mock in unit tests
- Run real integration tests less frequently
- Cache autotrace output in fixtures

---

### Challenge 3: File I/O Testing

**Issue:** Actual file I/O is slow and flaky

**Solution:**
- Use `fs.MockFile` or `mock-fs`
- Or use temp directories (`node-temp`)
- Set timeout higher for file tests

---

## 13. Implementation Roadmap

### Timeline: Weeks 2-18 (concurrent with Electron upgrade)

| Week | Task | Tests | Coverage |
|------|------|-------|----------|
| 2 | Jest setup, GCODE tests | 40+ | 20% |
| 3 | Helper tests, File I/O tests | 80+ | 35% |
| 4 | Tool tests, Settings tests | 120+ | 50% |
| 5-10 | Integration tests, mocking | 150+ | 60% |
| 15-16 | Final coverage fill, E2E | 180+ | 75% |

---

## 14. Success Criteria

✅ **Phase 1 (Week 4):**
- 120+ unit tests passing
- 50% coverage of critical modules
- Jest running in CI/CD
- Contributor guide done

✅ **Phase 2 (Week 10):**
- 150+ tests (unit + integration)
- 60% coverage overall
- Regression test suite created
- Performance baseline established

✅ **Stable Release (Week 18):**
- 180+ tests total
- 75%+ coverage of critical paths
- E2E tests for major workflows
- Zero known regressions
- Comprehensive test documentation

---

## References

- [Jest Documentation](https://jestjs.io/)
- [Playwright Electron Testing](https://playwright.dev/docs/api/class-electron)
- [Testing Node.js Applications](https://jestjs.io/docs/en/getting-started)
- [PancakePainter architecture docs](./architecture-analysis.md) — Understand code first
