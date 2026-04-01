/**
 * @file Unit tests for src/ipc-channels.js
 *
 * Scope: validates the shared IPC contract registry used by host and webview
 * scripts so channels stay centralized and migration-safe.
 */
'use strict';

const channels = require('../../src/ipc-channels');

describe('ipc channel registry', () => {
  /**
   * Verifies expected channel groups exist.
   * Expected: autotrace and export channel namespaces are defined.
   */
  test('exposes autotrace and export channel groups', () => {
    expect(channels).toHaveProperty('autotrace');
    expect(channels).toHaveProperty('export');
  });

  /**
   * Verifies each group has inbound and outbound arrays.
   * Expected: channel definitions are list-based for validation at runtime.
   */
  test('defines IN and OUT arrays for each channel group', () => {
    Object.keys(channels).forEach((groupName) => {
      expect(Array.isArray(channels[groupName].IN)).toBe(true);
      expect(Array.isArray(channels[groupName].OUT)).toBe(true);
    });
  });

  /**
   * Verifies there are no duplicate names inside each channel direction.
   * Expected: each channel is unique per namespace and direction.
   */
  test('has unique channel names per group and direction', () => {
    Object.keys(channels).forEach((groupName) => {
      ['IN', 'OUT'].forEach((direction) => {
        const list = channels[groupName][direction];
        const uniqueCount = new Set(list).size;
        expect(uniqueCount).toBe(list.length);
      });
    });
  });
});
