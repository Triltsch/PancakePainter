/**
 * @file Helpers for unsaved-changes close prompts in the renderer.
 */
'use strict';

var actions = {
  DISCARD: 'discard',
  SAVE: 'save',
  CANCEL: 'cancel'
};

function translateWithFallback(i18n, key, fallback, vars) {
  var translated = i18n.t(key, vars || {});

  if (translated && translated !== key) {
    return translated;
  }

  return fallback;
}

function buildClosePromptModel(options) {
  var i18n = options.i18n;
  var currentFile = options.currentFile || {};
  var isNewFile = !currentFile.name;
  var buttons;
  var message;
  var detail;

  if (isNewFile) {
    message = translateWithFallback(
      i18n,
      'file.confirm.notsaved',
      'Project file has not been saved!'
    );
    detail = translateWithFallback(
      i18n,
      'file.confirm.savenew',
      'Save new project before continuing?'
    );
    buttons = [
      translateWithFallback(i18n, 'file.button.discard', 'Discard changes'),
      translateWithFallback(i18n, 'file.button.savenew', 'Save as a new file'),
      translateWithFallback(i18n, 'common.button.cancel', 'Cancel')
    ];
  } else {
    message = translateWithFallback(
      i18n,
      'file.confirm.changed',
      'Project has changed since last save!'
    );
    detail = translateWithFallback(
      i18n,
      'file.confirm.save',
      'Save changes before continuing?',
      { file: currentFile.name }
    );
    buttons = [
      translateWithFallback(i18n, 'file.button.discard', 'Discard changes'),
      translateWithFallback(i18n, 'file.button.save', 'Save current file'),
      translateWithFallback(i18n, 'common.button.cancel', 'Cancel')
    ];
  }

  return {
    dialogOptions: {
      t: 'MessageBox',
      type: 'warning',
      message: message,
      detail: detail,
      defaultId: 1,
      cancelId: 2,
      buttons: buttons
    }
  };
}

function resolveCloseAction(selectedIndex) {
  if (selectedIndex === 0) {
    return actions.DISCARD;
  }

  if (selectedIndex === 1) {
    return actions.SAVE;
  }

  return actions.CANCEL;
}

module.exports = {
  actions: actions,
  buildClosePromptModel: buildClosePromptModel,
  resolveCloseAction: resolveCloseAction
};
