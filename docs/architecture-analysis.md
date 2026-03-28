# Architecture Analysis

## 1. System Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Electron Application                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Main Process (Node.js)                                         │
│  ├── main.js                                                    │
│  │   ├── App initialization & settings management              │
│  │   ├── Window lifecycle management                           │
│  │   ├── Squirrel updates (Windows)                            │
│  │   └── Platform detection & setup                            │
│  │                                                              │
│  └── squirrel-update.js (Windows installer updates)            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Renderer Process (Browser/JavaScript)                          │
│  ├── HTML/CSS/UI Layer                                         │
│  │   ├── index.html (main canvas & UI)                        │
│  │   ├── styles/ (SCSS → CSS)                                 │
│  │   └── Menus (platform-specific)                            │
│  │                                                              │
│  ├── Application Logic (app.js)                                │
│  │   ├── File management & I/O                                │
│  │   ├── Event delegation                                      │
│  │   ├── Settings/preferences UI                              │
│  │   └── Integration point for tools/helpers                  │
│  │                                                              │
│  └── Core Modules                                              │
│      ├── editor.ps.js (PaperScript - canvas engine)           │
│      │   ├── Layer management (image, main)                   │
│      │   ├── Tools loading & initialization                   │
│      │   ├── Image import functionality                        │
│      │   └── Presentation logic                               │
│      │                                                          │
│      ├── Tools (paper.js-based)                                │
│      │   ├── tool.pen.js (drawing tool)                      │
│      │   ├── tool.fill.js (flood fill)                      │
│      │   ├── tool.select.js (selection & transform)          │
│      │   └── Each tool = paper.Tool instance                  │
│      │                                                          │
│      ├── Helpers (utility modules)                             │
│      │   ├── helper.undo.js (undo/redo stack)                │
│      │   ├── helper.clipboard.js (copy/paste paths)          │
│      │   ├── helper.utils.js (misc utilities)                │
│      │   └── helper.autotrace.js (integrates autotrace CLI)  │
│      │                                                          │
│      ├── Simulation & Export                                   │
│      │   ├── gcode.js (GCODE generator)                      │
│      │   ├── simulator.ps.js (path preview)                  │
│      │   ├── autotrace.ps.js (autotrace integration)         │
│      │   └── Process path tracing, fills, color grouping     │
│      │                                                          │
│      └── Windows (child processes)                            │
│          ├── window.export.* (GCODE export UI)               │
│          ├── window.autotrace.* (auto-trace settings)        │
│          └── window.settings.* (app preferences)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
             ↓
        System Libraries & Resources
        ├── paper.js 0.10.2 (canvas abstraction)
        ├── jQuery 2.2.4 (DOM manipulation)
        ├── Underscore.js (functional utilities)
        ├── i18next (localization)
        ├── autotrace CLI (image tracing executable)
        ├── jimp, ndarray, clipper (image/path processing)
        └── electron-canvas-to-buffer (canvas export)
