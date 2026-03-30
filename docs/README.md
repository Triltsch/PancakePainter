# PancakePainter - Comprehensive Architecture Documentation

This directory contains a complete technical analysis of the PancakePainter codebase, prepared for agent-based development and AI-assisted refactoring.

## Overview

**PancakePainter** is an Electron-based desktop drawing application designed for the [PancakeBot](http://pancakebot.com) — a novelty robot that creates images by dispensing batter on a griddle. The application allows users to:

- Draw freehand pancake lines and polygonal shapes
- Import and trace images (automatic and manual)
- Fill enclosed areas with specified patterns
- Configure bot-specific parameters
- Export drawings as G-code instructions for the PancakeBot

## Document Guide

### Suggested Reading Order

1. **[architecture-analysis.md](architecture-analysis.md)** — Current state of the codebase
   - System structure and components
   - Module breakdown and dependencies
   - Data and control flows
   - Entry points and execution paths

2. **[architecture-assessment.md](architecture-assessment.md)** — Quality evaluation
   - Architectural strengths and weaknesses
   - Risks and technical debt assessment
   - Maintainability, extensibility, and testability analysis
   - Suitability for AI-assisted development

3. **[refactoring-strategy.md](refactoring-strategy.md)** — Improvement roadmap
   - Three refactoring options (evolutionary, partial, full)
   - Trade-offs and risk analysis
   - Prioritized recommendations
   - Implementation sequencing

4. **[testing-strategy.md](testing-strategy.md)** — Test architecture
   - Test pyramid approach
   - Unit, integration, and E2E test strategy
   - Current gaps and target coverage
   - Implementation roadmap

5. **[13_paperjs_mock_boundary_strategy.md](13_paperjs_mock_boundary_strategy.md)** — Paper.js mock boundary
   - Practical mock boundary for Paper-dependent modules
   - `gcode.js` prototype scope for Jest expansion
   - Limitations, non-goals, and implementation follow-ups

6. **[agent-workflow-recommendations.md](agent-workflow-recommendations.md)** — Agent coordination
   - How to decompose work for multiple agents
   - Suggested execution order
   - Guardrails and coordination patterns
   - Input/output contracts between agents

7. **[open-questions-and-risks.md](open-questions-and-risks.md)** — Known unknowns
   - Assumptions that need validation
   - Critical unknowns
   - Risk register with mitigation strategies

## Key Facts at a Glance

| Aspect | Detail |
|--------|--------|
| **Type** | Electron Desktop Application |
| **Primary Language** | JavaScript (ES5) |
| **Framework** | Electron 1.0.1 (2016-era, OUTDATED) |
| **Graphics** | Paper.js 0.10.2 |
| **Platforms** | Windows, macOS, Linux |
| **Package Manager** | npm |
| **Build System** | Grunt + Sass |
| **Localization** | i18next |
| **Current Version** | 1.4.0 |
| **License** | Apache 2.0 |

## Critical Observations

### ⚠️ High-Risk Areas

- **Severely outdated Electron version** (1.0.1 from 2016) — major security and stability concerns
- **No automated test suite** — only linting (jshint)
- **Heavy global state** — window.paper, app globals, tight coupling
- **Legacy jQuery pattern** — outdated DOM manipulation approach
- **Monolithic renderer process** — large app.js with mixed concerns

### ✅ Strengths to Preserve

- Clean modular structure with helpers and tools
- Functional separation between main and renderer processes
- Good i18n infrastructure for multi-language support
- Platform-specific menu abstraction
- Reasonable settings management pattern

## Recommended Next Steps

1. **Immediate (Week 1):** Upgrade Electron and audit security
2. **Short-term (Month 1):** Establish test foundation and documentation
3. **Medium-term (Month 2-3):** Modernize tooling and dependencies
4. **Long-term (Quarter 2):** Consider architectural refactoring for extensibility

## Document Maintenance

These documents are **authoritative references** for:
- Code review and modification decisions
- Prioritization of refactoring work
- Agent task decomposition
- Acceptance criteria for improvements

All changes to the codebase should be validated against these architectural guidelines.

---

*Last Updated: 2026-03-28*  
*Analysis Scope: PancakePainter v1.4.0 (current branch: master)*
