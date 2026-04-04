/**
 * @file File I/O helper for project save/open flows in the renderer.
 */
'use strict';

var path = require('path');

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
  if (path.extname(filePath).toLowerCase() !== '.pbp') {
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
  currentFile.name = path.parse(targetPath).base;

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
  var parsedName = path.parse(filePath || '').base;

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
    currentFile.name = path.parse(filePath).base;
    currentFile.changed = false;
    return true;
  } catch (e) {
    toastr.error(renderToastMessage(
      i18n,
      'file.error',
      path.parse(filePath).base,
      'Could not open {{file}}.'
    ));
    return false;
  }
}

module.exports = {
  normalizeProjectPath: normalizeProjectPath,
  saveProjectFile: saveProjectFile,
  openProjectFile: openProjectFile
};