```

## 2. Module-by-Module Analysis

### 2.1 Main Process (`main.js`)

**Responsibility:** Application lifecycle, window management, settings persistence

**Key Functions:**
- `settingsInit()` — Initializes app constants and settings
- `windowInit()` — Creates main window
- `start()` — Entry point; handles Squirrel updates

**Global State:**
- `app.constants` — PancakeBot hardware specs (griddle dimensions, speeds)
- `app.settings` — User preferences (window size, speeds, fill parameters)

**Observations:**
- Settings have clear defaults with three-tier loading (defaults → file → user config)
- Platform-specific handling (Windows Squirrel updates)
- IPC communication with renderer not explicitly visible here

**Code Quality Issues:**
- Settings management is procedural (not class-based)
- Error handling is minimal (try/catch with silent failures)
- No validation of loaded settings

---

### 2.2 Renderer Process (`app.js`)

**Responsibility:** Central application logic and DOM/window integration

**Key Sections:**
- **Library Loading** — jQuery, Underscore, Paper.js, i18n, remote (IPC)
- **Global State Setup** — File management, app version tracking
- **UI Initialization** — Griddle image load, menu initialization
- **Helper/Tool Loading** — Dynamically loads tools and helpers

**Observations:**
- Large single file (likely 500+ lines) — monolithic renderer
- Heavy use of jQuery for DOM manipulation
- Global namespace pollution (`window.$`, `window._`, `window.paper`)
- i18n helper for element translation

**Code Quality Issues:**
- No separation of concerns (UI, business logic, state management mixed)
- Inline HTML structure detection (e.g., `$('#toolback .ver')`)
- Tight coupling to DOM structure

---

### 2.3 Canvas Engine (`editor.ps.js` - PaperScript)

**Responsibility:** Canvas state, drawing primitives, layer management

**Key Components:**
- **LayerManagement:** `paper.imageLayer`, `paper.mainLayer`
- **Colors:** `paper.pancakeShades` (4 shades), shade selection
- **Tools:** Dynamic loading of pen, fill, select tools
- **Helpers:** Dynamic loading of undo, clipboard, utils, autotrace
- **Image Import:** `initImageImport()` for manual trace

**Observations:**
- Uses Paper.js scripting API (embedded JavaScript executed in paper context)
- Layer separation for images and main drawing
- Image import uses dataURI for encoding
- Opacity 0.5 for trace images

**Code Quality Issues:**
- Paper.js adds custom methods directly to core module (`paper.setCursor()`, etc.)
- Mixing PaperScript with Node.js require
- Global paper object extended with application-specific properties

---

### 2.4 Tools System

#### `tool.pen.js`
- **Purpose:** Freehand drawing and polygonal shape creation
- **Interaction:** Click-drag for lines, click for points, ESC/Enter to finish
- **State:** Tracks current path being drawn

#### `tool.fill.js`
- **Purpose:** Flood-fill for enclosed areas
- **Libraries:** Uses `n-dimensional-flood-fill` and ndarray
- **State:** Converts filled regions into zig-zag or shape patterns

#### `tool.select.js`
- **Purpose:** Object selection, transformation (move, scale, rotate, edit points)
- **Interaction:** Corner handles for scale, top handle for rotate
- **State:** Tracks selected objects and edit mode

**Architecture Pattern:**
- Each tool returns a `paper.Tool` instance with configured event handlers
- Tools manage their own state and rendering
- Paper.js event system (onMouseDown, onMouseDrag, onMouseUp)

---

### 2.5 Helpers System

#### `helper.undo.js`
- Implements undo/redo stack
- Integrates with paper.js paths
- Stores state snapshots

#### `helper.clipboard.js`
- Copy/paste operations for paths
- Works with paper.js clipboard API

#### `helper.utils.js`
- Miscellaneous utility functions
- Likely contains geometry, path manipulation helpers

#### `helper.autotrace.js`
- Wraps autotrace CLI tool
- Converts raster images to vector paths

---

### 2.6 Export System

#### `gcode.js` (GCODE Generator)

**Data Flow:**
1. Takes Paper.js layer as input
2. Clones layer (non-destructive transformation)
3. Processing pipeline:
   - Clean empty paths
   - Convert fills (line-fill or shape-fill)
   - Flatten compound paths
   - Convert closed paths
   - Travel-sort (optimize path order)
   - Group paths by color shade (0-3)
   - Generate GCODE with speed commands

**Configuration:**
- `useLineFill` — Line-based vs shape-based fills
- `useColorSpeed` — Per-color speed adjustments
- `useShortest` — Travel sort optimization
- Various fill and shutdown timing parameters

**Dependencies:**
- `clipper` — Polygon operations
- `jscut_custom` — Path manipulation

**Code Quality Issues:**
- Many nested loops and color grouping logic
- State mutation during processing
- No explicit error handling

#### `simulator.ps.js`
- Preview/simulation of GCODE rendering

#### `autotrace.ps.js`
- Integrates autotrace CLI for automatic image tracing

---

### 2.7 Window Management

#### Export Window (`window.export.js` + `.webview.html`)
- Displays export options
- Likely integrates with dialog for file save

#### Autotrace Window (`window.autotrace.js` + `.webview.html`)
- Settings panel for automatic image tracing
- Threshold, color sensitivity parameters

#### Settings Window (`window.settings.js` + `.html`)
- User preferences (speeds, fills, settings)
- Persists to app.settings

---

## 3. Data Flows

### 3.1 Drawing Workflow

```
User Input (OnMouseDown) 
    → Tool Event Handler (tool.pen.js) 
    → Create/Modify Path (paper.js) 
    → Render (Canvas)
    → [Undo Helper] Store snapshot if needed
    → UI Update
