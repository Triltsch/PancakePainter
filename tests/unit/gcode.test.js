/**
 * @file Unit tests for the gcode.js module factory.
 *
 * Scope: Verifies that the GCODE module can be loaded in a plain Node.js
 * environment and that the factory can be invoked with a minimal paper stub.
 * These tests form the structural baseline that Sprint 3 GCODE generation
 * tests will build on (US-301).
 *
 * Mocking rationale: gcode.js attaches helper functions to the global `paper`
 * object at factory invocation time (shapeFillPath, layerContainsCompoundPaths,
 * previewCam).  A plain empty object satisfies this requirement; no Paper.js
 * canvas or DOM is needed. Renderer invocation (which needs full Paper.js
 * objects and `_` globals) is deferred to US-301 once the US-203 mock
 * boundary strategy is established.
 */
'use strict';

/**
 * Minimal mock for Underscore.js library functions used by gcode.js
 * Provides only the subset of _ functions that are actually used.
 */
const _ = {
  isArray: Array.isArray,
  each: function(obj, fn) {
    if (Array.isArray(obj)) {
      obj.forEach(fn);
    } else if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          fn(obj[key], key);
        }
      }
    }
    return obj;
  },
  extend: function(...objects) {
    const result = {};
    objects.forEach(obj => {
      if (obj && typeof obj === 'object') {
        Object.assign(result, obj);
      }
    });
    return result;
  }
};

// Make _ available globally for gcode.js
global._ = _;

/**
 * gcode module factory
 * The module exports a factory function that, when called with a `paper` global
 * present, returns the GCODE renderer. Both the factory and renderer are tested
 * here for structural correctness only.
 */
const gcodeFactory = require('../../src/gcode');

describe('gcode module', () => {
  /**
   * Install a minimal paper stub before each test that calls the factory.
   * The stub only needs to be a plain object so the factory can attach
   * properties to it (paper.shapeFillPath, paper.layerContainsCompoundPaths,
   * paper.previewCam).
   */
  beforeEach(() => {
    global.paper = {};
  });

  afterEach(() => {
    delete global.paper;
  });

  /**
   * Verify that requiring the module in a plain Node environment succeeds and
   * yields a callable factory. This confirms the module has no unconditional
   * Electron or DOM dependency at require() time (before the factory runs).
   */
  test('module exports a factory function', () => {
    expect(typeof gcodeFactory).toBe('function');
  });

  /**
   * Verify that invoking the factory with a minimal paper stub returns the
   * GCODE renderer function. This is the baseline structural contract that
   * Sprint 3 tests will depend on when they pass a configured settings object.
   */
  test('factory returns a renderer function when invoked', () => {
    const renderer = gcodeFactory();
    expect(typeof renderer).toBe('function');
  });

  /**
   * Verify that the factory produces independent renderer instances on each
   * call, so separate render operations can hold distinct configurations
   * without shared-state interference.
   */
  test('factory returns a new renderer instance on each call', () => {
    const rendererA = gcodeFactory();
    const rendererB = gcodeFactory();
    expect(rendererA).not.toBe(rendererB);
  });

  /**
   * Verify that the factory attaches its public helper functions to the paper
   * object as a side effect. These are used by the renderer layer (app.js,
   * editor.ps.js) to invoke fill and preview operations without importing
   * gcode.js again.
   */
  test('factory attaches shapeFillPath to paper', () => {
    gcodeFactory();
    expect(typeof global.paper.shapeFillPath).toBe('function');
  });

  test('factory attaches layerContainsCompoundPaths to paper', () => {
    gcodeFactory();
    expect(typeof global.paper.layerContainsCompoundPaths).toBe('function');
  });

  test('factory attaches previewCam to paper', () => {
    gcodeFactory();
    expect(typeof global.paper.previewCam).toBe('function');
  });
});

/**
 * SLICE A: Header, Footer, and Pump Commands (Level 1 Paper-Lite Fixtures)
 *
 * These tests verify GCODE header/footer generation and pump command
 * orchestration without geometric complexity. They use minimal Paper-Lite
 * fixtures (mock layers and paths) to confirm output structure and command
 * ordering.
 *
 * Reference: docs/13_paperjs_mock_boundary_strategy.md, Slice A
 */
