/**
 * @file Unit tests for the webview-preload.js path shim and sandbox resilience.
 *
 * Scope: verifies that webview-preload.js loads cleanly when the Node.js
 * `path` built-in and relative requires (e.g. ipc-channels.js) are unavailable
 * (as happens in the Electron webview/simulator sandbox), and that the pure-JS
 * fallback implementations of `joinPath` and `path.parse` produce correct
 * cross-platform results.
 *
 * Background:
 * - Issue #52 — `var nodePath = require('path')` at the top level caused
 *   "module not found: path" in the simulator context.
 * - Follow-on — `require('../ipc-channels.js')` caused "module not found:
 *   ../ipc-channels.js" in the same context, crashing the IPC bridge setup.
 */
'use strict';

/**
 * Loads webview-preload.js in a fresh module registry with controlled mocks.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.pathThrows=false]   Simulate path module unavailable.
 * @param {boolean} [opts.channelsThrow=false] Simulate ipc-channels unavailable.
 * @returns {object} The global.window object populated by the preload.
 */
function loadPreload(opts) {
  var pathThrows    = opts && opts.pathThrows;
  var channelsThrow = opts && opts.channelsThrow;

  jest.resetModules();

  if (pathThrows) {
    jest.doMock('path', function() {
      throw new Error('module not found: path');
    });
  }

  if (channelsThrow) {
    jest.doMock('../../../src/ipc-channels.js', function() {
      throw new Error('module not found: ../ipc-channels.js');
    });
  }

  jest.doMock('electron', function() {
    return {
      contextBridge: null, // Forces window.webviewBridge assignment path.
      ipcRenderer: {
        sendSync: jest.fn().mockReturnValue({
          appPath: '/test/app',
          constants: {}
        }),
        on: jest.fn()
      }
    };
  });

  global.window = {};
  require('../../../src/preload/webview-preload');
  return global.window;
}

afterEach(function() {
  jest.dontMock('path');
  jest.dontMock('../../../src/ipc-channels.js');
  jest.dontMock('electron');
  delete global.window;
});

describe('webview-preload — sandbox resilience', function() {
  /**
   * Core regression test for Issue #52 (path module).
   * Expected: module initialises without throwing when path is unavailable.
   */
  test('loads without error when path module is unavailable', function() {
    expect(function() {
      loadPreload({ pathThrows: true });
    }).not.toThrow();
  });

  /**
   * Regression test for follow-on Issue #52 error (ipc-channels.js).
   * Expected: module loads cleanly when the relative require for
   * ipc-channels.js also fails (full webview sandbox simulation).
   */
  test('loads without error when ipc-channels.js is unavailable', function() {
    expect(function() {
      loadPreload({ pathThrows: true, channelsThrow: true });
    }).not.toThrow();
  });

  /**
   * Verifies the IPC bridge is functional using the inline fallback channels
   * when ipc-channels.js cannot be resolved.
   * Expected: webviewBridge.ipc.on and sendToHost exist and are callable.
   */
  test('exposes IPC bridge using inline channel fallback', function() {
    var win = loadPreload({ pathThrows: true, channelsThrow: true });
    expect(typeof win.webviewBridge.ipc.on).toBe('function');
    expect(typeof win.webviewBridge.ipc.sendToHost).toBe('function');
  });

  /**
   * Verifies the webviewBridge.path API is fully exposed after loading
   * without the path module, so downstream consumers are not broken.
   * Expected: join, basename, extname, and parse are callable functions.
   */
  test('exposes path API on webviewBridge when path module is unavailable', function() {
    var win = loadPreload({ pathThrows: true });
    var pathApi = win.webviewBridge.path;
    expect(typeof pathApi.join).toBe('function');
    expect(typeof pathApi.basename).toBe('function');
    expect(typeof pathApi.extname).toBe('function');
    expect(typeof pathApi.parse).toBe('function');
  });
});