```

### 3.2 File I/O

```
User: File > Open
    → dialog.showOpenDialog()
    → Read JSON from file
    → Deserialize to Paper.js objects
    → Render on canvas
    → Update app.currentFile state
```

### 3.3 Export (GCODE Generation)

```
User: File > Export
    → Collect settings from app.settings
    → Call gcode.js generateGcode(layer, settings)
    → Process fills, flatten paths, color-group, optimize travel
    → Generate GCODE text
    → Write to file
    → Show success message
```

### 3.4 Image Import (Autotrace)

```
User: Click Image Import
    → dialog.showOpenDialog() for image file
    → Load image as dataURI
    → Create Paper.js Raster on imageLayer
    → [Automatic] Call helper.autotrace → CLI autotrace → Vector paths
    → [Manual] Allow manual tracing with image as reference
    → Integrate paths to main drawing
```

---

## 4. Configuration & Runtime Structure

### 4.1 Settings Hierarchy

```
app.settings.defaults (hardcoded)
    ↓ (overridden by)
app.settings.v (loaded from files)
    ← File: ~/.config/PancakePainter/settings.json
    ← File: app/settings.json
    ← User Config: ~/.config/PancakePainter/config.json
```

### 4.2 Constants

Located in `main.js`:
```javascript
app.constants = {
  pancakeShades: ['#ffea7e', '#e2bc15', '#a6720e', '#714a00'],
  botSpeedMax: 6600,  // mm/min
  griddleSize: { width: 507.5, height: 267.7 },  // mm
  printableArea: { ... }  // constraints
}
```

---

## 5. Dependencies & Libraries

### Core Runtime
| Package | Version | Purpose |
|---------|---------|---------|
| electron-prebuilt | 1.0.1 | Desktop app framework (OUTDATED) |
| paper | 0.10.2 | Canvas/SVG abstraction |
| jquery | 2.2.4 | DOM manipulation |
| underscore | 1.8.3 | Functional utilities |
| i18next | 1.10.4 | Localization |

### Image Processing
| Package | Purpose |
|---------|---------|
| autotrace | CLI tool for raster→vector |
| jimp | Image manipulation |
| ndarray | N-dimensional arrays |
| n-dimensional-flood-fill | Fill algorithm |

### Path & Geometry
| Package | Purpose |
|---------|---------|
| clipper | Polygon clipping/operations |
| jscut_custom | Path optimizations |

### Utilities
| Package | Purpose |
|---------|---------|
| electron-canvas-to-buffer | Canvas→buffer export |
| electron-squirrel-startup | Windows installer integration |
| datauri | Image encoding |
| toastr | Toast notifications |
| progress-promise | Promise-based progress tracking |
| rangeslider.js | Range slider UI component |
| fs-plus | Enhanced file system |
| grunt | Build automation |
| gradle-contrib-sass | SCSS compilation |

---

## 6. File Organization

```
src/
├── main.js                      # Electron main process
├── app.js                       # Initial DOM setup & integration
├── editor.ps.js                 # PaperScript canvas engine
├── gcode.js                     # GCODE generation
├── simulator.ps.js              # Path preview/simulation
├── autotrace.ps.js              # Autotrace integration
├── squirrel-update.js           # Windows installer handling
├── index.html                   # Main UI structure
├── helpers/
│   ├── helper.undo.js           # Undo/redo functionality
│   ├── helper.clipboard.js      # Copy/paste
│   ├── helper.utils.js          # Utilities
│   └── helper.autotrace.js      # Autotrace CLI wrapper
├── tools/
│   ├── tool.pen.js              # Drawing tool
│   ├── tool.fill.js             # Fill tool
│   └── tool.select.js           # Selection tool
├── windows/
│   ├── window.export.*          # Export dialog
│   ├── window.autotrace.*       # Autotrace settings
│   └── window.settings.*        # Preferences
├── styles/
│   ├── index.scss               # Main styles
│   ├── _fancy-elements.scss     # Component styles
│   ├── _loaders.scss            # Loading indicators
│   ├── _math.scss               # Math helper styles
│   └── _trace-menu.scss         # Trace menu styles
└── libs/
    ├── clipper.js               # Polygon operations library
    └── jscut_custom.js          # Path optimization library