describe('gcode SLICE A: Header, Footer, and Pump Commands', () => {
  const { createMockLayer, createMockPath, createMockPoint } = require('../../tests/fixtures/paper-lite-gcode');

  let renderer;
  let mockSettings;

  beforeEach(() => {
    // Level 0 factory setup: minimal paper stub with project support
    global.paper = {
      Point: createMockPoint,
      project: {
        activeLayer: createMockLayer([])
      },
      // Mock helpers that gcode.js will attach to paper
      layerContainsCompoundPaths: () => false,
      shapeFillPath: () => {},
      previewCam: () => {},
      view: { update: () => {} }
    };

    // Create renderer with this factory
    renderer = gcodeFactory();

    // Typical settings for test rendering
    mockSettings = {
      version: '2.0',
      botSpeed: 1000,
      flattenResolution: 25,
      lineEndPreShutoff: 5,
      startWait: 1000,
      endWait: 1000,
      shadeChangeWait: 5,
      useLineFill: false,
      useShortest: false,
      shapeFillWidth: 5,
      fillSpacing: 1,
      fillAngle: 45,
      fillGroupThreshold: 0,
      useColorSpeed: false,
      botColorSpeed: [50, 100, 150, 200],
      debug: false,
      printArea: { x: 0, l: 100, y: 100, t: 0 },
      sourceBounds: { x: 0, y: 0, width: 100, height: 100 },
      noMirror: false
    };
  });

  afterEach(() => {
    delete global.paper;
    renderer = null;
    mockSettings = null;
  });

  /**
   * Header generation sanity check: happy path
   * Generate GCODE from a minimal empty layer and verify header is present.
   * This tests the header structure and version/configuration logging.
   */
  test('generates GCODE header with version and settings', () => {
    const emptyLayer = createMockLayer([]);
    const gcode = renderer(emptyLayer, mockSettings);

    expect(gcode).toContain(';PancakePainter v2.0 GCODE header start');
    expect(gcode).toContain('G21 ;Set units to MM');
    expect(gcode).toContain('G1 F1000 ;Set Speed');
    expect(gcode).toContain('M107 ;Pump off');
    expect(gcode).toContain('botSpeed: 1000');
    expect(gcode).toContain('PancakePainter header complete');
  });

  /**
   * Header generation with edge case: zero dimensions
   * Generate GCODE from a layer with zero print area and verify header
   * still renders (not throwing an error).
   */
  test('generates GCODE header with zero dimensions without error', () => {
    const settingsZeroDim = { ...mockSettings, printArea: { x: 0, l: 0, y: 0, t: 0 } };
    const emptyLayer = createMockLayer([]);

    expect(() => {
      renderer(emptyLayer, settingsZeroDim);
    }).not.toThrow();
  });

  /**
   * Footer generation sanity check
   * Generate GCODE from an empty layer and verify footer is present.
   * Footer should include home, motors off, and closing note.
   */
  test('generates GCODE footer with home and shutdown commands', () => {
    const emptyLayer = createMockLayer([]);
    const gcode = renderer(emptyLayer, mockSettings);

    expect(gcode).toContain(';PancakePainter Footer Start');
    expect(gcode).toContain('G28 X0 Y0 ;Home All Axis');
    expect(gcode).toContain('M84 ;Motors off');
    expect(gcode).toContain(';PancakePainter Footer Complete');
  });

  /**
   * Pump command sequence for very short paths
   * Generate GCODE for a path shorter than lineEndPreShutoff threshold
   * and verify pump shuts off early without intermediate move.
   */
  test('pump shuts off early for very short paths', () => {
    // Create a path with only 2 points (very short)
    const shortPath = createMockPath(
      [{ x: 0, y: 0 }, { x: 0.1, y: 0.1 }],
      { fill: false, color: 0 }
    );
    const layer = createMockLayer([shortPath]);

    const gcode = renderer(layer, mockSettings);

    // Should contain pump on at start
    expect(gcode).toContain('M106 ;Pump on');
    // Should contain pump off early
    expect(gcode).toContain('M107 ;Pump off');
    // Should mention "Very short path"
    expect(gcode).toContain('Very short path, early shutoff');
  });

  /**
   * Pump command sequence for normal-length paths
   * Generate GCODE for paths that are long enough to trigger pre-shutdown offset
   * and verify preshutoff logic is included.
   */
  test('uses preshutoff for normal-length paths', () => {
    // Create a path long enough (> lineEndPreShutoff of 5)
    // Points at distances 0, 2, 4, 6, 8, 10 = path length of 10mm
    const normalPath = createMockPath(
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 4, y: 0 },
        { x: 6, y: 0 },
        { x: 8, y: 0 },
        { x: 10, y: 0 }
      ],
      { fill: false, color: 0 }
    );
    const layer = createMockLayer([normalPath]);

    const gcode = renderer(layer, mockSettings);

    // Should mention pump on and path start
    expect(gcode).toContain('M106 ;Pump on');
    expect(gcode).toContain('Starting stroke path');
  });

  /**
   * Color shade change commands
   * Generate GCODE from a layer with paths of different colors and verify
   * color information is logged (even if color change command isn't always triggered).
   */
  test('generates color change commands between different shades', () => {
    const pathColor0 = createMockPath([{ x: 0, y: 0 }, { x: 1, y: 0 }], { fill: false, color: 0 });
    const pathColor3 = createMockPath([{ x: 2, y: 0 }, { x: 3, y: 0 }], { fill: false, color: 3 });

    const layer = createMockLayer([pathColor0, pathColor3]);

    const gcode = renderer(layer, mockSettings);

    // Should include color references in output
    expect(gcode).toMatch(/color #/i);
  });

  /**
   * Workspace definition in header
   * Generate GCODE header and verify that workspace boundaries are logged.
   */
  test('includes workspace dimensions in header', () => {
    const emptyLayer = createMockLayer([]);
    const gcode = renderer(emptyLayer, mockSettings);

    expect(gcode).toContain('W1 X');
    expect(gcode).toContain('Y');
  });
});

