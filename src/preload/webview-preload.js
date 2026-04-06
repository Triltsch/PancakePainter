/**
 * Webview preload bridge for staged IPC hardening.
 */
/* global window */
"use strict";

var electron = require('electron');
function isModuleResolutionError(err, moduleName) {
  var msg = err && err.message ? String(err.message) : '';
  return Boolean(
    err && (
      err.code === 'MODULE_NOT_FOUND' ||
      msg.indexOf("Cannot find module '") !== -1 ||
      msg.toLowerCase().indexOf('module not found') !== -1
    ) && (
        !moduleName ||
        msg.indexOf(moduleName) !== -1 ||
        err.code === 'MODULE_NOT_FOUND'
    )
  );
}

// `path` is a Node built-in. In the Electron webview/simulator sandbox it
// cannot be resolved; the try/catch keeps the module loading and signals
// the pure-JS joinPath/parse fallbacks to activate.
var nodePath = null;
try {
  nodePath = require('path');
} catch (e) {
  if (isModuleResolutionError(e, 'path')) {
    nodePath = null;
  } else {
    throw e;
  }
}
var contextBridge = electron.contextBridge;
var ipcRenderer = electron.ipcRenderer;
var bootstrap = ipcRenderer.sendSync('app:get-bootstrap') || {};

// Use the shared IPC channel registry. In the webview/simulator sandbox,
// relative requires fail; the try/catch activates an inline copy of the
// same definitions to avoid drift.
var channels = null;
try {
  channels = require('../ipc-channels.js');
} catch (e) {
  if (isModuleResolutionError(e, '../ipc-channels.js')) {
    channels = {
      autotrace: {
        IN: ['loadTraceImage', 'renderTrigger', 'pickColor', 'cleanup'],
        OUT: [
          'paperReady', 'initLoaded', 'renderComplete',
          'clonePreview', 'progress', 'colorPicked'
        ]
      },
      export: {
        IN: ['loadInit', 'renderTrigger', 'cleanup'],
        OUT: ['paperReady', 'initLoaded', 'renderComplete']
      }
    };
  } else {
    throw e;
  }
}
var appRoot = bootstrap.appPath || '';

/**
 * Joins path segments using the OS-native separator so the shim works
 * correctly on both Windows (back-slash) and macOS/Linux (forward-slash).
 * Falls back to a pure-JS implementation when `path` is unavailable (webview
 * sandbox / simulator context).
 */
function joinPath() {
  var args = Array.prototype.slice.call(arguments);
  if (nodePath) {
    return nodePath.join.apply(nodePath, args);
  }
  // Pure-JS fallback: ignore empty segments (except explicit roots) and
  // preserve UNC prefixes on Windows while collapsing duplicated separators.
  var normalizedArgs = args.filter(function(segment) {
    if (segment === null || typeof segment === 'undefined') {
      return false;
    }
    var value = String(segment);
    return value !== '' || /^(?:[a-zA-Z]:[\\/]|[\\/]{1,2})$/.test(value);
  }).map(function(segment) {
    return String(segment);
  });

  if (!normalizedArgs.length) {
    return '.';
  }

  var sep = (normalizedArgs[0].indexOf('\\') !== -1) ? '\\' : '/';
  var joinedPath = normalizedArgs.join(sep);

  if (sep !== '\\') {
    return joinedPath.replace(/\/+/g, sep);
  }

  var hasUncPrefix = joinedPath.indexOf('\\\\') === 0;
  var normalizedPath = (hasUncPrefix ? joinedPath.slice(2) : joinedPath)
    .replace(/[/\\]{2,}/g, sep);

  return (hasUncPrefix ? '\\\\' : '') + normalizedPath;
}

