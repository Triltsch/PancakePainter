/**
 * @file Unit tests for helper.autotrace.js
 *
 * Scope: validates that the helper uses injected app paths instead of reading
 * Electron remote state directly, and that SVG output is normalized.
 */
'use strict';

jest.mock('autotrace', () => jest.fn());
jest.mock('fs-plus', () => ({
  readFileSync: jest.fn(() => '<svg viewBox="0 0 10 10"></svg>')
}));

const path = require('path');
const fs = require('fs-plus');
const createAutotraceHelper = require('../../../src/helpers/helper.autotrace');

describe('helper.autotrace', () => {
  /**
   * Verifies injected paths are used to derive output and binary locations.
   * Expected: no Electron remote access is needed to configure the helper.
   */
  test('builds paths from injected app paths', () => {
    const helper = createAutotraceHelper({}, {
      appPath: path.join('C:', 'PancakePainter'),
      tempPath: path.join('C:', 'Temp')
    });

    expect(helper.settings.outputFile).toContain('pancakepainter_temptrace.svg');

    if (process.platform === 'win32') {
      expect(helper.settings.customBin).toContain(
        path.join('resources', 'win32', 'bin', 'autotrace', 'autotrace.exe')
      );
    }

    if (process.platform === 'darwin') {
      expect(helper.settings.customBin).toContain(
        path.join('resources', 'darwin', 'bin', 'autotrace', 'bin', 'autotrace')
      );
    }
  });

  /**
   * Verifies the traced SVG is normalized before downstream use.
   * Expected: namespace attributes are added to the output SVG root element.
   */
  test('adds SVG namespaces when reading trace data', () => {
    const helper = createAutotraceHelper({}, {
      appPath: path.join('C:', 'PancakePainter'),
      tempPath: path.join('C:', 'Temp')
    });

    const svg = helper.getTraceData();

    expect(fs.readFileSync).toHaveBeenCalledWith(helper.settings.outputFile, 'utf8');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
  });
});
