/**
 * @file Unit tests for autotrace image transfer behavior.
 *
 * Scope: verifies image transfer writes intermediary PNG, opens the autotrace
 * overlay, and handles conversion failures without uncaught errors.
 */
'use strict';
const createAutotraceWindow = require('../../../src/windows/window.autotrace');

function flushAsync() {
  return new Promise(function(resolve) {
    setImmediate(resolve);
  });
}

function createJQueryStub(state) {
  return function(selector) {
    if (selector === '.loader') {
      return {
        css: function() {
          return this;
        }
      };
    }

    if (selector === 'div.trace-preview img.trace') {
      return {
        remove: function() {
          return this;
        }
      };
    }

    return {
      length: 0,
      css: function() {
        return this;
      },
      remove: function() {
        return this;
      },
      click: function() {
        return this;
      },
      change: function() {
        return this;
      },
      val: function() {
        return this;
      },
      prop: function() {
        return this;
      },
      filter: function() {
        return this;
      },
      siblings: function() {
        return this;
      },
      text: function() {
        return this;
      }
    };
  };
}

describe('window.autotrace imageTransfer', function() {
  var originalGlobals;
  var rasterFactory;

  beforeEach(function() {
    originalGlobals = {
      window: global.window,
      mainWindow: global.mainWindow,
      app: global.app,
      $: global.$,
      i18n: global.i18n,
      _: global._,
      paper: global.paper,
      path: global.path,
      fs: global.fs
    };

    global.window = {
      setImageImport: jest.fn()
    };
    global.mainWindow = {
      overlay: {
        toggleWindow: jest.fn()
      },
      dialog: jest.fn().mockReturnValue(0),
      editorPaperScope: {
        view: {
          bounds: { x: 0, y: 0, width: 1, height: 1 }
        }
      }
    };
    global.app = {
      getPath: jest.fn().mockReturnValue('C:/temp')
    };
    global.$ = createJQueryStub({});
    global.i18n = {
      t: function(key) {
        return key;
      }
    };
    global._ = {
      each: function(list, iteratee) {
        Object.keys(list || {}).forEach(function(key) {
          iteratee(list[key], key);
        });
      },
      extend: function(target, source) {
        return Object.assign(target || {}, source || {});
      }
    };
    global.paper = {
      Raster: function(filePath) {
        return rasterFactory(filePath);
      },
      utils: {
        saveRasterImage: jest.fn().mockResolvedValue('C:/temp/pp_tempraster.png'),
        getDuplicationLayout: function() {
          return { positions: [], scale: 1 };
        }
      }
    };
    global.path = {
      join: function() {
        return Array.prototype.slice.call(arguments).join('/');
      },
      parse: function(filePath) {
        return {
          base: (filePath || '').split(/[\\/]/).pop()
        };
      }
    };
    global.fs = {
      writeFileSync: jest.fn()
    };

    rasterFactory = jest.fn(function() {
      var raster = {
        bounds: { width: 1024, height: 512 },
        scale: jest.fn(),
        remove: jest.fn()
      };

      setImmediate(function() {
        if (raster.onLoad) {
          raster.onLoad();
        }
      });

      return raster;
    });
  });

  afterEach(function() {
    global.window = originalGlobals.window;
    global.mainWindow = originalGlobals.mainWindow;
    global.app = originalGlobals.app;
    global.$ = originalGlobals.$;
    global.i18n = originalGlobals.i18n;
    global._ = originalGlobals._;
    global.paper = originalGlobals.paper;
    global.path = originalGlobals.path;
    global.fs = originalGlobals.fs;
    jest.clearAllMocks();
  });

  /**
   * Verifies successful conversion writes intermediary PNG and opens overlay.
   * Expected: scaled raster export occurs, webview init is requested when
   * ready, and overlay opens.
   */
  test('writes intermediary image and opens autotrace window on success', async function() {
    var autotraceWindow = createAutotraceWindow({});
    autotraceWindow.autoTraceLoaded = true;
    autotraceWindow.$webview = {
      send: {
        loadTraceImage: jest.fn()
      }
    };

    autotraceWindow.imageTransfer('C:/images/input.png', 'simple');
    await flushAsync();

    expect(rasterFactory).toHaveBeenCalledWith('C:/images/input.png');
    expect(global.paper.utils.saveRasterImage).toHaveBeenCalledTimes(1);
    expect(global.paper.utils.saveRasterImage.mock.calls[0][1]).toBe(72);
    expect(global.paper.utils.saveRasterImage.mock.calls[0][2]).toBe(
      'C:/temp/pp_tempraster.png'
    );
    expect(global.paper.utils.saveRasterImage.mock.calls[0][0].scale)
      .toHaveBeenCalledWith(0.5);
    expect(autotraceWindow.$webview.send.loadTraceImage).toHaveBeenCalledTimes(1);
    expect(global.mainWindow.overlay.toggleWindow).toHaveBeenCalledWith('autotrace', true);
    expect(autotraceWindow.preset).toBe('simple');
  });

  /**
   * Verifies raster load failure is handled through dialog flow.
   * Expected: no export/open, and error dialog shown.
   */
  test('handles raster load errors via dialog flow without opening overlay', async function() {
    rasterFactory = jest.fn(function() {
      var raster = {
        bounds: { width: 1024, height: 512 },
        scale: jest.fn(),
        remove: jest.fn()
      };

      setImmediate(function() {
        if (raster.onError) {
          raster.onError(new Error('raster load failed'));
        }
      });

      return raster;
    });

    var autotraceWindow = createAutotraceWindow({});
    autotraceWindow.autoTraceLoaded = true;
    autotraceWindow.$webview = {
      send: {
        loadTraceImage: jest.fn()
      }
    };

    autotraceWindow.imageTransfer('C:/images/input.png', 'complex');
    await flushAsync();

    expect(global.paper.utils.saveRasterImage).not.toHaveBeenCalled();
    expect(global.mainWindow.overlay.toggleWindow).not.toHaveBeenCalled();
    expect(global.mainWindow.dialog).toHaveBeenCalledTimes(1);
  });
});
