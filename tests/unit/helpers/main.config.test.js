/**
 * @file Unit tests for helper.main-config.js
 *
 * Scope: validates constants and settings defaults used by main process startup,
 * including boundary expectations for PancakeBot dimensions and speed limits.
 */
'use strict';

const mainConfig = require('../../../src/helpers/helper.main-config');

describe('helper.main-config', () => {
  /**
   * Verifies constants object shape.
   * Expected: required top-level constants are present.
   */
  test('returns required app constants', () => {
    const constants = mainConfig.getAppConstants();

    expect(constants).toHaveProperty('pancakeShades');
    expect(constants).toHaveProperty('botSpeedMax');
    expect(constants).toHaveProperty('griddleSize');
    expect(constants).toHaveProperty('printableArea');
  });

  /**
   * Verifies boundary constraints for known dimensions.
   * Expected: printable area dimensions are positive and fit inside griddle bounds.
   */
  test('uses valid boundary dimensions for griddle and printable area', () => {
    const constants = mainConfig.getAppConstants();

    expect(constants.griddleSize.width).toBeGreaterThan(0);
    expect(constants.griddleSize.height).toBeGreaterThan(0);
    expect(constants.printableArea.width).toBeGreaterThan(0);
    expect(constants.printableArea.height).toBeGreaterThan(0);
    expect(constants.printableArea.width).toBeLessThan(constants.griddleSize.width);
    expect(constants.printableArea.height).toBeLessThan(constants.griddleSize.height);
  });

  /**
   * Verifies speed-related defaults against known limit.
   * Expected: default speed percentages stay in normal UI range.
   */
  test('returns default settings with valid speed boundaries', () => {
    const constants = mainConfig.getAppConstants();
    const defaults = mainConfig.getDefaultSettings();

    expect(defaults.botspeed).toBeGreaterThan(0);
    expect(defaults.botspeed).toBeLessThanOrEqual(100);
    expect(defaults.botspeedcolor1).toBeLessThanOrEqual(100);
    expect(defaults.botspeedcolor2).toBeLessThanOrEqual(100);
    expect(defaults.botspeedcolor3).toBeLessThanOrEqual(100);
    expect(defaults.botspeedcolor4).toBeLessThanOrEqual(100);
    expect(constants.botSpeedMax).toBeGreaterThan(100);
  });

  /**
   * Verifies startup defaults contain persistence-critical keys.
   * Expected: defaults include window and core file/settings flags.
   */
  test('returns defaults for window and persistence settings', () => {
    const defaults = mainConfig.getDefaultSettings();

    expect(defaults.window.width).toBe(980);
    expect(defaults.window.height).toBe(600);
    expect(defaults).toHaveProperty('lastFile');
    expect(defaults).toHaveProperty('useshortest');
    expect(defaults).toHaveProperty('uselinefill');
  });
});
