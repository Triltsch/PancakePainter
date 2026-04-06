/**
 * @file Unit tests for export window reset behavior.
 *
 * Scope: verifies that the Export for Printing reset action restores
 * persisted defaults and export-only UI defaults in the export overlay.
 */
'use strict';

const createExportWindow = require('../../../src/windows/window.export');

function createElementWrapper(element) {
  return {
    val: function(value) {
      if (typeof value === 'undefined') {
        return element.value;
      }
      element.value = value;
      return this;
    },
    prop: function(name, value) {
      if (typeof value === 'undefined') {
        return element[name];
      }
      if (typeof value === 'function') {
        element[name] = value.call(element);
      } else {
        element[name] = value;
      }
      return this;
    }
  };
}

function createCollection(elements, state) {
  return {
    each: function(handler) {
      elements.forEach(function(element) {
        handler.call(element);
      });
      return this;
    },
    trigger: function(name) {
      state.rangeTriggers.push(name);
      return this;
    },
    rangeslider: function(action, forceUpdate) {
      state.rangeUpdates.push({ action: action, forceUpdate: forceUpdate });
      return this;
    },
    click: function() {
      return this;
    },
    keydown: function() {
      return this;
    },
    change: function() {
      return this;
    },
    css: function() {
      return this;
    }
  };
}

describe('window.export reset settings', function() {
  var originalGlobals;

  beforeEach(function() {
    originalGlobals = {
      window: global.window,
      mainWindow: global.mainWindow,
      app: global.app,
      $: global.$,
      paper: global.paper,
      i18n: global.i18n,
      fs: global.fs,
      toastr: global.toastr,
      path: global.path
    };
  });

  afterEach(function() {
    global.window = originalGlobals.window;
    global.mainWindow = originalGlobals.mainWindow;
    global.app = originalGlobals.app;
    global.$ = originalGlobals.$;
    global.paper = originalGlobals.paper;
    global.i18n = originalGlobals.i18n;
    global.fs = originalGlobals.fs;
    global.toastr = originalGlobals.toastr;
    global.path = originalGlobals.path;
  });

  /**
   * Verifies confirmed reset restores persisted defaults and export-only mirror.
   * Expected: managed controls are rewritten from defaults and mirror returns to
   * its HTML defaultChecked state.
   */
  test('applies defaults in export context when reset is confirmed', function() {
    var mirror = { id: 'mirrorexport', type: 'checkbox', checked: false, defaultChecked: true };
    var state = {
      rangeTriggers: [],
      rangeUpdates: [],
      windowEvents: [],
      delegatedResetCalls: 0
    };

    global.window = {};
    global.mainWindow = {
      resetSettings: function() {
        state.delegatedResetCalls += 1;
        return true;
      }
    };
    global.app = {
      constants: {
        botSpeedMax: 100
      },
      settings: {
        v: { flatten: 2, uselinefill: false }
      }
    };
    global.paper = {
      view: {
        bounds: { x: 0, y: 0, width: 1, height: 1 }
      }
    };
    global.i18n = { t: function(key) { return key; } };
    global.fs = { writeFileSync: function() {} };
    global.toastr = { success: function() {}, error: function() {} };
    global.path = { parse: function() { return { base: 'x.gcode' }; } };

    global.$ = function(selector) {
      if (selector === global.window) {
        return {
          triggerHandler: function(name) {
            state.windowEvents.push(name);
          },
          on: function() {}
        };
      }

      if (selector === '#mirrorexport') {
        return createElementWrapper(mirror);
      }

      if (selector === '.loader') {
        return createCollection([], state);
      }

      if (typeof selector === 'object') {
        return createElementWrapper(selector);
      }

      return createCollection([], state);
    };

    var exportWindow = createExportWindow({});
    exportWindow.resetSettings();

    expect(state.delegatedResetCalls).toBe(1);
    expect(mirror.checked).toBe(true);
  });

  /**
   * Verifies cancel path does not mutate settings or controls.
   * Expected: no settings reset and no UI updates are triggered.
   */
  test('does nothing when reset confirmation is cancelled', function() {
    var mirror = { id: 'mirrorexport', type: 'checkbox', checked: false, defaultChecked: true };
    var state = {
      rangeTriggers: [],
      rangeUpdates: [],
      windowEvents: [],
      delegatedResetCalls: 0
    };

    global.window = {};
    global.mainWindow = {
      resetSettings: function() {
        state.delegatedResetCalls += 1;
        return false;
      }
    };
    global.app = {
      constants: {
        botSpeedMax: 100
      },
      settings: {
        v: { flatten: 15, uselinefill: true }
      }
    };
    global.paper = {
      view: {
        bounds: { x: 0, y: 0, width: 1, height: 1 }
      }
    };
    global.i18n = { t: function(key) { return key; } };
    global.fs = { writeFileSync: function() {} };
    global.toastr = { success: function() {}, error: function() {} };
    global.path = { parse: function() { return { base: 'x.gcode' }; } };

    global.$ = function(selector) {
      if (selector === global.window) {
        return {
          triggerHandler: function(name) {
            state.windowEvents.push(name);
          },
          on: function() {}
        };
      }

      if (selector === '#mirrorexport') {
        return createElementWrapper(mirror);
      }

      if (selector === '.loader') {
        return createCollection([], state);
      }

      if (typeof selector === 'object') {
        return createElementWrapper(selector);
      }

      return createCollection([], state);
    };

    var exportWindow = createExportWindow({});
    exportWindow.resetSettings();

    expect(state.delegatedResetCalls).toBe(1);
    expect(mirror.checked).toBe(false);
    expect(state.rangeTriggers).toEqual([]);
    expect(state.rangeUpdates).toEqual([]);
    expect(state.windowEvents).toEqual([]);
  });
});
