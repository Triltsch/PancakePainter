# Open Questions & Risks

This document captures **unknowns, assumptions, and risks** that should be validated before or during refactoring. It serves as a living checklist for the team.

---

## 1. Critical Unknowns

### 1.1 Electron API Compatibility ❓

**Question:** Will Electron 28+ break any Paper.js or external dependencies?

**Current Situation:**
- PancakePainter uses Electron 1.0.1 (2016)
- Target: Electron 28+ (modern LTS)
- Gap: ~7 major versions of breaking changes

**Risk:** 🔴 Could block upgrade

**Validation Plan:**
1. Create test branch with Electron 28
2. Run full test suite
3. Manual smoke test of all features
4. Document any API migrations needed

**Timeline:** Week 1-2 (foundational)

**Owner:** Lead developer + QA

---

### 1.2 Paper.js Canvas Rendering in Modern Chromium ❓

**Question:** Will Paper.js 0.10.2 rendering work reliably in Chromium 120+?

**Current Situation:**
- Paper.js 0.10.2 uses older Canvas API
- Chromium 120+ has newer Canvas implementation
- Risk: Rendering bugs, performance issues

**Risk:** 🟠 Medium (might need Paper.js upgrade)

**Validation Plan:**
1. Test drawing operations extensively
2. Test fill algorithm on large canvases
3. Test image import/autotrace
4. Measure performance (undo stack, path count limits)

**If issues found:**
→ May need to upgrade Paper.js to 0.12.x (already planned)

**Owner:** Developer + QA

---

### 1.3 Autotrace Binary Compatibility ❓

**Question:** Will bundled autotrace binaries work on modern Linux/macOS/Windows?

**Current Situation:**
- Autotrace binaries bundled in `resources/{platform}/bin/`
- Binaries are likely 10+ years old
- Risk: Segfaults, missing dependencies, security issues

**Risk:** 🟠 Medium (Linux might fail; macOS/Windows might work)

**Validation Plan:**
1. Test autotrace on target platforms (Ubuntu 20+, macOS 10.14+, Windows 10+)
2. If fails, consider:
   - Option A: Use system package (require users to install)
   - Option B: Use JavaScript alternative (Potrace.js)
   - Option C: Build fresh autotrace binary

**Timeline:** Post-Electron upgrade (Week 3)

**Owner:** DevOps + Linux developer

---

### 1.4 File Format Backward Compatibility ❓

**Question:** Will drawings saved in v1.4.0 load correctly in v1.6.0+?

**Current Situation:**
- Drawing format is likely JSON
- No versioning scheme observed
- Refactoring might change serialization format

**Risk:** 🟠 Medium (data loss risk)

**Validation Plan:**
1. Document current file format
2. Test loading old files in new version
3. Implement migration strategy if format changes:
   - Auto-upgrade old format to new
   - Preserve backward compatibility
   - Test with real user files
4. Add format version field for future migrations

**Timeline:** Before any structural changes (Week 5+)

**Owner:** Developer + QA

---

### 1.5 Performance Impact of Refactoring ❓

**Question:** Will modularization and dependency upgrades affect performance?

**Current Situation:**
- No performance baseline established
- Large drawings (1000+ paths) might be affected
- Undo stack growth is unchecked

**Risk:** 🟡 Low-Medium (mostly for large projects)

**Validation Plan:**
1. Establish performance baseline (v1.4.0):
   - Time to draw N=100 paths
   - Time to generate GCODE (N=500)
   - Undo stack memory usage (100 operations)
2. Re-measure after each major change
3. Alert if regression > 10%

**Timeline:** Week 4 (establish baseline), then ongoing

**Owner:** Developer + QA

**Tools:** Node.js performance profiling, Chrome DevTools

---

### 1.6 Test Maintenance Burden ❓

**Question:** Will test suite become a bottleneck for feature development?

**Current Situation:**
- No tests exist currently
- Proposed: 150+ tests
- Paper.js mocking might be complex

**Risk:** 🟡 Low-Medium (typical for new test adoption)

**Mitigation:**
- Start with critical paths only (gcode, file I/O)
- Use simple mocks; don't over-engineer
- Parallelize test runs (Jest supports this)
- Establish "test review" process

**Timeline:** During test implementation (ongoing)

**Owner:** Developer + QA

---

## 2. Key Assumptions

### 2.1 User Base is Small

