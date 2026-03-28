# 05 System Architecture

## Purpose

This document provides a planning-friendly architecture summary for PancakePainter. It is intended to be used together with [08_backlog_roadmap.md](./08_backlog_roadmap.md) during sprint planning and issue decomposition.

This file is a concise architectural reference derived from the deeper analysis in [architecture-analysis.md](./architecture-analysis.md).

## System Summary

PancakePainter is a legacy Electron desktop application for creating pancake drawings and exporting them as GCODE for PancakeBot.

At a high level, the application consists of:

- an Electron main process for application lifecycle and settings
- a renderer process for the user interface and workflow orchestration
- a Paper.js-based drawing engine for canvas interaction and path handling
- helper and tool modules for editing, selection, fill, undo, clipboard, and autotrace
- a GCODE generation pipeline for export

## Architectural Style

### Current Style

- monolithic desktop application
- renderer-centric coordination model
- global state across app, renderer, and Paper.js extensions
- plugin-like separation for tools and helpers

### Architectural Characteristics

- strong practical separation by folder and feature area
- weak runtime separation because of globals and implicit dependencies
- low testability in the current form
- high regression risk around export, settings, and renderer behavior

## Core Components

### Main Process

Primary file:
- `src/main.js`

Responsibilities:
- Electron startup and lifecycle
- settings initialization and persistence
- window creation and platform-specific behavior
- global constants for PancakeBot dimensions and speeds

Main concerns:
- outdated Electron APIs
- settings validation is weak
- error handling is minimal

### Renderer Shell

Primary file:
- `src/app.js`

Responsibilities:
- UI initialization
- menu setup
- file and app state integration
- DOM coordination and renderer-side orchestration

Main concerns:
- monolithic structure
- heavy jQuery usage
- global state coupling
- difficult to test in isolation

### Drawing Engine

Primary file:
- `src/editor.ps.js`

Responsibilities:
- Paper.js-based canvas behavior
- layer management
- image import setup
- tool and helper loading

Main concerns:
- custom extensions on shared Paper.js objects
- strong coupling to global renderer state
- hard-to-isolate behavior for automated testing

### Export Pipeline

Primary file:
- `src/gcode.js`

Responsibilities:
- clone and process drawing layers
- convert fills and paths
- sort travel paths
- group by pancake shade
- generate PancakeBot-compatible GCODE

Main concerns:
- critical business path
- complex transformation logic
- little defensive validation
- highest-value early test target

### Tools and Helpers

Primary folders:
- `src/tools/`
- `src/helpers/`

Responsibilities:
- pen, fill, and selection behavior
- undo and clipboard workflows
- utility functions
- autotrace integration

Main concerns:
- reasonable logical separation already exists
- contracts are implicit rather than explicit
- a good target for later modular formalization

## Critical Flows For Sprint Planning

### Flow 1: Application Startup

Relevant areas:
- `src/main.js`
- `src/app.js`
- `src/index.html`

Why it matters:
- any Electron modernization can break startup first
- startup validation is a minimum required smoke path

### Flow 2: Drawing and Editing

Relevant areas:
- `src/editor.ps.js`
- `src/tools/tool.pen.js`
- `src/tools/tool.fill.js`
- `src/tools/tool.select.js`

Why it matters:
- this is the primary user interaction model
- modernization must preserve tool behavior

### Flow 3: File and Settings Persistence

Relevant areas:
- `src/app.js`
- `src/main.js`
- settings and file dialogs

Why it matters:
- file persistence and settings are early modularization targets
- these areas need tests before extraction and upgrade work

### Flow 4: Export to GCODE

Relevant areas:
- `src/gcode.js`
- export window logic

Why it matters:
- this is the product-critical path
- it should receive early automated test coverage before major refactoring

## Architectural Constraints For Planning

1. The project has no real automated test suite yet.
2. The Electron version is outdated and high-risk.
3. The renderer is monolithic and strongly coupled.
4. Paper.js behavior is central to many workflows and expensive to change carelessly.
5. The export path is business-critical and should be protected early.

## Planning Implications

### Highest Priority Areas

- agent and repository workflow alignment
- validation and testing bootstrap
- Electron upgrade preparation and execution
- protection of GCODE generation and file/settings flows

### Good Early Modularization Targets

- file management
- settings management
- renderer integration boundaries
- explicit tool and helper contracts

### Areas To Avoid Early

- full UI rewrite
- replacement of the overall architecture style
- broad simultaneous dependency replacement
- large cross-cutting changes without tests

## Mapping To Revised Option A

### Phase 0
- align prompts and workflow to repository reality

### Phase 1
- create validation lane
- establish Jest baseline
- test GCODE and file/settings paths

### Phase 2
- modularize `app.js`
- separate renderer responsibilities
- formalize tool and helper boundaries

### Phase 3
- modernize Electron-adjacent and legacy dependencies with regression protection

### Phase 4
- expand coverage
- document the updated workflow and architecture

## Authoritative Companion Documents

- [08_backlog_roadmap.md](./08_backlog_roadmap.md)
- [refactoring-strategy.md](./refactoring-strategy.md)
- [testing-strategy.md](./testing-strategy.md)
- [architecture-analysis.md](./architecture-analysis.md)
