/*
 * @file This PaperScript file controls the main PancakePainter SVG Editor and
 * all importing/exporting of its data.
 */
 /* globals
   window, mainWindow, _, toastr, i18n, paper, view, project, scale, app,
   Raster, Group, Point, Layer, path, fs, editorLoadedInit
 */

paper.strokeWidth = 5; // Match original visual line thickness
paper.settings.handleSize = 10;

// Layer Management (custom vars)
paper.imageLayer = project.getActiveLayer(); // Behind the active layer
paper.mainLayer = new Layer(); // Everything is drawn on here by default now

// Hold onto the base colors for the palette (also custom)
paper.pancakeShades = app.constants.pancakeShades;

// Handy translated color names
paper.pancakeShadeNames = [];
_.each(paper.pancakeShades, function(color, index){ /* jshint unused:false */
  paper.pancakeShadeNames.push(i18n.t('color.color' + index));
});

paper.pancakeCurrentShade = 0;

// TODO: Load all tools in folder based on weight
var toolPen = require('./tools/tool.pen')(paper);
var toolFill = require('./tools/tool.fill')(paper); /* jshint ignore:line */
var toolSelect = require('./tools/tool.select')(paper);

// Load Helpers
// TODO: Load via files in dir, API style.
_.each(['undo', 'clipboard'], function(helperName) {
  paper[helperName] = require('./helpers/helper.' + helperName)(paper);
});

Object.defineProperty(paper, 'utils', {
  configurable: true,
  get: function() {
    var utils = require('./helpers/helper.utils')(paper);
    Object.defineProperty(paper, 'utils', {
      configurable: true,
      value: utils,
      writable: true
    });
    return utils;
  }
});

Object.defineProperty(paper, 'autotrace', {
  configurable: true,
  get: function() {
    var autotrace = require('./helpers/helper.autotrace')(paper, {
      appPath: app.getAppPath(),
      tempPath: app.getPath('temp')
    });
    Object.defineProperty(paper, 'autotrace', {
      configurable: true,
      value: autotrace,
      writable: true
    });
    return autotrace;
  }
});

paper.setCursor = function(type) {
  // TODO: Implement cursor change on hover of handles, objects, etc
  if (!type) type = 'default';
};

paper.syncViewToScale = function(nextScale) {
  if (!nextScale) {
    return;
  }

  view.zoom = nextScale;

  // Keep the project origin pinned to the top-left of the printable area.
  var corner = view.viewToProject(new Point(0, 0));
  view.scrollBy(new Point(0, 0).subtract(corner));
  view.update();
};

function onResize(event) { /* jshint ignore:line */
  paper.syncViewToScale(scale);
}

view.onResize = onResize;

// Initialize (or edit) an image import for tracing on top of
paper.initImageImport = function() {
  if (!paper.traceImage) {
    mainWindow.dialog({
      t: 'OpenDialog',
      title: i18n.t('import.title'),
      filters: [
        {
          name: i18n.t('import.files'),
          extensions: ['jpg', 'jpeg', 'gif', 'png']
        }
      ]
    }, function(filePath){
      if (!filePath) {  // Open cancelled
        paper.finishImageImport();
        return;
      }

      paper.imageLayer.activate(); // Draw the raster to the image layer
        var img = new Raster({
          source: encodeURI('file:///' + filePath[0].replace(/\\/g, '/')),
          position: view.center
        });
        // The raster MUST be in a group to alleviate coord & scaling issues.
        paper.traceImage = new Group([img]);
        paper.traceImage.img = img;
      paper.mainLayer.activate(); // We're done with the image layer for now

      // TODO: Bad images never trigger onload
      img.onLoad = function() {
        // Size the image down
        var scale = {
          x: (view.bounds.width * 0.8) / this.width,
          y: (view.bounds.height * 0.8) / this.height
        };

        paper.traceImage.pInitialBounds = this.bounds;

        // Use the smallest scale
        scale = (scale.x < scale.y ? scale.x : scale.y);
        paper.traceImage.scale(scale);

        paper.traceImage.opacity = 0.5;

        // Select the thing and disable other selections
        toolSelect.imageTraceMode(true);
      };
    });
  } else {
    // Select the thing and disable other selections
    toolSelect.imageTraceMode(true);
  }

  view.update();
};

// Called when completing image import management
paper.finishImageImport = function() {
  window.activateToolItem('#tool-pen');
  toolPen.activate();
  toolSelect.imageTraceMode(false);
  view.update();
};

// Shortcut for deferring logic to paperscript from app.js.
paper.selectAll = function(items) {
  if (paper.tool.name !== "tools.select") {
    window.activateToolItem('#tool-select');
    toolSelect.activate();
  }

  toolSelect.selectAll(items);
};

// Clear the existing project workspace/file (no confirmation)
paper.newPBP = function(noLayers) {
  paper.emptyProject();

  if (!noLayers) {
    paper.imageLayer = project.getActiveLayer(); // Creates the default layer
    paper.mainLayer = new Layer(); // Everything is drawn on here by default now
    paper.undo.clearState();
  }

  view.update();

  // Reset current file status (keeping previous file name, for kicks)
  app.currentFile.name = "";
  app.currentFile.changed = false;
};

// Just Empty/Clear the workspace.
paper.emptyProject = function() {
  paper.deselect();
  paper.selectRectLast = null;

  paper.imageLayer.remove();
  paper.mainLayer.remove();
  project.clear();

  if (paper.traceImage) {
    paper.traceImage.remove();
    paper.traceImage = null;
  }
};