**Assumption:** PancakePainter has < 5,000 active users

**Evidence:**
- GitHub repo has ~1K stars (rough proxy)
- Niche product (drawing for PancakeBot)

**If Wrong:** Use case changes to "large user base" → prioritize stability/compatibility

**Action:** If this is wrong, communicate plan clearly to users

---

### 2.2 No External API Contracts

**Assumption:** PancakePainter is standalone; no other software depends on its internals

**Evidence:**
- No documented plugin system
- No documented file format standard
- No server/cloud component

**If Wrong:** Need to maintain backward compatibility for exports (GCODE format must stay compatible)

**Action:** Validate GCODE format doesn't change; if it does, support both old/new formats

---

### 2.3 Development Team is Small (1-3 people)

**Assumption:** Development capacity is limited; cannot do massive parallel work

**Evidence:**
- Seen in GitHub history (sparse commits)
- Niche project (not funded heavily)

**If Wrong (more resources available):** Can parallelize tasks, use multiple agents

**Action:** Task decomposition assumes serial execution; adjust if team grows

---

### 2.4 User Can't Directly Modify Code

**Assumption:** PancakePainter isn't integrated into a build system that users depend on

**If Wrong:** Breaking changes are risky (must communicate versions clearly)

**Action:** Use semantic versioning; major version bump for breaking changes

---

## 3. Technical Risks

### Risk 1: Electron Upgrade Breaks Core Features 🔴 CRITICAL

**Scenario:**
- Upgrade Electron to v28
- App crashes on startup or key features fail
- No tests catch it because tests are still being written

**Probability:** 🟡 Medium (common in major upgrades)

**Impact:** 🔴 High (blocks entire refactoring)

