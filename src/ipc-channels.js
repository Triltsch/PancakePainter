/**
 * Shared IPC channel registry for autotrace and export webview contracts.
 */
"use strict";

module.exports = {
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
