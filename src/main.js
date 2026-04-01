/**
 * @file This is the central "main process" node-only window/update manager
 * script file for PacnackePainter. This is loaded first and is always running
 * as long as the application runs.
 **/
"use strict";
if (require('electron-squirrel-startup')) return;
const path = require('path');
const electron = require('electron');

var app = electron.app;  // Module to control application life.
var appPath = app.getAppPath();
var fs = require('fs-plus');
var mainConfig = require('./helpers/helper.main-config');
var createSettingsStore = require('./helpers/helper.settings-store');

// Module to create native browser window.
var BrowserWindow = electron.BrowserWindow;
var dialog = electron.dialog;
var ipcMain = electron.ipcMain;
var i18n = require('i18next');

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
  registerIpcHandlers();
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

function registerIpcHandlers() {
  ipcMain.on('app:get-bootstrap', function(event) {
    event.returnValue = {
      appPath: app.getAppPath(),
      constants: app.constants,
      settings: app.settings.v,
      version: app.getVersion()
    };
  });

  ipcMain.on('app:get-path', function(event, name) {
    event.returnValue = app.getPath(name);
  });

  ipcMain.on('settings:save-sync', function(event, settings) {
    app.settings.v = settings;
    app.settings.save();
    event.returnValue = app.settings.v;
  });

  ipcMain.on('settings:reset-sync', function(event) {
    app.settings.reset();
    event.returnValue = app.settings.v;
  });

  ipcMain.on('dialog:show-sync', function(event, options) {
    var targetWindow = BrowserWindow.fromWebContents(event.sender) ||
      mainWindow;

    switch (options.t) {
      case 'OpenDialog':
        event.returnValue = dialog.showOpenDialogSync(targetWindow, options);
        break;
      case 'SaveDialog':
        event.returnValue = dialog.showSaveDialogSync(targetWindow, options);
        break;
      case 'MessageBox':
        event.returnValue = dialog.showMessageBoxSync(targetWindow, options);
        break;
      default:
        event.returnValue = null;
    }
  });
}

function initializeApplicationMenu() {
  require('../menus/menu-init')({
    app: app,
    BrowserWindow: BrowserWindow,
    Menu: electron.Menu,
    i18n: i18n,
    onMenuClick: function(key) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('menu:click', key);
      }
    }
  });
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
          contextIsolation: true,
          nodeIntegration: true,
          nodeIntegrationInSubFrames: false,
          sandbox: false,
          // Required in Electron 28+ for embedded webview windows.
          webviewTag: true,
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
      initializeApplicationMenu();

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