**Mitigation:**
1. Create feature branch immediately (don't merge to master)
2. Test exhaustively before merging
3. Have rollback plan (keep v1.4.0 branch alive)
4. Communicate timeline to users

**Owner:** Lead developer

**Checkpoint:** Week 2 (accept or reject upgrade)

---

### Risk 2: Tests Don't Catch Real Bugs ⚠️

**Scenario:**
- Tests pass (`npm test` succeeds)
- Manual testing reveals broken features
- Time wasted on non-representative tests

**Probability:** 🟡 Medium (common in new test suites)

**Impact:** 🟠 Medium (wasted effort, delay)

**Mitigation:**
1. Human review all test cases
2. Ensure edge cases covered
3. Manual testing still required (tests are safety net, not replacement)
4. Iterate on test coverage based on real bugs found

**Owner:** QA lead

---

### Risk 3: Global State Refactoring Introduces Subtle Bugs 🟠

**Scenario:**
- Extract modules from app.js
- Some global references missed
- Feature fails in specific edge case (e.g., after settings change)

**Probability:** 🟡 Medium-High (common in refactoring)

**Impact:** 🟠 Medium (user-visible bug)

**Mitigation:**
1. Use static analysis (grep for globals)
2. Test with settings changes explicitly
3. Pair refactoring with test writing
4. Small, reviewable changes (not big bang refactors)

**Owner:** Developer + reviewer

---

### Risk 4: Dependency Conflicts During Upgrade 🟡

**Scenario:**
- Upgrade Electron to v28
- Upgrade Paper.js to v0.12
- Upgrade i18next to v23
- Some combination of these doesn't work together
- Obscure compatibility issue in transitive dependencies

**Probability:** 🟡 Medium (common with old projects)

**Impact:** 🟠 Medium (blocks release)

**Mitigation:**
1. Upgrade one dependency at a time
2. Test thoroughly between each
3. Use `npm audit` to find issues early
4. Consider using Dependabot for ongoing checks

**Owner:** Developer

---

### Risk 5: Performance Regression After Refactoring 🟡

**Scenario:**
- Refactor leads to extra module loading
- Paper.js upgrade changes rendering
- Undo stack grows unbounded
- App becomes slow with large drawings

**Probability:** 🟡 Low-Medium (depends on refactoring approach)

**Impact:** 🟡 Medium (user frustration, but not critical)

**Mitigation:**
1. Establish performance baseline before changes
2. Profile after changes
3. Implement optimizations if needed (undo stack limit, lazy loading)

**Owner:** Developer + QA

**Timeline:** Week 4 (baseline), then ongoing measurements

---

### Risk 6: Loss of Niche Knowledge (GCODE, Bot Specifics) 🟠

**Scenario:**
- During refactoring, accidentally change GCODE format or bot-specific logic
- Tests don't catch it (insufficient test coverage)
- User's PancakeBot doesn't work with new version

**Probability:** 🟡 Low (unlikely if GCODE tests are comprehensive)

**Impact:** 🔴 High (core functionality broken)

**Mitigation:**
1. Write GCODE tests first (before any changes)
2. Test with real PancakeBot if possible
3. Get domain expert review on bot-specific code
4. Document bot parameters and constraints

**Owner:** Domain expert (if available) + developer

---

## 4. Organizational Risks

### Risk 7: Refactoring Scope Creep 🟠

**Scenario:**
- Start with "just upgrade Electron"
- Find outdated jQuery, decide to replace
- Find missing tests, decide to add comprehensive suite
- Find bad architecture, plan full rewrite
- 18-week project becomes 30+ weeks

**Probability:** 🟡 Medium-High (very common in legacy projects)

**Impact:** 🟠 High (timeline overrun, morale impact)

**Mitigation:**
1. Clearly define scope (Phase 1, 2, 3)
2. Don't deviate without explicit approval
3. Track time spent on each task
4. Monthly retrospectives to assess progress

**Owner:** Project manager

**Checkpoint:** Every 2 weeks (are we still on track?)

---

### Risk 8: Key Person Dependency 🟠

**Scenario:**
- Developer leaves in the middle of refactoring
- New person doesn't understand architecture decisions
- Code quality suffers

**Probability:** 🟡 Low (but possible)

**Impact:** 🔴 High (blocks progress, knowledge loss)

**Mitigation:**
1. Document decisions in code comments
2. Create architecture docs (already done!)
3. Code review every change (knowledge transfer)
4. Pair programming on complex parts
5. Weekly team sync (sync everyone)

**Owner:** Team lead

---

### Risk 9: User Expectations Not Met 🟠

**Scenario:**
- Team spends 6 months refactoring
- Users don't see new features (only internal improvements)
- Users disappointed ("Why no new features?")
- Motivation drops

**Probability:** 🟡 Medium (depends on communication)

**Impact:** 🟠 Medium (team morale, external perception)

**Mitigation:**
1. Communicate roadmap to users (yearly blog post)
2. Include some user-facing improvements alongside refactoring
3. Release incrementally (v1.5.0 Electron, v1.6.0 modularization, etc.)
4. Celebrate milestones publicly

**Owner:** Product lead + marketing

---

## 5. Testing-Specific Risks

### Risk 10: Tests Don't Cover Real-World Scenarios 🟡

**Scenario:**
- File with 10,000 paths
- Fills with complex nesting
- Autotrace on low-quality image
- Undo after 500 operations
- Tests pass all happy paths, but these edge cases break

**Probability:** 🟡 Medium (common in new test suites)

**Impact:** 🟠 Medium (user encounters bug after release)

**Mitigation:**
1. Create integration tests with realistic data
2. Load real user files in testing
3. Stress test (large canvases, many operations)
4. Beta testing with power users

**Owner:** QA

---

### Risk 11: Mock Objects Don't Reflect Reality 🟡

**Scenario:**
- Paper.js mock objects are simplified
- Real Paper.js objects have subtle behaviors
- Tests pass with mocks, fail with real library
- Wasted effort on "green" tests

**Probability:** 🟡 Medium (common with complex mocks)

**Impact:** 🟠 Medium (false confidence from tests)

**Mitigation:**
1. Use real Paper.js objects in integration tests
2. Periodically compare mock behavior to real objects
3. Document mock limitations
4. Don't mock more than necessary

**Owner:** Developer + QA

---

## 6. External Dependencies Risks

### Risk 12: autotrace Maintenance & Security 🟠

**Scenario:**
- autotrace is abandoned (last update ~2015)
- Security vulnerability discovered
- Binary doesn't work on new OS versions

**Probability:** 🟡 Medium (old software)

**Impact:** 🟠 High (core feature broken)

**Mitigation:**
1. Evaluate JavaScript alternatives (Potrace.js)
2. If keeping autotrace, update binary from source
3. Monitor security advisories
4. Consider extracting autotrace to separate plugin

**Timeline:** Week 4-5 (validation)

**Owner:** Developer

---

### Risk 13: i18next or Paper.js Upstream Breaking ⚠️

**Scenario:**
- Paper.js 0.12.x releases v1.0 with breaking changes
- i18next 23.x drops Node.js 12 support (we might be on older Node)
- Upstream no longer supports our use case

**Probability:** 🟡 Low (well-maintained projects)

**Impact:** 🟠 High (blocks updates, security issues)

**Mitigation:**
1. Choose LTS versions when available
2. Plan dependency updates quarterly
3. Monitor GitHub releases/security advisories
4. Have fallback versions identified

**Owner:** Developer

---

## 7. Validation Checklist

### Before Starting Refactoring

- [ ] Core features working in v1.4.0 (baseline established)
- [ ] Team alignment on approach (Phase A is choice)
- [ ] Resources allocated (600 hours over 18 weeks)
- [ ] Communication plan for users
- [ ] Rollback plan if major issues

### After Each Phase

**Phase 1 (Foundation - Week 4 Checkpoint):**
- [ ] Electron 28+ stable
- [ ] 60+ tests passing
- [ ] No regressions reported
- [ ] Performance baseline established

**Phase 2 (Modularization - Week 10 Checkpoint):**
- [ ] app.js split into modules
- [ ] 60%+ test coverage
- [ ] No behavioral changes verified
- [ ] File format compatibility confirmed

**Phase 3 (Dependency Upgrade - Week 14 Checkpoint):**
- [ ] Paper.js upgraded and tested
- [ ] jQuery removed completely
- [ ] All dependencies compatible
- [ ] 70%+ test coverage

**Phase 4 (Release - Week 18 Checkpoint):**
- [ ] 75%+ coverage on critical paths
- [ ] Full documentation updated
- [ ] Manual QA passed
- [ ] Ready for production release

---

## 8. Risk Mitigation Reference

| Risk | Owner | Mitigation | Timeline |
|------|-------|-----------|----------|
| Electron breaks features | Dev | Feature branch + test extensively | W1-2 |
| Tests don't catch bugs | QA | Human review + manual testing | W2-4 |
| Global state bugs | Dev | Static analysis + small refactors | W5-10 |
| Dependency conflicts | Dev | One at a time + npm audit | W11-14 |
| Performance regression | Dev | Baseline + profile | W4, ongoing |
| GCODE format change | Dev | Comprehensive tests first | W2-3 |
| Scope creep | PM | Clear scope + checkpoints | Continuous |
| Key person leaves | Team | Documentation + code review | Ongoing |
| User expectations | PM | Communication + incremental releases | Continuous |

---

## 9. Decision Log (To Be Filled In)

As decisions are made, update this section:

| Date | Decision | Rationale | Owner |
|------|----------|-----------|-------|
| TBD | Proceed with Option A? | | |
| TBD | Autotrace strategy? | | |
| TBD | Paper.js upgrade? | | |
| TBD | Paper.js alternative? | | |

---

## 10. Final Assessment

### Current Risk Level: 🔴 CRITICAL

**Main Issues:**
- Outdated Electron (security + stability risk)
- No tests (regression risk)
- Large scope (timeline risk)

### After Foundation (Week 4): 🟠 MEDIUM

**Improvements:**
- Electron upgraded (security + stability ✅)
- Tests established (regression risk ↓)
- Clear roadmap (scope ↓)

**Remaining Issues:**
- Large refactoring scope
- Dependency upgrade risks
- Unknown compatibility issues

### After Phase 2 (Week 10): 🟡 LOW-MEDIUM

**Further Improvements:**
- Modularization complete (refactoring ↓)
- 60%+ test coverage (regression ↓)
- File format validated ✅

### After Final Release (Week 18): 🟢 LOW

**Ideal State:**  
- Modern codebase ✅
- Comprehensive tests ✅
- Clear documentation ✅
- Agent-ready ✅
- User-stable ✅

---

## Action Items (for Project Manager)

1. **Immediate:** Get team alignment on Option A approach
2. **Week 1:** Create risk register in project management tool
3. **Ongoing:** Update risk assessment every 2 weeks
4. **Quarterly:** Communication update to stakeholders

---

## References

- [refactoring-strategy.md](refactoring-strategy.md) — Detailed roadmap
- [architecture-assessment.md](architecture-assessment.md) — Current state risks
- [testing-strategy.md](testing-strategy.md) — Test strategy risks
- [agent-workflow-recommendations.md](agent-workflow-recommendations.md) — Agent operation risks
