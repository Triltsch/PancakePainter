/**
 * Webview preload bridge for staged IPC hardening.
 */
/* global window */
"use strict";

var electron = require('electron');
var contextBridge = electron.contextBridge;
var ipcRenderer = electron.ipcRenderer;
var remote = require('@electron/remote');
var channels = require('../ipc-channels');

// Keep legacy renderer modules working during staged remote migration.
if (!electron.remote || electron.remote !== remote) {
  electron.remote = remote;
}

var allowedIn = channels.autotrace.IN.concat(channels.export.IN);
var allowedOut = channels.autotrace.OUT.concat(channels.export.OUT);

function assertAllowed(allowedList, channel, direction) {
  if (allowedList.indexOf(channel) === -1) {
    throw new Error('Blocked IPC ' + direction + ' channel: ' + channel);
  }
}

function getWebviewBridge() {
  var app = remote.app;

  return {
    app: {
      getPath: function(name) {
        if (name !== 'temp') {
          throw new Error('Blocked app.getPath request: ' + name);
        }
        return app.getPath(name);
      },
      constants: app.constants
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

if (contextBridge &&
    typeof contextBridge.exposeInMainWorld === 'function' &&
    typeof process !== 'undefined' &&
    process.contextIsolated === true) {
  contextBridge.exposeInMainWorld('webviewBridge', webviewBridge);
} else {
  window.webviewBridge = webviewBridge;
}
