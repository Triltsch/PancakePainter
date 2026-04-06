/**
 * @file This is the central application logic and window management src file.
 * This is the central render process main window JS, and has access to
 * the DOM and all node abilities.
 **/
/*globals
  document, window, $, _, toastr, paper, Promise
*/
"use strict";

// Add Promise done polyfill.
"function"!=typeof Promise.prototype.done&&(Promise.prototype.done=function(t,n){var o=arguments.length?this.then.apply(this,arguments):this;o.then(null,function(t){setTimeout(function(){throw t},0)})}); /* jshint ignore: line */

// Libraries ==============================================---------------------
// Libraries are loaded via script tags in index.html before this file.
// Globals are now available: $, jQuery, toastr, _
var bridge = window.appBridge;
var path = bridge.path;

// Main Process ===========================================---------------------
// Include global main process connector objects for the renderer (this window).
var mainWindow = {
  dialog: bridge.window.dialog,
  focus: bridge.window.focus
};
var i18n = {
  t: bridge.i18n.t
};
var app = {
  constants: bridge.app.constants,
  currentFile: {},
  settings: {
    v: bridge.app.getSettings(),
    save: function() {
      this.v = bridge.app.saveSettings(this.v);
      return this.v;
    },
    reset: function() {
      this.v = bridge.app.resetSettings();
      return this.v;
    }
  },
  getPath: function(name) {
    return bridge.app.getPath(name);
  },
  getAppPath: function() {
    return bridge.app.getAppPath();
  },
  getVersion: function() {
    return bridge.app.getVersion();
  }
};
var fs = bridge.fs;
var rendererModuleCache = {};
var unsavedChanges = loadRendererModule('./helpers/helper.unsaved-changes.js');

function getRendererFs() {
  return {
    readFileSync: function(filePath, encoding) {
      return fs.readFileSync(filePath, encoding);
    },
    readFile: function(filePath, callback) {
      try {
        callback(null, fs.readFileSync(filePath));
      } catch (error) {
        callback(error);
      }
    },
    writeFileSync: function(filePath, data, encoding) {
      return fs.writeFileSync(filePath, data, encoding);
    },
    existsSync: function(filePath) {
      return fs.existsSync(filePath);
    },
    writeFile: function(filePath, data, callback) {
      try {
        fs.writeFileSync(filePath, data);
        if (callback) {
          callback(null);
        }
      } catch (error) {
        if (callback) {
          callback(error);
        }
      }
    }
  };
}

function getRendererProcess() {
  return {
    cwd: function() {
      return app.getAppPath();
    },
    platform: /^[A-Za-z]:\\/.test(app.getAppPath()) ? 'win32' : 'darwin',
    env: {
      ENVIRONMENT: 'NODE'
    },
    versions: {
      electron: app.getVersion()
    },
    type: 'renderer',
    stdout: {
      write: function() {}
    },
    on: function() {}
  };
}

function resolvePackageEntry(packageRoot, entryPoint) {
  var candidate = path.join(packageRoot, entryPoint || 'index.js');

  if (fs.existsSync(candidate)) {
    return candidate;
  }

  if (!path.extname(candidate) && fs.existsSync(candidate + '.js')) {
    return candidate + '.js';
  }

  return path.join(candidate, 'index.js');
}

function resolveFileCandidate(filePath) {
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  if (fs.existsSync(filePath + '.js')) {
    return filePath + '.js';
  }

  if (fs.existsSync(filePath + '.json')) {
    return filePath + '.json';
  }

  return filePath;
}

function resolveRendererModulePath(request, parentFilePath) {
  var searchPath;
  var packageRoot;
  var packageFile;
  var packageData;

  if (request === 'underscore' || request === 'fs' ||
      request === 'fs-plus' || request === 'path') {
    return request;
  }

  if (/^[A-Za-z]:\\/.test(request)) {
    return resolveFileCandidate(request);
  }

  if (request.charAt(0) === '.') {
    var basePath = parentFilePath ? path.parse(parentFilePath).dir :
      path.join(app.getAppPath(), 'src');
    var localPath = path.join(basePath, request);
    return resolveFileCandidate(localPath);
  }

  searchPath = parentFilePath ? path.parse(parentFilePath).dir :
    path.join(app.getAppPath(), 'src');

  while (searchPath && path.parse(searchPath).dir !== searchPath) {
    packageRoot = path.join(searchPath, 'node_modules', request);
    packageFile = path.join(packageRoot, 'package.json');

    if (fs.existsSync(packageFile)) {
      packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
      return resolvePackageEntry(packageRoot, packageData.main);
    }

    if (fs.existsSync(packageRoot)) {
      return resolvePackageEntry(packageRoot);
    }

    searchPath = path.parse(searchPath).dir;
  }

  packageRoot = path.join(app.getAppPath(), 'node_modules', request);
  packageFile = path.join(packageRoot, 'package.json');

  if (fs.existsSync(packageFile)) {
    packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    return resolvePackageEntry(packageRoot, packageData.main);
  }

  var nodeModulesRoot = path.join(app.getAppPath(), 'node_modules');
  return resolvePackageEntry(nodeModulesRoot, request);
}