describe('webview-preload — joinPath fallback (no path module)', function() {
  /**
   * Verifies the pure-JS joinPath fallback joins POSIX segments correctly.
   * Expected: segments separated by '/' when the first segment has no backslash.
   */
  test('joins POSIX path segments with forward-slash separator', function() {
    var win = loadPreload({ pathThrows: true });
    var result = win.webviewBridge.path.join('/test/app', 'src', 'gcode.js');
    expect(result).toBe('/test/app/src/gcode.js');
  });

  /**
   * Verifies the pure-JS joinPath fallback handles Windows paths correctly.
   * Expected: segments separated by backslash when the first segment uses them.
   */
  test('joins Windows path segments with backslash separator', function() {
    var win = loadPreload({ pathThrows: true });
    var result = win.webviewBridge.path.join('C:\\Users\\app', 'src', 'file.js');
    expect(result).toBe('C:\\Users\\app\\src\\file.js');
  });

  /**
   * Verifies double separators produced by joining are collapsed.
   * Expected: no doubled slashes appear in the resulting path.
   */
  test('collapses duplicate separators in joined POSIX path', function() {
    var win = loadPreload({ pathThrows: true });
    var result = win.webviewBridge.path.join('/test/', '/gcode.js');
    expect(result).not.toMatch(/\/\//);
  });

  /**
   * Verifies empty first segments do not introduce a leading separator.
   * Expected: behaves like path.join('', 'src') -> 'src'.
   */
  test('matches path.join when first segment is empty', function() {
    var win = loadPreload({ pathThrows: true });
    var result = win.webviewBridge.path.join('', 'src');
    expect(result).toBe('src');
  });
});

describe('webview-preload — parse fallback (no path module)', function() {
  /**
   * Verifies the pure-JS parse fallback extracts components from a POSIX path.
   * Expected: base, ext, name, and dir are set correctly.
   */
  test('parses a POSIX path into correct components', function() {
    var win = loadPreload({ pathThrows: true });
    var result = win.webviewBridge.path.parse('/test/dir/file.js');
    expect(result.base).toBe('file.js');
    expect(result.ext).toBe('.js');
    expect(result.name).toBe('file');
    expect(result.dir).toBe('/test/dir');
  });

  /**
   * Verifies the pure-JS parse fallback extracts components from a Windows path.
   * Expected: drive-letter root, dir, base, ext, and name are set correctly.
   */
  test('parses a Windows path into correct components', function() {
    var win = loadPreload({ pathThrows: true });
    var result = win.webviewBridge.path.parse('C:\\Users\\app\\gcode.js');
    expect(result.base).toBe('gcode.js');
    expect(result.ext).toBe('.js');
    expect(result.name).toBe('gcode');
    expect(result.root).toBe('C:\\');
  });

  /**
   * Verifies parse handles a bare filename with no directory component.
   * Expected: dir is empty string, base equals the filename.
   */
  test('parses a bare filename with no directory', function() {
    var win = loadPreload({ pathThrows: true });
    var result = win.webviewBridge.path.parse('gcode.js');
    expect(result.base).toBe('gcode.js');
    expect(result.dir).toBe('');
  });

  /**
   * Verifies root-level POSIX files preserve '/' as the directory.
   * Expected: '/file.js' yields dir '/'.
   */
  test('parses root-level POSIX file with root directory', function() {
    var win = loadPreload({ pathThrows: true });
    var result = win.webviewBridge.path.parse('/file.js');
    expect(result.base).toBe('file.js');
    expect(result.dir).toBe('/');
    expect(result.root).toBe('/');
  });

  /**
   * Verifies drive-root Windows files preserve 'C:\\' as the directory.
   * Expected: 'C:\\file.js' yields dir and root 'C:\\'.
   */
  test('parses drive-root Windows file with drive directory', function() {
    var win = loadPreload({ pathThrows: true });
    var result = win.webviewBridge.path.parse('C:\\file.js');
    expect(result.base).toBe('file.js');
    expect(result.dir).toBe('C:\\');
    expect(result.root).toBe('C:\\');
  });
});

describe('webview-preload — path module available (Node context)', function() {
  /**
   * Verifies the preload loads cleanly when Node path is available (normal
   * Electron preload context — i.e., not the webview sandbox).
   * Expected: module loads without throwing; webviewBridge.path.join delegates
   * to Node path.join producing the same result as calling it directly.
   */
  test('loads cleanly when path module is available', function() {
    var win;
    expect(function() { win = loadPreload({}); }).not.toThrow();
    // Use Node's path.join as the expected value to avoid platform assumptions.
    var nodePath = require('path');
    var expected = nodePath.join('/test/app', 'src', 'gcode.js');
    var result = win.webviewBridge.path.join('/test/app', 'src', 'gcode.js');
    expect(result).toBe(expected);
  });
});
