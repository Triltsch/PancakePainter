/**
 * @file File I/O helper for project save/open flows in the renderer.
 */
'use strict';

var path = require('path');

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
    toastr.success(i18n.t('file.note', { file: currentFile.name }));
    currentFile.changed = false;
    return true;
  } catch (e) {
    toastr.error(i18n.t('file.error', { file: currentFile.name }));
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
    toastr.error(i18n.t('file.error', { file: parsedName }));
    return false;
  }

  try {
    fs.readFileSync(filePath, 'utf8');
    paper.loadPBP(filePath);
    currentFile.path = filePath;
    currentFile.name = path.parse(filePath).base;
    currentFile.changed = false;
    return true;
  } catch (e) {
    toastr.error(i18n.t('file.error', { file: path.parse(filePath).base }));
    return false;
  }
}

module.exports = {
  normalizeProjectPath: normalizeProjectPath,
  saveProjectFile: saveProjectFile,
  openProjectFile: openProjectFile
};