function loadRendererModule(request, parentFilePath) {
  var resolvedPath = resolveRendererModulePath(request, parentFilePath);
  var module = { exports: {} };
  var moduleSource;
  var moduleWrapper;

  if (resolvedPath === 'underscore') {
    return _;
  }

  if (request === 'iota-array') {
    return function(count) {
      var values = [];
      var index;
      for (index = 0; index < count; index++) {
        values.push(index);
      }
      return values;
    };
  }

  if (request === 'is-buffer') {
    return function(value) {
      return value && typeof value === 'object' &&
        typeof value.copy === 'function' &&
        typeof value.slice === 'function' &&
        typeof value.length === 'number';
    };
  }

  if (resolvedPath === 'fs' || resolvedPath === 'fs-plus') {
    return getRendererFs();
  }

  if (resolvedPath === 'path') {
    return path;
  }

  if (rendererModuleCache[resolvedPath]) {
    return rendererModuleCache[resolvedPath].exports;
  }

  rendererModuleCache[resolvedPath] = module;
  moduleSource = fs.readFileSync(resolvedPath, 'utf8');
  /* jshint ignore:start */
  moduleWrapper = new Function(
    'module',
    'exports',
    'require',
    '__filename',
    '__dirname',
    'process',
    moduleSource
  );
  /* jshint ignore:end */

  moduleWrapper(
    module,
    module.exports,
    function(dependency) {
      return loadRendererModule(dependency, resolvedPath);
    },
    resolvedPath,
    path.parse(resolvedPath).dir,
    getRendererProcess()
  );

  return module.exports;
}

// Helper for file I/O operations (inline since renderer cannot use require)
var fileIO = (function() {
  function renderToastMessage(i18n, key, fileName, fallbackTemplate) {
    var vars = { file: fileName };
    var translated = i18n.t(key, vars);

    if (translated && translated !== key) {
      return translated;
    }

    var fallback = fallbackTemplate.replace('{{file}}', fileName || '');
    translated = i18n.t(key, {
      file: fileName,
      defaultValue: fallback
    });

    if (translated && translated !== key) {
      return translated;
    }

    return fallback;
  }

  function normalizeProjectPath(filePath) {
    if (!filePath) return '';
    if (bridge.path.extname(filePath).toLowerCase() !== '.pbp') {
      return filePath + '.pbp';
    }
    return filePath;
  }

  function saveProjectFile(options) {
    var fs = options.fs;
    var paper = options.paper;
    var toastr = options.toastr;
    var i18n = options.i18n;
    var currentFile = options.currentFile;
    var targetPath = normalizeProjectPath(options.filePath || currentFile.path);

    if (!targetPath) return false;

    currentFile.path = targetPath;
    currentFile.name = bridge.path.basename(targetPath);

    try {
      fs.writeFileSync(currentFile.path, paper.getPBP());
      toastr.success(renderToastMessage(
        i18n,
        'file.note',
        currentFile.name,
        'Saved {{file}}.'
      ));
      currentFile.changed = false;
      return true;
    } catch (e) {
      toastr.error(renderToastMessage(
        i18n,
        'file.error',
        currentFile.name,
        'Could not save {{file}}.'
      ));
      return false;
    }
  }

  function openProjectFile(options) {
    var fs = options.fs;
    var paper = options.paper;
    var toastr = options.toastr;
    var i18n = options.i18n;
    var currentFile = options.currentFile;
    var filePath = options.filePath;
    var parsedName = bridge.path.basename(filePath || '');

    if (!filePath || !fs.existsSync(filePath)) {
      toastr.error(renderToastMessage(
        i18n,
        'file.error',
        parsedName,
        'Could not open {{file}}.'
      ));
      return false;
    }

    try {
      paper.loadPBP(filePath);
      currentFile.path = filePath;
      currentFile.name = bridge.path.basename(filePath);
      currentFile.changed = false;
      return true;
    } catch (e) {
      var fileName = bridge.path.basename(filePath);
      toastr.error(renderToastMessage(
        i18n,
        'file.error',
        fileName,
        'Could not open {{file}}.'
      ));
      return false;
    }
  }

  return {
    normalizeProjectPath: normalizeProjectPath,
    saveProjectFile: saveProjectFile,
    openProjectFile: openProjectFile
  };
})();

