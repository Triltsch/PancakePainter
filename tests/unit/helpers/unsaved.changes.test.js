/**
 * @file Unit tests for helper.unsaved-changes.js
 *
 * Scope: verify Save/Discard/Cancel close prompt modeling and action mapping
 * for new and existing project files.
 */
'use strict';

const unsavedChanges = require('../../../src/helpers/helper.unsaved-changes');

describe('helper.unsaved-changes', () => {
  let i18n;

  beforeEach(() => {
    i18n = {
      t: jest.fn((key, vars) => {
        const dictionary = {
          'file.confirm.notsaved': 'Project file has not been saved!',
          'file.confirm.savenew': 'Save new project before continuing?',
          'file.confirm.changed': 'Project has changed since last save!',
          'file.button.discard': 'Discard changes',
          'file.button.savenew': 'Save as a new file',
          'file.button.save': 'Save current file',
          'common.button.cancel': 'Cancel'
        };

        if (key === 'file.confirm.save') {
          return 'Save changes to "' + (vars && vars.file) + '" before continuing?';
        }

        return dictionary[key] || key;
      })
    };
  });

  /**
   * Verifies new-file prompt semantics.
   * Expected: Discard/Save As/Cancel with cancel index configured.
   */
  test('buildClosePromptModel for new file includes cancel option', () => {
    const model = unsavedChanges.buildClosePromptModel({
      i18n: i18n,
      currentFile: { name: '' }
    });

    expect(model.dialogOptions.buttons).toEqual([
      'Discard changes',
      'Save as a new file',
      'Cancel'
    ]);
    expect(model.dialogOptions.defaultId).toBe(1);
    expect(model.dialogOptions.cancelId).toBe(2);
  });

  /**
   * Verifies existing-file prompt semantics.
   * Expected: Discard/Save/Cancel and detail references file name.
   */
  test('buildClosePromptModel for existing file includes save and cancel', () => {
    const model = unsavedChanges.buildClosePromptModel({
      i18n: i18n,
      currentFile: { name: 'design.pbp' }
    });

    expect(model.dialogOptions.buttons).toEqual([
      'Discard changes',
      'Save current file',
      'Cancel'
    ]);
    expect(model.dialogOptions.detail).toContain('design.pbp');
  });

  /**
   * Verifies action mapping for all button indexes.
   * Expected: 0=discard, 1=save, any other index=cancel.
   */
  test('resolveCloseAction maps selections to discard/save/cancel', () => {
    expect(unsavedChanges.resolveCloseAction(0)).toBe(
      unsavedChanges.actions.DISCARD
    );
    expect(unsavedChanges.resolveCloseAction(1)).toBe(
      unsavedChanges.actions.SAVE
    );
    expect(unsavedChanges.resolveCloseAction(2)).toBe(
      unsavedChanges.actions.CANCEL
    );
  });

  /**
   * Verifies fallback rendering when translations are unavailable.
   * Expected: fallback text is used and action labels stay non-empty.
   */
  test('buildClosePromptModel falls back when i18n returns unresolved keys', () => {
    i18n.t.mockImplementation((key) => key);

    const model = unsavedChanges.buildClosePromptModel({
      i18n: i18n,
      currentFile: { name: '' }
    });

    expect(model.dialogOptions.message).toBe('Project file has not been saved!');
    expect(model.dialogOptions.buttons[2]).toBe('Cancel');
  });
});