// Handle undo requests (different depending on if the tool cares).
paper.handleUndo = function(op) {
  // If the tool provides a function, and it returns false, don't run undo.
  if (typeof paper.tool.undoSet === 'function') {
    if (!paper.tool.undoSet(op)) {
      return;
    }
  }

  if (op === 'undo') {
    paper.undo.goBack();
  } else if (op === 'redo') {
    paper.undo.goForward();
  }
};

// Handle clipboard requests
paper.handleClipboard = function(op) {
  // Select all is being weird...
  // TODO: this probably shouldn't go here...
  if (op.ctrlKey && op.keyCode === 65) {
    paper.selectAll();
    return;
  }

  // For clarity, don't do any clipboard operations if not on the select tool.
  if (paper.tool.name !== 'tools.select') {
    return;
  }

  // Support "event" passthrough from window keydown event.
  var event = op;
  if (typeof op === 'object') {
    if (event.ctrlKey && event.keyCode === 67) {
      op = 'copy';
    }
    if (event.ctrlKey && event.keyCode === 88) {
      op = 'cut';
    }
    if (event.ctrlKey && event.keyCode === 86) {
      op = 'paste';
    }
    if (event.ctrlKey && event.keyCode === 68) {
      op = 'duplicate';
    }

    // If our captured keystroke didn't result in valid op, quit.
    if (typeof op !== 'string') {
      return;
    }

    // Prevent whatever else was going to happen.
    event.preventDefault();
  }

  switch (op) {
    case 'cut':
    case 'copy':
      paper.clipboard.copy(op === 'cut');
      break;
    case 'paste':
      paper.clipboard.paste();
      break;
    case 'duplicate':
      paper.clipboard.dupe();
      break;
  }
};


// Render the text/SVG for the pancakebot project files
paper.getPBP = function(){
  paper.deselect(); // Don't export with something selected!
  // Embed the coordinate-space denominator so future loaders can detect and
  // migrate files from a different Electron/Chromium version.
  if (!project.data) {
    project.data = {};
  }
  project.data.ppScaleDenominator =
    app.constants.griddleSvgNaturalSize.width;
  return project.exportJSON();
};

// Called whenever the file is changed from a tool
paper.fileChanged = function() {
  app.currentFile.changed = true;
  paper.undo.stateChanged();
};

// Stopgap till https://github.com/paperjs/paper.js/issues/801 is resolved.
// Clean a path of duplicated segment points, triggered on change/create
paper.cleanPath = function(path){
  _.each(path.segments, function(seg, index){
    if (index > 0 && typeof path.segments[index-1] !== 'undefined') {
      var lastP = path.segments[index-1].point;
      if (lastP.x === seg.point.x && lastP.y === seg.point.y) {
        // Duplicate point found, remove it.
        seg.remove();
      }
    }
  });
};

// Load a given PBP filepath into the project workspace
paper.loadPBP = function(filePath){
  paper.newPBP(true);

  app.currentFile.name = path.parse(filePath).base;
  app.currentFile.path = filePath;
  app.currentFile.changed = false;

  project.importJSON(fs.readFileSync(filePath, "utf8"));

  paper.imageLayer = project.layers[0];
  paper.mainLayer = project.layers[1];

  // Migrate coordinate space for files saved with a different scale
  // denominator.  Legacy builds (Electron ≤ 3, Chromium ≤ 66) used
  // naturalWidth = 300, giving a ~4.8× mismatch versus the current
  // build which anchors on the SVG viewBox width (1437.2).
  var currentDenominator =
    app.constants.griddleSvgNaturalSize.width;
  var savedDenominator =
    project.data && project.data.ppScaleDenominator;

  if (!savedDenominator) {
    // No metadata: attempt heuristic detection.
    // Legacy space ≈ 262 units wide; current ≈ 1255.
    // Threshold of 350 separates them without false positives.
    var LEGACY_SCALE_DENOMINATOR = 300;
    var LEGACY_COORD_THRESHOLD = 350;
    var bounds = paper.mainLayer.bounds;
    if (bounds && bounds.width > 0 &&
        bounds.width < LEGACY_COORD_THRESHOLD) {
      savedDenominator = LEGACY_SCALE_DENOMINATOR;
    }
  }

  if (savedDenominator &&
      Math.abs(savedDenominator - currentDenominator) > 0.5) {
    // Scale layers from the saved space into the current one.
    var migrationFactor = currentDenominator / savedDenominator;
    var origin = new Point(0, 0);
    paper.mainLayer.scale(migrationFactor, origin);
    paper.imageLayer.scale(migrationFactor, origin);
    console.log(
      '[Editor] PBP migration: ' +
      savedDenominator + ' -> ' + currentDenominator +
      ' (x' + migrationFactor.toFixed(4) + ')'
    );
  }

  paper.mainLayer.activate();

  // Reinstate traceImage, if any.
  if (paper.imageLayer.children.length) {
    paper.traceImage = paper.imageLayer.children[0];
    paper.traceImage.img = paper.traceImage.children[0];
  }

  toastr.info(i18n.t('file.opened', {file: app.currentFile.name}));
  paper.undo.clearState();
  view.update();
};


// Editor should be done loading, trigger loadInit
editorLoadedInit();