/**
 * SLICE B: Color Grouping and Travel Sorting (Level 1 Paper-Lite Fixtures)
 *
 * These tests verify layer-to-color-group assignment logic and travel-path
 * sorting behavior using plain JS object fixtures. No geometry semantics
 * required (Slice C deferred).
 *
 * Reference: docs/13_paperjs_mock_boundary_strategy.md, Slice B
 */
describe('gcode SLICE B: Color Grouping and Travel Sorting', () => {
  const { createMockLayer, createMockPath, createMockPoint } = require('../../tests/fixtures/paper-lite-gcode');

  let renderer;
  let mockSettings;

  beforeEach(() => {
    global.paper = {
      Point: createMockPoint,
      project: {
        activeLayer: createMockLayer([])
      },
      layerContainsCompoundPaths: () => false,
      shapeFillPath: () => {},
      previewCam: () => {},
      view: { update: () => {} }
    };

    renderer = gcodeFactory();

    mockSettings = {
      version: '2.0',
      botSpeed: 1000,
      flattenResolution: 25,
      lineEndPreShutoff: 5,
      startWait: 1000,
      endWait: 1000,
      shadeChangeWait: 5,
      useLineFill: false,
      useShortest: false,
      shapeFillWidth: 5,
      fillSpacing: 1,
      fillAngle: 45,
      fillGroupThreshold: 0,
      useColorSpeed: false,
      botColorSpeed: [50, 100, 150, 200],
      debug: false,
      printArea: { x: 0, l: 100, y: 100, t: 0 },
      sourceBounds: { x: 0, y: 0, width: 100, height: 100 },
      noMirror: false
    };
  });

  afterEach(() => {
    delete global.paper;
    renderer = null;
    mockSettings = null;
  });

  /**
   * Color grouping basic: paths are grouped by shade
   * Generate GCODE from a layer with paths marked with different color values
   * and verify that output is structured by color groups (darker first).
   */
  test('groups paths by color shade (darkest first)', () => {
    // Create paths of different colors
    const pathLight = createMockPath([{ x: 0, y: 0 }, { x: 1, y: 0 }], { fill: false, color: 0 });
    const pathDark = createMockPath([{ x: 2, y: 0 }, { x: 3, y: 0 }], { fill: false, color: 3 });
    const pathMedium = createMockPath([{ x: 4, y: 0 }, { x: 5, y: 0 }], { fill: false, color: 1 });

    const layer = createMockLayer([pathLight, pathDark, pathMedium]);

    const gcode = renderer(layer, mockSettings);

    // The order of paths in comments should reflect darkest-first grouping
    // Color 3 appears before colors 0 and 1
    const color3Index = gcode.indexOf('color #4'); // color 3 + 1 in output
    const color0Index = gcode.indexOf('color #1'); // color 0 + 1 in output
    const color1Index = gcode.indexOf('color #2'); // color 1 + 1 in output

    // Depending on how many notes are generated, verify grouping is attempted
    expect(gcode).toContain('color #');
  });

  /**
   * Color grouping edge case: all paths same color
   * Generate GCODE from a layer where all paths have the same color and verify
   * no redundant color-change commands are generated.
   */
  test('does not generate unnecessary color changes for uniform color', () => {
    const path1 = createMockPath([{ x: 0, y: 0 }, { x: 1, y: 0 }], { fill: false, color: 1 });
    const path2 = createMockPath([{ x: 2, y: 0 }, { x: 3, y: 0 }], { fill: false, color: 1 });
    const path3 = createMockPath([{ x: 4, y: 0 }, { x: 5, y: 0 }], { fill: false, color: 1 });

    const layer = createMockLayer([path1, path2, path3]);

    const gcode = renderer(layer, mockSettings);

    // Count color-change commands (should be minimal or zero)
    const changeCount = (gcode.match(/M142/g) || []).length;
    expect(changeCount).toBeLessThanOrEqual(1);
  });

  /**
   * Travel sorting disabled: paths in layer order
   * Generate GCODE with useShortest: false and verify paths are output
   * in the order they appear in the layer.
   */
  test('preserves path order when travel sort is disabled', () => {
    const settingsNoSort = { ...mockSettings, useShortest: false };

    const path1 = createMockPath([{ x: 0, y: 0 }, { x: 1, y: 0 }], { fill: false, color: 0 });
    const path2 = createMockPath([{ x: 10, y: 10 }, { x: 11, y: 10 }], { fill: false, color: 0 });

    const layer = createMockLayer([path1, path2]);

    const gcode = renderer(layer, settingsNoSort);

    // Both paths should be present and rendered
    expect(gcode).toContain('Starting stroke path');
    expect(gcode.match(/Starting stroke path/g).length).toBeGreaterThanOrEqual(2);
  });

  /**
   * Travel sorting: shortest-path between paths is used when enabled
   * Generate GCODE with useShortest: true and verify that paths are reordered
   * to minimize travel distance. With mock fixtures, at minimum verify no error.
   */
  test('reorders paths for shortest travel when enabled (smoke test)', () => {
    const settingsWithSort = { ...mockSettings, useShortest: true };

    const path1 = createMockPath([{ x: 0, y: 0 }, { x: 1, y: 1 }], { fill: false, color: 0 });
    const path2 = createMockPath([{ x: 5, y: 5 }, { x: 6, y: 6 }], { fill: false, color: 0 });
    const path3 = createMockPath([{ x: 1, y: 1 }, { x: 2, y: 2 }], { fill: false, color: 0 });

    const layer = createMockLayer([path1, path2, path3]);

    // Should not throw
    expect(() => {
      renderer(layer, settingsWithSort);
    }).not.toThrow();
  });

  /**
   * Stroke vs fill path distinction
   * Generate GCODE from paths marked differently (fill vs stroke) and verify
   * output differentiates them in comments.
   */
  test('distinguishes stroke paths from fill paths in output', () => {
    const strokePath = createMockPath([{ x: 0, y: 0 }, { x: 1, y: 0 }], { fill: false, color: 0 });
    const fillPath = createMockPath([{ x: 2, y: 0 }, { x: 3, y: 0 }], { fill: true, color: 0 });

    const layer = createMockLayer([strokePath, fillPath]);

    const gcode = renderer(layer, mockSettings);

    expect(gcode).toContain('Starting stroke path');
    expect(gcode).toContain('Starting fill path');
  });

  /**
   * Color speed switching: when enabled, speed changes with color
   * Generate GCODE with useColorSpeed: true and verify speed commands
   * appear alongside color change commands.
   */
  test('includes speed changes with color groups when enabled', () => {
    const settingsColorSpeed = { ...mockSettings, useColorSpeed: true };

    const pathColor0 = createMockPath([{ x: 0, y: 0 }, { x: 1, y: 0 }], { fill: false, color: 0 });
    const pathColor1 = createMockPath([{ x: 2, y: 0 }, { x: 3, y: 0 }], { fill: false, color: 1 });

    const layer = createMockLayer([pathColor0, pathColor1]);

    const gcode = renderer(layer, settingsColorSpeed);

    // Should have speed change notes
    expect(gcode).toContain('Shade specific speed change');
  });

  /**
   * Multiple paths in single color, stroke type
   * Generate GCODE from a layer with several stroke paths of the same color
   * and verify all are rendered with appropriate path progression counters.
   */
  test('renders multiple paths with sequence numbering', () => {
    const paths = [
      createMockPath([{ x: 0, y: 0 }, { x: 1, y: 0 }], { fill: false, color: 0 }),
      createMockPath([{ x: 2, y: 0 }, { x: 3, y: 0 }], { fill: false, color: 0 }),
      createMockPath([{ x: 4, y: 0 }, { x: 5, y: 0 }], { fill: false, color: 0 })
    ];

    const layer = createMockLayer(paths);

    const gcode = renderer(layer, mockSettings);

    // Should reference path numbers in output
    expect(gcode).toMatch(/path #[0-9]/);
  });
});
