/**
 * @file Unit tests for helper.utils.js
 *
 * Scope: verifies representative high-reuse utility functions with boundary
 * inputs and deterministic input/output assertions.
 */
'use strict';

jest.mock('electron-canvas-to-buffer', () => jest.fn());
jest.mock('fs-plus', () => ({ writeFile: jest.fn() }));
jest.mock('progress-promise', () => function ProgressPromise(executor) {
  return new Promise((resolve, reject) => executor(resolve, reject, () => {}));
});

const createUtils = require('../../../src/helpers/helper.utils');

describe('helper.utils', () => {
  let paper;
  let utils;

  beforeEach(() => {
    paper = {
      Group: function MockGroup() {},
      utils: {}
    };
    utils = createUtils(paper);
    paper.utils = utils;
  });

  /**
   * Verifies rgbToHex conversion and passthrough boundaries.
   * Expected: RGB string converts to HEX, non-RGB input returns unchanged.
   */
  test('rgbToHex converts rgb values and passes through non-rgb strings', () => {
    expect(utils.rgbToHex('rgb(255, 0, 16)')).toBe('#ff0010');
    expect(utils.rgbToHex('')).toBe('');
    expect(utils.rgbToHex('#00ff00')).toBe('#00ff00');
  });

  /**
   * Verifies colorStringToArray boundary parsing.
   * Expected: supports rgb/hex input and returns null for invalid values.
   */
  test('colorStringToArray handles rgb, hex, and invalid inputs', () => {
    expect(utils.colorStringToArray('rgb(1, 2, 3)')).toEqual([1, 2, 3]);
    expect(utils.colorStringToArray('#03F')).toEqual([0, 51, 255]);
    expect(utils.colorStringToArray(undefined)).toBeNull();
    expect(utils.colorStringToArray('not-a-color')).toBeNull();
  });

  /**
   * Verifies color model conversion boundaries.
   * Expected: null inputs return false and normal inputs map deterministically.
   */
  test('rgbToHSL and rgbToYUV handle null and valid values', () => {
    expect(utils.rgbToHSL(null)).toBe(false);
    expect(utils.rgbToYUV(null)).toBe(false);

    const hslRed = utils.rgbToHSL([255, 0, 0]);
    expect(hslRed[0]).toBeCloseTo(0);
    expect(hslRed[1]).toBeCloseTo(1);

    expect(utils.rgbToYUV([0, 0, 0])).toEqual([0, 128, 128]);
  });

  /**
   * Verifies duplication layout behavior for expected counts and boundaries.
   * Expected: empty trace bounds return defaults, count variants return positions.
   */
  test('getDuplicationLayout returns safe defaults and valid layouts', () => {
    const griddle = { width: 400, height: 200 };

    expect(utils.getDuplicationLayout(4, { width: 0, height: 10 }, griddle)).toEqual({
      scale: 1,
      positions: []
    });

    const layout2 = utils.getDuplicationLayout(2, { width: 100, height: 80 }, griddle);
    expect(layout2.positions.length).toBe(2);
    expect(layout2.scale).toBeGreaterThan(0);

    const layout8 = utils.getDuplicationLayout(8, { width: 100, height: 300 }, griddle);
    expect(layout8.positions.length).toBe(8);
    expect(layout8.scale).toBeGreaterThan(0);
  });

  /**
   * Verifies fitScale behavior with explicit fill factors.
   * Expected: uses smaller axis scale and calls object.scale once.
   */
  test('fitScale computes minimum axis scale and applies it', () => {
    const target = {
      bounds: { width: 100, height: 50 },
      scale: jest.fn()
    };
    const view = {
      bounds: { width: 200, height: 80 }
    };

    const applied = utils.fitScale(target, view, 1, 1);

    expect(applied).toBeCloseTo(1.6);
    expect(target.scale).toHaveBeenCalledWith(applied);
  });
});