function getPathShim() {
  return {
    join: function() {
      return joinPath.apply(null, arguments);
    },
    basename: function(filePath) {
      return (filePath || '').split(/[\\/]/).pop();
    },
    extname: function(filePath) {
      var baseName = this.basename(filePath);
      var dotIndex = baseName.lastIndexOf('.');
      return dotIndex > -1 ? baseName.slice(dotIndex) : '';
    },
    parse: function(filePath) {
      // Delegate to Node's path.parse when available for correct results.
      if (nodePath) {
        return nodePath.parse(filePath || '');
      }
      // Pure-JS fallback used in the webview/simulator sandbox.
      var f = filePath || '';
      var lastSep = Math.max(f.lastIndexOf('/'), f.lastIndexOf('\\'));
      var hasDriveRoot = /^[a-zA-Z]:[\\/]/.test(f);
      var root = hasDriveRoot ? f.slice(0, 3) :
                 /^[\\/]/.test(f) ? f.slice(0, 1) : '';
      var base = lastSep > -1 ? f.slice(lastSep + 1) : f;
      var dir = '';
      if (lastSep > -1) {
        if ((lastSep === 0 && root) || (lastSep === 2 && hasDriveRoot)) {
          dir = root;
        } else {
          dir = f.slice(0, lastSep);
        }
      }
      var dotIndex = base.lastIndexOf('.');
      var ext  = dotIndex > 0 ? base.slice(dotIndex) : '';
      var name = dotIndex > 0 ? base.slice(0, dotIndex) : base;
      return { root: root, dir: dir, base: base, ext: ext, name: name };
    }
  };
}

function resolveAppModule(moduleName) {
  var moduleMap = {
    '../gcode.js': joinPath(appRoot, 'src', 'gcode.js'),
    '../helpers/helper.utils': joinPath(
      appRoot, 'src', 'helpers', 'helper.utils.js'
    ),
    '../helpers/helper.autotrace': joinPath(
      appRoot, 'src', 'helpers', 'helper.autotrace.js'
    ),
    'jimp': joinPath(appRoot, 'node_modules', 'jimp')
  };

  return moduleMap[moduleName];
}

var allowedIn = channels.autotrace.IN.concat(channels.export.IN);
var allowedOut = channels.autotrace.OUT.concat(channels.export.OUT);
var allowedRequireModules = [
  'jquery',
  'underscore',
  'jimp',
  'path',
  '../gcode.js'
];
var allowedRequirePattern = /^\.\.\/helpers\/helper\.(utils|autotrace)$/;

function createRequireShim() {
  return function(moduleName) {
    var resolvedModule;

    if (typeof moduleName !== 'string') {
      throw new Error('Blocked require of invalid module specifier');
    }

    if (moduleName === 'jquery') {
      return window.jQuery || window.$;
    }

    if (moduleName === 'underscore') {
      return window._;
    }

    if (moduleName === 'path') {
      return getPathShim();
    }

    if (
      allowedRequireModules.indexOf(moduleName) === -1 &&
      !allowedRequirePattern.test(moduleName)
    ) {
      throw new Error(
        'Blocked require of non-allowlisted module: ' + moduleName
      );
    }

    resolvedModule = resolveAppModule(moduleName);
    return require(resolvedModule || moduleName);
  };
}

function assertAllowed(allowedList, channel, direction) {
  if (allowedList.indexOf(channel) === -1) {
    throw new Error('Blocked IPC ' + direction + ' channel: ' + channel);
  }
}

function getWebviewBridge() {
  return {
    app: {
      getPath: function(name) {
        if (name !== 'temp') {
          throw new Error('Blocked app.getPath request: ' + name);
        }
        return ipcRenderer.sendSync('app:get-path', name);
      },
      getAppPath: function() {
        return bootstrap.appPath;
      },
      constants: bootstrap.constants || {}
    },
    path: {
      join: function() {
        return getPathShim().join.apply(getPathShim(), arguments);
      },
      basename: function(filePath) {
        return getPathShim().basename(filePath);
      },
      extname: function(filePath) {
        return getPathShim().extname(filePath);
      },
      parse: function(filePath) {
        return getPathShim().parse(filePath);
      }
    },
    ipc: {
      on: function(channel, handler) {
        assertAllowed(allowedIn, channel, 'inbound');
        return ipcRenderer.on(channel, handler);
      },
      sendToHost: function(channel, data) {
        assertAllowed(allowedOut, channel, 'outbound');
        return ipcRenderer.sendToHost(channel, data);
      }
    }
  };
}

var webviewBridge = getWebviewBridge();
var requireShim = createRequireShim();
var processShim = {
  platform: process.platform
};

if (contextBridge &&
    typeof contextBridge.exposeInMainWorld === 'function') {
  contextBridge.exposeInMainWorld('webviewBridge', webviewBridge);
  contextBridge.exposeInMainWorld('require', requireShim);
  contextBridge.exposeInMainWorld('process', processShim);
} else {
  window.webviewBridge = webviewBridge;
  window.require = requireShim;
  window.process = processShim;
}
