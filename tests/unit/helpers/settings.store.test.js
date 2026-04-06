/**
 * @file Unit tests for helper.settings-store.js
 *
 * Scope: validates settings loading, default fallback behavior, persistence,
 * and malformed input handling without requiring Electron runtime.
 */
'use strict';

const createSettingsStore = require('../../../src/helpers/helper.settings-store');

describe('helper.settings-store', () => {
  let fsMock;
  let store;
  let fileMap;

  beforeEach(() => {
    fileMap = {};

    fsMock = {
      existsSync: jest.fn((target) => Object.prototype.hasOwnProperty.call(fileMap, target)),
      readFileSync: jest.fn((target) => fileMap[target]),
      writeFileSync: jest.fn((target, content) => {
        fileMap[target] = content;
      }),
      removeSync: jest.fn((target) => {
        delete fileMap[target];
      })
    };

    store = createSettingsStore({
      fs: fsMock,
      settingsFile: '/app/settings.json',
      userSettingsFile: '/user/config.json',
      defaults: {
        flatten: 2,
        botspeed: 70,
        useshortest: true,
        window: { width: 980, height: 600 }
      }
    });
  });

  /**
   * Verifies startup behavior when no persisted files exist.
   * Expected: defaults are applied and persisted.
   */
  test('loads defaults when no settings files are present', () => {
    store.load();

    expect(store.v.flatten).toBe(2);
    expect(store.v.botspeed).toBe(70);
    expect(store.v.useshortest).toBe(true);
    expect(fsMock.writeFileSync).toHaveBeenCalled();
  });

  /**
   * Verifies partial persisted state handling.
   * Expected: persisted values win for present keys and defaults fill missing keys.
   */
  test('merges partial persisted settings with defaults', () => {
    fileMap['/app/settings.json'] = JSON.stringify({ botspeed: 55 });

    store.load();

    expect(store.v.botspeed).toBe(55);
    expect(store.v.flatten).toBe(2);
    expect(store.v.useshortest).toBe(true);
  });

  /**
   * Verifies user config overrides app settings values.
   * Expected: user config keys overwrite loaded/default values.
   */
  test('applies user config overrides on load', () => {
    fileMap['/app/settings.json'] = JSON.stringify({ botspeed: 55, flatten: 1 });
    fileMap['/user/config.json'] = JSON.stringify({ botspeed: 80 });

    store.load();

    expect(store.v.flatten).toBe(1);
    expect(store.v.botspeed).toBe(80);
  });

  /**
   * Verifies malformed app settings resilience.
   * Expected: invalid JSON does not crash and defaults still load.
   */
  test('falls back to defaults when app settings JSON is malformed', () => {
    fileMap['/app/settings.json'] = '{not valid json';

    expect(() => store.load()).not.toThrow();
    expect(store.v.flatten).toBe(2);
    expect(store.v.window.width).toBe(980);
  });

  /**
   * Verifies save fallback path.
   * Expected: when app settings write fails, user config path is written.
   */
  test('save falls back to user settings file when app settings write fails', () => {
    fsMock.writeFileSync
      .mockImplementationOnce(() => {
        throw new Error('permission denied');
      })
      .mockImplementation((target, content) => {
        fileMap[target] = content;
      });

    store.v = { botspeed: 65 };
    store.save();

    expect(fileMap['/user/config.json']).toBe(JSON.stringify({ botspeed: 65 }));
  });

  /**
   * Verifies reset flow semantics.
   * Expected: clear is called and settings are reloaded to defaults.
   */
  test('reset clears persisted settings then reloads defaults', () => {
    fileMap['/app/settings.json'] = JSON.stringify({ botspeed: 10 });

    store.reset();

    expect(fsMock.removeSync).toHaveBeenCalledWith('/app/settings.json');
    expect(fsMock.removeSync).toHaveBeenCalledWith('/user/config.json');
    expect(store.v.botspeed).toBe(70);
  });

  /**
   * Verifies reset clears user override file as well.
   * Expected: user config values do not survive reset and defaults are restored.
   */
  test('reset removes user overrides before reloading defaults', () => {
    fileMap['/app/settings.json'] = JSON.stringify({ botspeed: 10 });
    fileMap['/user/config.json'] = JSON.stringify({ botspeed: 95 });

    store.reset();

    expect(fsMock.removeSync).toHaveBeenCalledWith('/app/settings.json');
    expect(fsMock.removeSync).toHaveBeenCalledWith('/user/config.json');
    expect(store.v.botspeed).toBe(70);
  });
});
