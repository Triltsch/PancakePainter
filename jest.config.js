/**
 * @file Jest configuration for PancakePainter unit tests.
 *
 * Test environment is set to 'node' because PancakePainter is an Electron
 * application. Most testable units are pure Node.js modules; any that require
 * DOM or Electron APIs are handled via manual mocks placed in tests/__mocks__/.
 *
 * Coverage is reported for source files under src/, excluding vendored
 * third-party libraries in src/libs/ that are not application code.
 */
'use strict';

module.exports = {
  /**
   * Run tests in a plain Node.js environment.
   * Electron-specific globals (remote, ipcRenderer, etc.) must be mocked
   * explicitly when required by a module under test.
   */
  testEnvironment: 'node',

  /**
   * Test root directory — all test files live under tests/.
   */
  roots: ['<rootDir>/tests'],

  /**
   * Discover only files in unit/ or integration/ subdirectories that follow
   * the *.test.js naming convention.
   */
  testMatch: [
    '**/unit/**/*.test.js',
    '**/integration/**/*.test.js',
  ],

  /**
   * Collect coverage from application source files only.
   * Exclude vendored third-party libraries in src/libs/.
   */
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/libs/**',
  ],

  /** Output coverage reports as both a plain-text summary and an lcov file. */
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
