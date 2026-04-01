/**
 * Main-window preload bridge for staged Electron migration.
 * This keeps a compatibility surface available while renderer migration lands.
 */
/* global window */
"use strict";

var electron = require('electron');
var contextBridge = electron.contextBridge;
var ipcRenderer = electron.ipcRenderer;
var remote = require('@electron/remote');

// Keep legacy renderer modules working during staged remote migration.
if (!electron.remote || electron.remote !== remote) {
  electron.remote = remote;
}

function getAppBridge() {
  var app = remote.app;
  var currentWindow = remote.getCurrentWindow();
  var i18n = remote.require('i18next');
  var fs = remote.require('fs-plus');

  return {
    app: {
      getVersion: function() {
        return app.getVersion();
      },
      getPath: function(name) {
        return app.getPath(name);
      },
      constants: app.constants,
      settings: app.settings
    },
    window: {
      focus: function() {
        return currentWindow.focus();
      },
      dialog: function(options, callback) {
        return currentWindow.dialog(options, callback);
      }
    },
    i18n: {
      t: function(key, vars) {
        return i18n.t(key, vars);
      }
    },
    fs: {
      readFileSync: function(filePath, encoding) {
        return fs.readFileSync(filePath, encoding);
      },
      writeFileSync: function(filePath, data, encoding) {
        return fs.writeFileSync(filePath, data, encoding);
      },
      existsSync: function(filePath) {
        return fs.existsSync(filePath);
      }
    },
    ipc: {
      on: function(channel, handler) {
        return ipcRenderer.on(channel, handler);
      },
      send: function(channel, data) {
        return ipcRenderer.send(channel, data);
      }
    }
  };
}

var appBridge = getAppBridge();

if (contextBridge &&
    typeof contextBridge.exposeInMainWorld === 'function' &&
    typeof process !== 'undefined' &&
    process.contextIsolated === true) {
  contextBridge.exposeInMainWorld('appBridge', appBridge);
} else {
  window.appBridge = appBridge;
}