window.mainWindow = mainWindow;
window.i18n = i18n;
window.app = app;
window.fs = fs;
window.path = path;

var rendererLocaleCache = null;

function getLocaleValueByKey(source, keyPath) {
  var keys = keyPath.split('.');
  var value = source;

  for (var i = 0; i < keys.length; i++) {
    if (!value || typeof value !== 'object') {
      return null;
    }
    value = value[keys[i]];
  }

  return typeof value === 'string' ? value : null;
}

function getRendererLocaleCache() {
  if (rendererLocaleCache) {
    return rendererLocaleCache;
  }

  try {
    var localePath = path.join(
      app.getAppPath(),
      'locales',
      'en-US',
      'app-en-US.json'
    );
    rendererLocaleCache = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  } catch (e) {
    rendererLocaleCache = {};
  }

  return rendererLocaleCache;
}

// Bot specific configuration & state =====================---------------------
var scale = {};

// File management  =======================================---------------------
app.currentFile = {
  name: "", // Name for the file (no path)
  path: path.join(app.getPath('userDesktop'), i18n.t('file.default')),
  changed: false // Can close app without making any changes
};

// Toastr notifications
toastr.options.positionClass = "toast-bottom-right";
toastr.options.preventDuplicates = true;
toastr.options.newestOnTop = true;

// Page loaded
$(function(){
  var griddleImage = $('#griddle')[0];

  // Set app version text
  $('#toolback .ver').text('v' + app.getVersion());

  // Wait for the griddle image dimensions, but handle the cached-image case.
  if (griddleImage && griddleImage.complete && griddleImage.naturalWidth) {
    initEditor();
  } else {
    $('#griddle').one('load', initEditor);
  }

  // Apply element translation
  i18n.translateElementsIn('body');

  // Drawnote fallback: ensure translated text is visible even if data-i18n
  // processing order changes.
  var drawnoteKey = 'common.drawnote';
  var drawnoteText = i18n.t(drawnoteKey);
  if (drawnoteText && drawnoteText !== drawnoteKey) {
    $('#drawnote').text(drawnoteText);
  }
});

// Add translation element helper.
i18n.translateElementsIn = function(context) {
  function safeTranslate(key, fallback) {
    var translated = i18n.t(key);
    if (!translated || translated === key) {
      var localeFallback = getLocaleValueByKey(getRendererLocaleCache(), key);
      if (localeFallback) {
        return localeFallback;
      }

      return fallback || key;
    }
    return translated;
  }

  // For data-i18n tagged elements with value set
  $('[data-i18n][data-i18n!=""]', context).each(function() {
    var $node = $(this);
    var raw = $node.attr('data-i18n');
    var data = raw.replace('[title]', '');

    // TODO: This is a hack and should use native i18n translation utils :/
    if (raw.indexOf('[title]') === 0) {
      $node.attr('title', safeTranslate(data, $node.attr('title')));
    } else {
      $node.text(safeTranslate(data, $node.text()));
    }
  });

  // For data-i18n tagged items without value set...
  $('[data-i18n=""]', context).each(function() {
    var $node = $(this);

    if ($node.text().indexOf('.') > -1 && $node.attr('data-i18n') === '') {
      var key = $node.text().trim();
      $node.attr('data-i18n', key);
      $node.text(safeTranslate(key, key));
    }
  });
};

// Load the actual editor PaperScript only when the canvas is ready.
var editorLoaded = false;

