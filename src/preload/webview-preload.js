/**
 * Webview preload bridge for staged IPC hardening.
 */
/* global window */
"use strict";

var electron = require('electron');
var contextBridge = electron.contextBridge;
var ipcRenderer = electron.ipcRenderer;
var channels = require('../ipc-channels');
var bootstrap = ipcRenderer.sendSync('app:get-bootstrap') || {};

var allowedIn = channels.autotrace.IN.concat(channels.export.IN);
var allowedOut = channels.autotrace.OUT.concat(channels.export.OUT);

function createRequireShim() {
  return function(moduleName) {
    return require(moduleName);
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
    typeof contextBridge.exposeInMainWorld === 'function' &&
    typeof process !== 'undefined' &&
    process.contextIsolated === true) {
  contextBridge.exposeInMainWorld('webviewBridge', webviewBridge);
  contextBridge.exposeInMainWorld('require', requireShim);
  contextBridge.exposeInMainWorld('process', processShim);
} else {
  window.webviewBridge = webviewBridge;
  window.require = requireShim;
  window.process = processShim;
}
