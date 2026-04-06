/**
 * Main-window preload bridge for staged Electron migration.
 * This keeps a compatibility surface available while renderer migration lands.
 */
/* global window */
"use strict";

var electron = require('electron');
var contextBridge = electron.contextBridge;
var ipcRenderer = electron.ipcRenderer;
var fs = require('fs-plus');
var i18n = require('i18next');
var path = require('path');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

var bootstrap = ipcRenderer.sendSync('app:get-bootstrap') || {};

function getAppBridge() {
  return {
    app: {
      getVersion: function() {
        return bootstrap.version;
      },
      getPath: function(name) {
        return ipcRenderer.sendSync('app:get-path', name);
      },
      getAppPath: function() {
        return bootstrap.appPath;
      },
      constants: bootstrap.constants || {},
      getSettings: function() {
        return clone(bootstrap.settings || {});
      },
      saveSettings: function(settings) {
        bootstrap.settings = ipcRenderer.sendSync(
          'settings:save-sync',
          settings
        );
        return clone(bootstrap.settings || {});
      },
      resetSettings: function() {
        bootstrap.settings = ipcRenderer.sendSync('settings:reset-sync');
        return clone(bootstrap.settings || {});
      }
    },
    window: {
      focus: function() {
        return window.focus();
      },
      dialog: function(options, callback) {
        var result = ipcRenderer.sendSync('dialog:show-sync', options);

        if (callback) {
          setTimeout(function() {
            callback(result);
          }, 0);
          return undefined;
        }

        return result;
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
    path: {
      join: function() {
        return path.join.apply(path, arguments);
      },
      extname: function(filePath) {
        return path.extname(filePath);
      },
      basename: function(filePath) {
        return path.basename(filePath);
      },
      parse: function(filePath) {
        return path.parse(filePath);
      }
    },
    menu: {
      onMenuClick: function(handler) {
        return ipcRenderer.on('menu:click', function(event, key) { /* jshint ignore:line */
          handler(key);
        });
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

if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
  contextBridge.exposeInMainWorld('appBridge', appBridge);
}