function initEditor() {
  var $griddle = $('#editor-wrapper img');
  var $editor = $('#editor');
  var ac = app.constants;

  $griddle.aspect = ac.griddleSize.height / ac.griddleSize.width;
  $editor.aspect = ac.printableArea.height / ac.printableArea.width;

  var margin = { // Margin around griddle in absolute pixels to restrict sizing
    l: 10,  // Buffer
    r: 10,  // Buffer
    t: 110, // Toolbar
    b: 40   // Buffer & Text
  };

  // Set maximum work area render size & manage dynamic sizing of elements not
  // handled via CSS only.
  $(window).on('resize', function() {
    // Window Size (less the appropriate margins)
    var win = {
      w: $(window).width() - (margin.l + margin.r),
      h: $(window).height() - (margin.t + margin.b)
    };

    // Assume size to width
    $griddle.width(win.w);
    $griddle.height(win.w * $griddle.aspect);


    // If too large, size to height
    if ($griddle.height() > win.h) {
      $griddle.width(win.h / $griddle.aspect);
      $griddle.height(win.h);
    }

    scale = {};
    // Use fixed SVG viewBox dimensions instead of DOM naturalWidth, which
    // is unstable across Chromium versions (300 in Chrome ≤ 66, viewBox
    // value in Chrome 84+), causing a ~4.8× coordinate-space mismatch.
    scale.x = ($griddle.width()) /
      ac.griddleSvgNaturalSize.width;
    scale.y = ($griddle.height()) /
      ac.griddleSvgNaturalSize.height;

    scale = (scale.x < scale.y ? scale.x : scale.y);

    var mmPerPX = $griddle.width() / ac.griddleSize.width;

    var off = $griddle.offset();
    $editor.css({
      top: off.top + (mmPerPX * ac.printableArea.offset.top),
      left: off.left + (mmPerPX * ac.printableArea.offset.left),
      width: ac.printableArea.width * mmPerPX,
      height: ac.printableArea.height * mmPerPX
    });

    // Resize functionality for the autotrace window.
    if (mainWindow.overlay.currentWindow.resize) {
      mainWindow.overlay.currentWindow.resize();
    }

    editorLoad(); // Load the editor (if it hasn't already been loaded)

    if (editorLoaded && mainWindow.editorPaperScope.syncViewToScale) {
      mainWindow.editorPaperScope.syncViewToScale(scale);
    }

    // This must happen after the very first resize, otherwise the canvas
    // doesn't have the correct dimensions for Paper to size to.
    $(mainWindow).trigger('move');
  }).resize();
}

function editorLoad() {
  if (!editorLoaded) {
    var nativeWindowEvent = window.Event;
    editorLoaded = true;
    paper.install(window);
    window.Event = nativeWindowEvent;
    paper.setup(document.getElementById('editor'));
    mainWindow.editorPaperScope = paper;
    loadRendererModule('./editor.ps.js');
  }
}

// Trigger load init resize only after editor has called this function.
function editorLoadedInit() { /* jshint ignore:line */
  console.log('[Editor] editorLoadedInit fired');
  $(window).resize();
  buildToolbar();
  buildImageImporter();
  buildColorPicker();

  // Initialize overlay modal windows.
  mainWindow.overlay.initWindows();

  // Bind remaining controls.
  bindControls();
}

// Build the toolbar DOM dynamically.
function buildToolbar() {
  var $t = $('<ul>').appendTo('#tools');
  console.log(
    '[Toolbar] build start toolCount=' +
    (paper.tools ? paper.tools.length : 0) +
    ' hasActiveTool=' + (!!paper.tool)
  );

  _.each(paper.tools, function(tool){
    var colorID = '';
    if (tool.cursorColors === true) {
      colorID = "-" + paper.pancakeCurrentShade;
    }

    if (tool.key) {
      $t.append($('<li>')
        .addClass('tool' +  (tool.cursorColors === true ? ' color-change' : ''))
        .attr('id', 'tool-' + tool.key)
        .data('cursor-key', tool.key)
        .data('cursor-offset', tool.cursorOffset)
        .data('cursor-colors', tool.cursorColors)
        .append(
        $('<div>').attr({
          title: i18n.t(tool.name),
          draggable: 'false'
        }).css('background-image', 'url(images/icon-' + tool.key + '.png)')
      ).click(function(){
        // Complete polygon draw no matter what.
        // TODO: Make all tools expose a "clear all" reset for other tools.
        if (paper.tool.polygonDrawComplete) {
          paper.tool.polygonDrawComplete();
        }

        tool.activate();
        activateToolItem(this);
      }));
    }
  });

  console.log(
    '[Toolbar] build complete domItems=' + $t.find('li').length +
    ' toolKeys=' + _.map(paper.tools, function(tool) {
      return tool.key;
    }).join(',')
  );
  console.log('[Toolbar] html=' + $('#tools').html());
  console.log(
    '[Toolbar] rect=' + JSON.stringify(
      document.getElementById('tools').getBoundingClientRect()
    )
  );

  // Set initial color class on tools container
  $('#tools').attr('class', 'color-' + paper.pancakeCurrentShade);

  // Activate the first (default) tool.
  $t.find('li:first').click();
}

