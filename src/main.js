/**
 * @file This is the central "main process" node-only window/update manager
 * script file for PacnackePainter. This is loaded first and is always running
 * as long as the application runs.
 **/
"use strict";
if (require('electron-squirrel-startup')) return;
const path = require('path');
const electron = require('electron');
const remoteMain = require('@electron/remote/main');

var app = electron.app;  // Module to control application life.
var appPath = app.getAppPath();
var fs = require('fs-plus');
var mainConfig = require('./helpers/helper.main-config');
var createSettingsStore = require('./helpers/helper.settings-store');

// Module to create native browser window.
var BrowserWindow = electron.BrowserWindow;
var dialog = electron.dialog;
var i18n = require('i18next');

remoteMain.initialize();

// Report crashes to our server.
//require('crash-reporter').start();

// Handle app startup with command line arguments from squirrel (windows).
function start() {
  // Process squirrel update/install command line.
  if (process.platform === 'win32') {
    var SquirrelUpdate = require('./squirrel-update');
    var squirrelCommand = process.argv[1];
    if (SquirrelUpdate.handleStartupEvent(app, squirrelCommand)) {
      // If we processed one, quit right after.
      return false;
    }
  }

  settingsInit();
  windowInit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

/**
 * Initialize the settings, constants & defaults
 */
function settingsInit() {
  // Global application constants (set and referenced from here only!)
  app.constants = mainConfig.getAppConstants();

  // Global user configurable settings.
  var settingsFile = path.join(appPath, 'settings.json');
  var userSettingsFile = path.join(app.getPath('userData'), 'config.json');
  app.settings = createSettingsStore({
    fs: fs,
    settingsFile: settingsFile,
    userSettingsFile: userSettingsFile,
    defaults: mainConfig.getDefaultSettings()
  });

  app.settings.load();
}


/**
 * Initialize the windows/attach menus
 */
function windowInit() {
  // Quit when all windows are closed (including OSX).
  app.on('window-all-closed', function() {
      app.quit();
  });

  // This method will be called when Electron has done all the initialization
  // and should be ready for creating menus & browser windows.
  app.on('ready', function() {
    i18n.init({
      ns: {
        namespaces: ['app', 'menus'],
        defaultNs: 'app'
      },
      // Path to find file
      resGetPath: path.join(
        appPath,
        'locales',
        '__lng__',
        '__ns__-__lng__.json'
      ),
      // Path to store file
      resSetPath: path.join(
        appPath,
        'locales',
        '__lng__',
        '__ns__-__lng__.json'
      ),
      sendMissingTo: 'fallback|current|all', // Send missing values to
      lng: 'en-US'
    }, function(){
      // Setup main window.
      var windowSettings = {
        minWidth: 680,
        minHeight: 420,
        width: app.settings.v.window.width,
        height: app.settings.v.window.height,
        resizable: true,
        icon: path.join(appPath, 'resources', 'app.png'),
        title: "PancakePainter",
        fullscreenable: false, // Workaround for fullscreen OSX bug :'(
        webPreferences: {
          // Keep legacy renderer behavior during migration while preload
          // is introduced.
          contextIsolation: false,
          nodeIntegration: true,
          preload: path.join(__dirname, 'preload', 'main-preload.js')
        }
      };

      // Centered or fixed window position?
      if (app.settings.v.window.y === 'center') {
        windowSettings.center = true;
      } else {
        windowSettings.x = app.settings.v.window.x;
        windowSettings.y = app.settings.v.window.y;
      }

      // Create the main application window.
      mainWindow = new BrowserWindow(windowSettings);
      remoteMain.enable(mainWindow.webContents);

      // Window wrapper for dialog (can't include module outside of this) :P
      mainWindow.dialog = function(options, callback) {
        return dialog['show' + options.t](mainWindow, options, callback);
      };

      // and load the index.html of the app.
      mainWindow.loadURL('file://' + __dirname + '/index.html');


      // Save Move/Resize back to file
      mainWindow.on('move', function(){
        var b = this.getBounds();
        app.settings.v.window.x = b.x;
        app.settings.v.window.y = b.y;
        app.settings.v.window.width = b.width;
        app.settings.v.window.height = b.height;
        app.settings.save();
      });

      // Emitted when the window is closed.
      mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
      });
    });
  });
}

// Actually start initializing. We do this here to ensure we can completely exit
// initialization without loading any windows during Squirrel updates.
start();
