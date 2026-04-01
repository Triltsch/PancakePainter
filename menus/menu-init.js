/**
 * @file Menu "module" handler root. Figures out which menu to display for the
 * given operating system and translates keys into labels.
 **/
"use strict";
module.exports = function menuInit(dependencies) {
  var app = dependencies.app;
  var BrowserWindow = dependencies.BrowserWindow;
  var Menu = dependencies.Menu;
  var i18n = dependencies.i18n;
  var onMenuClick = dependencies.onMenuClick;
  var _ = require('underscore');

  var platform = process.platform;

  // Only 2 supported platforms at the moment
  if (platform !== 'win32' && platform !== 'darwin') {
    platform = 'win32'; // Default to windows menu
  }

  var mainMenu = require('../menus/menu-' + platform)({
    app: app,
    appName: app.getName(),
    BrowserWindow: BrowserWindow
  });

  // Pre-process then apply menu to the window
  _.each(mainMenu, function(menu){
    // Translate key to label for top level menus
    if (menu.key) menu.label = i18n.t('menus:' + menu.key, menu.var);

    _.each(menu.submenu, function(sub){
      if (sub.key) {
        // Translate key to label for submenus
        sub.label = i18n.t('menus:' + sub.key, sub.var);
        if (!sub.click) {
          // Add generic click event only if not already bound
          sub.click = function() {
            onMenuClick(sub.key);
          };
        }
      }
    });
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(mainMenu));
};