menus/
├── menu-init.js                 # Menu initialization router
├── menu-darwin.js               # macOS-specific menu
├── menu-win32.js                # Windows-specific menu
└── menu-linux.js                # Linux-specific menu

build/
├── Gruntfile.js                 # Build configuration
└── tasks/                       # Custom Grunt tasks

resources/
├── darwin/                      # macOS resources (autotrace binary, etc.)
├── linux/                       # Linux resources
└── win32/                       # Windows resources

locales/
└── en-US/                       # English localization files
    ├── app-en-US.json           # App strings
    └── menus-en-US.json         # Menu strings
```

---

## 7. Architectural Style Classification

**Primary Style: Monolithic Desktop Application**

**Characteristics:**
- Single-window (with auxiliary child windows) renderer process
- Integrated UI and business logic
- Paper.js acts as both view and state container
- Global state across modules
- No clear separation between presentation and domain logic

**Secondary Patterns:**
- **Plugin/Tool System** — Tools and helpers are loaded dynamically
- **Adapter Pattern** — Platform-specific menus
- **Pipeline Pattern** — GCODE generation has clear processing stages

---

## 8. Communication Patterns

### Process Communication (Main ↔ Renderer)

- **Method:** Electron IPC (ipcMain, ipcRenderer)
- **Usage:** File dialogs, system operations, settings persistence
- **Implicit in code:** Uses `remote` to access main process functions

### Within Renderer Process

- **Paper.js Event System** — Tool handlers subscribe to canvas events
- **jQuery Event Delegation** — DOM events
- **Callback Pattern** — File dialogs, async operations
- **Promise-based** — Export and complex operations

---

## 9. Entry Points & Execution Paths

### Application Startup
1. **Node.js** starts `main.js`
2. `start()` function called
3. `settingsInit()` — Load constants and settings
4. `windowInit()` — Create main window, load `index.html`
5. `index.html` loads `app.js`
6. `app.js` initializes DOM, waits for griddle image
7. `initEditor()` called when griddle loads
8. `editor.ps.js` loaded (Paper.js execution)
9. Tools and helpers loaded dynamically
10. UI ready for user interaction

### Drawing Workflow
- User tool selection → Paper.js tool activation
- Mouse events → Tool event handlers
- Path modifications → Canvas re-render
- Undo tracking (if enabled)

### Export Workflow
- User triggers export
- Settings gathered from UI and app.settings
- `gcode.js` processes layer
- File dialog for save location
- GCODE written to disk

---

## 10. Known Code Locations

| Concern | Location |
|---------|----------|
| Hardware specs | `main.js` - `app.constants` |
| User preferences | `main.js` - `app.settings` |
| Main UI rendering | `src/index.html` |
| Canvas/drawing logic | `editor.ps.js` |
| Path processing | `gcode.js` |
| Tool implementations | `src/tools/*.js` |
| Helper utilities | `src/helpers/*.js` |
| Window management | `src/windows/*.js` |
| Localization strings | `locales/**/*.json` |
| Styles | `src/styles/*.scss` |
| Build config | `build/Gruntfile.js` |

---

## 11. Current Test Infrastructure

**Finding:** Minimal testing infrastructure present

- **Linting Only:** `npm test` runs jshint on source files
- **No Unit Tests:** No test framework configured
- **No Integration Tests:** Manual testing required
- **No E2E Tests:** Manual user testing required

---

## 12. Summary

The PancakePainter architecture is a **monolithic Electron desktop application** with a functional tool/helper plugin system. The codebase is organized logically but tightly coupled through global state. Paper.js serves dual roles as both rendering engine and state container. The application is feature-complete but lacks modern development practices (testing, type safety, clean architecture).

Key strengths: reasonable file organization, clear tool/helper separation, functional settings management.

Key weaknesses: global state, missing tests, outdated dependencies, monolithic renderer process.