// Assigns the "active" class to tool items and sets editor cursor, nothing more
function activateToolItem(item) {
  $('#tools .tool.active').removeClass('active');
  $(item).addClass('active');

  var cursor = '';
  if ($(item).data('cursor-colors')) {
    cursor = 'url("images/cursor-' +
      $(item).data('cursor-key') + '-' + paper.pancakeCurrentShade + '.png")';
  } else {
    cursor = 'url("images/cursor-' + $(item).data('cursor-key') + '.png")';
  }

  if ($(item).data('cursor-offset')) {
    cursor+= ' ' + $(item).data('cursor-offset');
  }

  $('#editor').css('cursor', cursor + ', auto');
  paper.project.activeLayer.selected = false;
  paper.deselect();
  paper.view.update();
}

// Build the elements for the colorpicker non-tool item
function buildColorPicker() {
  var $picker  = $('<div>').attr('id', 'picker');
  _.each(paper.pancakeShades, function(color, index) {
    $picker.append(
      $('<a>')
        .addClass('color' + index + (index === 0 ? ' active' : ''))
        .attr('href', '#')
        .attr('title', paper.pancakeShadeNames[index])
        .click(function(e){selectColor(index); e.preventDefault();})
        .css('background-color', color)
    );
  });

  var $color = $('<div>')
    .attr('id', 'color')
    .append($picker);

  $('#tools #tool-fill').after($color);
}

// Do everything required when a new color is selected
function selectColor(index) {
  paper.pancakeCurrentShade = index;
  $('#picker a.active').removeClass('active');
  $('#picker a.color' + index).addClass('active');
  $('#tools').attr('class', 'color-' + index);

  // Swap out color cursor (if any)
  var cursor = '';
  var $item = $('#tools .active');
  if ($item.data('cursor-colors')) {
    cursor = 'url("images/cursor-' +
      $item.data('cursor-key') + '-' + paper.pancakeCurrentShade + '.png")';
    if ($item.data('cursor-offset')) {
      cursor+= ' ' + $item.data('cursor-offset');
    }
    $('#editor').css('cursor', cursor + ', auto');
  }

  // Change selected path's color
  if (paper.selectRect) {
    if (paper.selectRect.ppaths.length) {
      _.each(paper.selectRect.ppaths, function(path){
        if (path.data.fill === true) {
          path.fillColor = paper.pancakeShades[index];
        } else {
          path.strokeColor = paper.pancakeShades[index];
        }

        path.data.color = index;
      });

      paper.view.update();
      app.currentFile.changed = true;
    }
  }
}

// Build the fake tool placeholder for image import
function buildImageImporter() {
  var $importButton = $('<div>')
    .addClass('tool')
    .attr('id', 'import')
    .data('cursor-key', 'select')
    .attr('title', i18n.t('import.title'));

  $importButton.append(
    $('<nav>')
    .on('mouseout click', function(e){
      // Hide when mouseout on anything but a child element, or itself.
      var doHide = !$(this).has(e.toElement).length && e.toElement !== this;

      // Hide on click when clicking only the element.
      if (e.type === 'click') {
        doHide = e.toElement === this;
      }

      // Hide menu when mouse moves outside nav box.
      if (doHide) {
        $(this).removeClass('nav-open').find('input').prop('checked', false);
      }
    })
    .addClass('menu').append(
      $('<input>')
        .attr({
          type: 'checkbox',
          href: '#',
          class: 'menu-open',
          name: 'menu-open',
          id: 'menu-open',
        }),
      $('<label>')
        .addClass('menu-open-button').attr('for', 'menu-open')
        .click(function() { $('#import nav.menu').addClass('nav-open'); }),
      $('<a>')
        .attr('title', i18n.t('import.auto.options.complex'))
        .addClass('menu-item').append($('<i>').addClass('complex')),
      $('<a>')
        .attr('title', i18n.t('import.auto.options.simple'))
        .addClass('menu-item').append($('<i>').addClass('simple')),
      $('<a>')
        .attr('title', i18n.t('import.auto.options.manual'))
        .addClass('menu-item').append($('<i>').addClass('manual'))
    )
  );

  $importButton.find('a').click(function(){
    var option = $('i', this).attr('class');
    setImageImport(option);
  });

  $('#tools #tool-select').before($importButton);
}

