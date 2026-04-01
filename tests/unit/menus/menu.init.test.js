/**
 * @file Unit tests for menus/menu-init.js
 *
 * Scope: validates that the main-process menu builder translates labels and
 * dispatches generic menu clicks through the injected callback.
 */
'use strict';

jest.mock('../../../menus/menu-win32', () => jest.fn(() => ([
  {
    key: 'file.title',
    submenu: [
      { key: 'file.open' }
    ]
  }
])));
jest.mock('../../../menus/menu-darwin', () => jest.fn(() => ([
  {
    key: 'file.title',
    submenu: [
      { key: 'file.open' }
    ]
  }
])));
describe('menu-init', () => {
  /**
   * Verifies labels are translated and unbound menu items dispatch through IPC.
   * Expected: the built menu is installed and generic clicks call onMenuClick.
   */
  test('translates menu labels and forwards click keys', () => {
    var menuInit;
    var originalPlatformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    const setApplicationMenu = jest.fn();
    const buildFromTemplate = jest.fn((template) => template);
    const onMenuClick = jest.fn();

    jest.resetModules();
    Object.defineProperty(process, 'platform', { value: 'win32' });

    try {
      menuInit = require('../../../menus/menu-init');

      menuInit({
        app: {
          getName: () => 'PancakePainter'
        },
        BrowserWindow: {},
        Menu: {
          buildFromTemplate: buildFromTemplate,
          setApplicationMenu: setApplicationMenu
        },
        i18n: {
          t: (key) => 'tr:' + key
        },
        onMenuClick: onMenuClick
      });

      const template = buildFromTemplate.mock.calls[0][0];

      expect(template[0].label).toBe('tr:menus:file.title');
      expect(template[0].submenu[0].label).toBe('tr:menus:file.open');

      template[0].submenu[0].click();

      expect(onMenuClick).toHaveBeenCalledWith('file.open');
      expect(setApplicationMenu).toHaveBeenCalledWith(template);
    } finally {
      if (originalPlatformDescriptor) {
        Object.defineProperty(process, 'platform', originalPlatformDescriptor);
      }
    }
  });
});
