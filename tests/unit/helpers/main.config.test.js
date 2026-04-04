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

  /**
   * Verifies griddleSvgNaturalSize constant is present and matches the SVG viewBox.
   * Expected: dimensions match the griddle.svg viewBox="0 0 1437.2 758.8" exactly,
   * ensuring the coordinate-space denominator is stable across Electron versions.
   *
   * Background: DOM naturalWidth for SVGs without explicit size attributes changed
   * between Chromium ≤ 66 (returned 300) and Chromium 84+ (returns viewBox width).
   * Hard-coding the viewBox value prevents a ~4.8× coordinate-space regression.
   */
  test('griddleSvgNaturalSize matches the griddle SVG viewBox dimensions', () => {
    const constants = mainConfig.getAppConstants();

    expect(constants).toHaveProperty('griddleSvgNaturalSize');
    expect(constants.griddleSvgNaturalSize.width).toBe(1437.2);
    expect(constants.griddleSvgNaturalSize.height).toBe(758.8);
  });

  /**
   * Verifies the migration factor between legacy and current coordinate spaces.
   * Expected: migrationFactor ≈ 4.79 (1437.2 / 300).
   *
   * A .pbp file saved by legacy PancakePainter (Chromium ≤ 66, naturalWidth = 300)
   * contains path coordinates in a space ~4.79× smaller than the current space.
   * loadPBP() applies this factor to restore paths to their intended positions.
   */
  test('legacy-to-current coordinate migration factor is consistent', () => {
    const constants = mainConfig.getAppConstants();
    const LEGACY_DENOMINATOR = 300;
    const currentDenominator = constants.griddleSvgNaturalSize.width;

    const migrationFactor = currentDenominator / LEGACY_DENOMINATOR;

    // Factor must be well above 1 (legacy space is much smaller than current).
    expect(migrationFactor).toBeGreaterThan(4);
    expect(migrationFactor).toBeLessThan(6);
    // Verify the exact ratio to catch any accidental constant change.
    expect(migrationFactor).toBeCloseTo(1437.2 / 300, 3);
  });

  /**
   * Verifies the printable-area coordinate width in the current coordinate space.
   * Expected: ≈ 1255 project units for the 443 mm printable area.
   *
   * This value is used as the threshold to differentiate legacy files (< 350 units)
   * from current files during heuristic-based migration in loadPBP().
   */
  test('current coordinate space gives ≈1255 project units for printable area', () => {
    const constants = mainConfig.getAppConstants();

    const projectUnitsWide =
      constants.printableArea.width *
      (constants.griddleSvgNaturalSize.width / constants.griddleSize.width);

    // Must be well above the legacy-detection threshold of 350 units.
    expect(projectUnitsWide).toBeGreaterThan(1000);
    // And within a plausible range around the expected 1255 units.
    expect(projectUnitsWide).toBeLessThan(1500);
  });
});
