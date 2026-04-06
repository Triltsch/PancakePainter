/**
 * Webview preload bridge for staged IPC hardening.
 */
/* global window */
"use strict";

var electron = require('electron');
var contextBridge = electron.contextBridge;
var ipcRenderer = electron.ipcRenderer;
var bootstrap = ipcRenderer.sendSync('app:get-bootstrap') || {};

var channels = {
  autotrace: {
    IN: ['loadTraceImage', 'renderTrigger', 'pickColor', 'cleanup'],
    OUT: [
      'paperReady',
      'initLoaded',
      'renderComplete',
      'clonePreview',
      'progress',
      'colorPicked'
    ]
  },
  export: {
    IN: ['loadInit', 'renderTrigger', 'cleanup'],
    OUT: ['paperReady', 'initLoaded', 'renderComplete']
  }
};
var appRoot = bootstrap.appPath || '';

function joinPath() {
  return Array.prototype.slice.call(arguments).join('\\').replace(/\\+/g, '\\');
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
      var normalizedPath = filePath || '';
      var parts = normalizedPath.split(/[\\/]/);
      var baseName = parts.pop() || '';
      var dirName = parts.join('\\');
      var extName = this.extname(baseName);
      var fileName = extName ? baseName.slice(0, -extName.length) : baseName;

      return {
        root: '',
        dir: dirName,
        base: baseName,
        ext: extName,
        name: fileName
      };
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
