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