function setImageImport(option) {
  var $importButton = $('#import');

  switch (option) {
    case 'manual':
      activateToolItem($importButton);
      paper.initImageImport();
      break;
    case 'simple':
    case 'complex':
      $importButton.find('input').prop('checked', false); // Hide the menu.
      mainWindow.dialog({
        t: 'OpenDialog',
        title: i18n.t('import.autotitle.' + option),
        filters: [{
          name: i18n.t('import.files'),
          extensions: ['jpg', 'jpeg', 'gif', 'png', 'bmp']
        }]
      }, function(filePath){
        if (!filePath) {  // Open cancelled
          return;
        }

        // Convert array of files to just the first one.
        filePath = filePath[0];
        var autotrace = mainWindow.overlay.windows.autotrace;

        // Gifs must be converted as JIMP doesn't have support for them :(
        if (path.parse(filePath).ext.toLowerCase() === '.gif') {
          var img = new paper.Raster(filePath);
          img.onLoad = function() {
            var temp = path.join(app.getPath('temp'), 'pp_tempconvert.png');
            paper.utils.saveRasterImage(img, 72, temp).then(function() {
              img.remove();
              autotrace.imageTransfer(temp, option);
            });
          };
        } else {
          autotrace.imageTransfer(filePath, option);
        }
      });
  }
}



// When the page is done loading, all the controls in the page can be bound.
function bindControls() {
  // Bind cut/copy/paste controls... Cause they're not always caught.
  $(window).keydown(paper.handleClipboard);

  // Callback/event for when any menu item is clicked
  app.menuClick = function(menu, callback) {
    switch (menu) {
      case 'file.export':
        mainWindow.overlay.windows.export.pickFile(function(filePath) {
          if (!filePath) return; // Cancelled

          mainWindow.overlay.toggleWindow('export', true);
          mainWindow.overlay.windows.export.filePath = filePath;
        });
        break;

      case 'file.saveas':
        app.currentFile.name = "";
        /* falls through */
      case 'file.save':
        if (app.currentFile.name === "") {
          mainWindow.dialog({
            t: 'SaveDialog',
            title: i18n.t(menu), // Same app namespace i18n key for title :)
            defaultPath: app.currentFile.path,
            filters: [
              { name: i18n.t('file.type'), extensions: ['pbp'] }
            ]
          }, function(filePath){
            if (!filePath) return; // Cancelled
            fileIO.saveProjectFile({
              fs: fs,
              paper: paper,
              toastr: toastr,
              i18n: i18n,
              currentFile: app.currentFile,
              filePath: filePath
            });

            if (callback) callback();
          });
        } else {
          fileIO.saveProjectFile({
            fs: fs,
            paper: paper,
            toastr: toastr,
            i18n: i18n,
            currentFile: app.currentFile
          });
        }

        break;
      case 'file.open':
        if (!document.hasFocus()) return; // Triggered from devtools otherwise
        checkFileStatus(function() {
          mainWindow.dialog({
            t: 'OpenDialog',
            title: i18n.t(menu),
            filters: [
              { name: i18n.t('file.type'), extensions: ['pbp'] }
            ]
          }, function(filePath){
            if (!filePath) return; // Cancelled
            fileIO.openProjectFile({
              fs: fs,
              paper: paper,
              toastr: toastr,
              i18n: i18n,
              currentFile: app.currentFile,
              filePath: filePath[0]
            });
          });
        });
        break;
      case 'file.new':
      case 'file.close':
        checkFileStatus(function(){
          toastr.info(i18n.t(menu));
          paper.newPBP();
        });
        break;
      case 'edit.selectall':
        paper.selectAll();
        break;
      case 'edit.undo':
      case 'edit.redo':
        paper.handleUndo(menu === 'edit.undo' ? 'undo': 'redo');
        break;
      case 'edit.copy':
      case 'edit.cut':
      case 'edit.paste':
      case 'edit.duplicate':
        paper.handleClipboard(menu.split('.')[1]);
        break;
      case 'view.settings':
        mainWindow.overlay.toggleWindow('settings', true);
        break;
      default:
        console.log(menu);
    }
  };

  bridge.menu.onMenuClick(function(menuKey) {
    app.menuClick(menuKey);
  });

  // Settings form fields management & done/reset
  $(window).keydown(function(e){
    if (e.keyCode === 27) { // Global escape key exit settings
      $('#done').click();
    }
  });

  // Setup rangeslider overlay and preview everywhere used.
  $('input[type="range"]').on('input', function(){
    var e = $(this).siblings('b');
    if ($(this).attr('data-unit')) {
      var u = 'settings.units.' + $(this).attr('data-unit');
      var rangeVal = $(this).val();

      // Specialty override to calculate GCODE speed as displayed range value.
      if (this.id.indexOf('speed')) {
        rangeVal = parseInt((rangeVal / 100) * app.constants.botSpeedMax, 10);
      }

      e.attr('title', this.value + ' ' + i18n.t(u + '.title'))
        .text(this.value + i18n.t(u + '.label', {value: rangeVal}));
    } else {
      e.text(this.value);
    }
  }).rangeslider({
    polyfill: false
  });

  // Setup fancy checkbox everywhere used.
  $('input[type="checkbox"].fancy').after($('<div>').click(function(){
    $(this).siblings('input[type="checkbox"]').click();
  }));

  // Input based Settings management I/O.
  $('.settings-managed').each(function() {
    var key = this.id; // IDs required!
    var v = app.settings.v;

    // Set loaded value (if any)
    if (typeof v[key] !== 'undefined') {
      if (this.type === "checkbox") {
        $(this).prop('checked', v[key]);
      } else {
        $(this).val(v[key]);
      }
    }

    $('input[type="range"]').trigger('input');

    // Bind to catch change
    $(this).change(function(){
      if (this.type === 'checkbox') {
        app.settings.v[key] = $(this).prop('checked');
      } else {
        app.settings.v[key] = parseFloat(this.value);
      }

      app.settings.save();
      $(window).triggerHandler('settingsChanged');
    }).change();

    // Force default value on blur invalidation.
    $(this).blur(function(){
      if (!this.checkValidity()) {
        this.value = $(this).attr('default');
        $(this).change();
      }
    });
  });

  // Add settings reset helper function.
  mainWindow.resetSettings = function() {
    var resetTitle = i18n.t('settings.resetconfirm');
    var resetDetail = i18n.t('settings.resetconfirmdetail');
    var cancelLabel = i18n.t('common.button.cancel');
    var resetLabel = i18n.t('settings.button.reset');

    if (!resetTitle || resetTitle === 'settings.resetconfirm') {
      resetTitle = 'Reset to factory default settings?';
    }
    if (!resetDetail || resetDetail === 'settings.resetconfirmdetail') {
      resetDetail =
        'This will revert all settings on this page to default. ' +
        'This cannot be undone.';
    }
    if (!cancelLabel || cancelLabel === 'common.button.cancel') {
      cancelLabel = 'Cancel';
    }
    if (!resetLabel || resetLabel === 'settings.button.reset') {
      resetLabel = 'Revert All Settings';
    }

    var doReset = mainWindow.dialog({
      t: 'MessageBox',
      type: 'question',
      message: resetTitle,
      detail: resetDetail,
      defaultId: 0,
      cancelId: 1,
      buttons: [
        resetLabel,
        cancelLabel
      ]
    });
    if (doReset === 0) {
      // Clear the file, reload settings, push to elements.
      app.settings.reset();
      $('.settings-managed').each(function() {
        $(this).val(app.settings.v[this.id]);
        if (this.type === "checkbox") {
          $(this).prop('checked', app.settings.v[this.id]);
        } else {
          $(this).val(app.settings.v[this.id]);
        }
      });
      $('input[type="range"]')
        .trigger('input')
        .rangeslider('update', true);

      $(window).triggerHandler('settingsChanged');
      return true;
    }

    return false;
  };
}

// Handle unsaved file changes before window close.
window.onbeforeunload = function(e) {
  if (!app.currentFile.changed) {
    return;
  }

  var shouldClose = checkFileStatus(function() {
    // Save-as is async. Re-trigger close when that save successfully completes.
    window.close();
  });

  if (shouldClose === false) {
    if (e) {
      e.returnValue = false;
    }
    return false;
  }

  return;
};

// Overlay modal internal "window" management API ==============================
mainWindow.overlay = {
  windowNames: ['export', 'autotrace', 'settings'], // TODO: load automatically.
  windows: {}, // Placeholder for window module code.
  contexts: {},
  ensureWindowLoaded: function(name) {
    var jsFile;

    if (this.windows[name] && this.windows[name].__loaded) {
      return this.windows[name];
    }

    jsFile = bridge.path.join(
      app.getAppPath(), 'src', 'windows', 'window.' + name + '.js'
    );

    if (fs.existsSync(jsFile)) {
      this.windows[name] = loadRendererModule(jsFile)(this.contexts[name]);
      this.windows[name].__loaded = true;

      if (this.windows[name].init) {
        this.windows[name].init();
      }
    } else {
      this.windows[name] = {__loaded: true};
    }

    return this.windows[name];
  },
  toggleWindow: function(name, toggle) {
    if (this.windowNames.indexOf(name) !== -1) {
      var $elem = $('#overlay #' + name);
      if (typeof toggle === 'undefined') {
        toggle = !$elem.is(':visible');
      }

      // Show or hide?
      if (toggle) {
        this.ensureWindowLoaded(name);
        mainWindow.overlay.currentWindow = mainWindow.overlay.windows[name];
        this.toggleFrostedOverlay(true, function(){
          $elem.fadeIn('slow', function() {
            $(window).resize();
            mainWindow.overlay.windows[name].isOpen = true;

            // Show window code trigger.
            if (mainWindow.overlay.windows[name].show) {
              mainWindow.overlay.windows[name].show();
            }
          });
        });
      } else {
        $elem.fadeOut('slow', function() {
          mainWindow.overlay.windows[name].isOpen = false;

          // Hide window code trigger.
          if (mainWindow.overlay.windows[name].hide) {
            mainWindow.overlay.windows[name].hide();
          }
        });
        this.toggleFrostedOverlay(false);

      }

    }
  },

  // Initialize the window content.
  initWindows: function() {
    _.each(mainWindow.overlay.windowNames, function(name) {
      // Append the actual HTML include into the DOM.
      var htmlFile = bridge.path.join(
        app.getAppPath(), 'src', 'windows', 'window.' + name + '.html'
      );
      var context; // Placeholder for context of newly added element.
      if (fs.existsSync(htmlFile)) {
        $('#overlay').append(
          $('<div>')
            .attr('id', name)
            .addClass('overlay-window')
            .html(fs.readFileSync(htmlFile, 'utf8'))
        );

        context = $('#overlay > div:last');
        i18n.translateElementsIn(context);
      }

      mainWindow.overlay.contexts[name] = context;
      mainWindow.overlay.windows[name] = {}; // Loaded on first open.

      if (name === 'export') {
        // Keep export file dialog available before lazy module load.
        mainWindow.overlay.windows[name].pickFile = function(callback) {
          mainWindow.dialog({
            t: 'SaveDialog',
            title: i18n.t('export.title'),
            defaultPath: path.join(
              app.getPath('userDesktop'),
              app.currentFile.name.split('.')[0]
            ),
            filters: [
              { name: 'PancakeBot GCODE', extensions: ['gcode'] }
            ]
          }, function(filePath) {
            if (
              filePath &&
              filePath.split('.').pop().toLowerCase() !== 'gcode'
            ) {
              filePath += '.gcode';
            }

            callback(filePath);
          });
        };
      }
    });
  },

  // Show/Hide the fosted glass overlay (disables non-overlay-wrapper controls)
  toggleFrostedOverlay: function (doShow, callback) {
    if (typeof doShow === 'undefined') {
      doShow = !$('#overlay').is(':visible');
    }

    // Blur (or unblur) the non-overlay content.
    var blur = doShow ? 'blur(20px)' : 'blur(0)';
    $('#non-overlay-wrapper').css('-webkit-filter', blur);

    if (doShow) {
      $('#overlay').fadeIn('slow');
      paper.deselect();
      if (callback) callback();
    } else {
      $('#overlay').fadeOut('slow');
      if (callback) callback();
    }
  },

  currentWindow: {}
};

// Check the current file status and return whether
// the current action may proceed.
function checkFileStatus(callback) {
  if (app.currentFile.changed) {
    var promptModel = unsavedChanges.buildClosePromptModel({
      i18n: i18n,
      currentFile: app.currentFile
    });
    var selection = mainWindow.dialog(promptModel.dialogOptions);
    var action = unsavedChanges.resolveCloseAction(app.currentFile, selection);

    if (action === unsavedChanges.actions.CANCEL) {
      return false;
    }

    if (action === unsavedChanges.actions.SAVE) {
      if (app.currentFile.name === "") {
        // Save-as is async and must complete before continuing.
        app.menuClick('file.save', function(){
          if (callback) callback();
        });
        return false;
      }

      app.menuClick('file.save');
    } else {
      toastr.warning(i18n.t('file.discarded'));
    }
  }

  if (callback) callback();
  return true;
}


// Prevent drag/dropping onto the window (it's really bad!)
document.addEventListener('drop', function(e) {
  e.preventDefault();
  e.stopPropagation();
});
document.addEventListener('dragover', function(e) {
  e.preventDefault();
  e.stopPropagation();
});
