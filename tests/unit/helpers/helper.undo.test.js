/**
 * @file Unit tests for helper.undo.js
 *
 * Scope: verifies undo stack state push/pop behavior, stack limits, and edge
 * cases using plain object fixtures (no Electron runtime, no canvas runtime).
 */
'use strict';

const createUndoHelper = require('../../../src/helpers/helper.undo');

describe('helper.undo', () => {
  let paper;
  let project;
  let view;
  let undo;

  beforeEach(() => {
    project = {
      exportJSON: jest.fn(() => JSON.stringify({ stamp: Date.now() })),
      importJSON: jest.fn(),
      layers: [
        { children: [] },
        { activate: jest.fn() }
      ]
    };

    view = {
      update: jest.fn()
    };

    paper = {
      project: project,
      view: view,
      deselect: jest.fn(),
      reselect: jest.fn(),
      emptyProject: jest.fn(),
      imageLayer: null,
      mainLayer: null,
      traceImage: null
    };

    undo = createUndoHelper(paper);
  });

  /**
   * Verifies helper initialization captures initial state.
   * Expected: one state exists at index 0.
   */
  test('captures initial state on helper creation', () => {
    expect(undo.index).toBe(0);
    expect(undo.data.length).toBe(1);
    expect(project.exportJSON).toHaveBeenCalled();
  });

  /**
   * Verifies push behavior and stack trimming.
   * Expected: new states are unshifted and stack obeys undoLevels limit.
   */
  test('pushes states and trims stack to undoLevels', () => {
    undo.options.undoLevels = 3;

    undo.stateChanged();
    undo.stateChanged();
    undo.stateChanged();
    undo.stateChanged();

    expect(undo.data.length).toBe(3);
    expect(undo.index).toBe(0);
  });

  /**
   * Verifies backward undo behavior.
   * Expected: goBack moves index and restores corresponding prior state.
   */
  test('goBack restores previous states in order', () => {
    let counter = 0;
    project.exportJSON.mockImplementation(() => JSON.stringify({ state: counter++ }));

    undo.stateChanged();
    undo.stateChanged();

    undo.goBack();

    expect(undo.index).toBe(1);
    expect(project.importJSON).toHaveBeenCalledWith(undo.data[1]);
    expect(view.update).toHaveBeenCalled();
  });

  /**
   * Verifies multiple consecutive undos stop at stack boundary.
   * Expected: index does not exceed last available state.
   */
  test('supports multiple consecutive undos without overrun', () => {
    undo.stateChanged();
    undo.stateChanged();

    undo.goBack();
    undo.goBack();
    undo.goBack();

    expect(undo.index).toBe(undo.data.length - 1);
  });

  /**
   * Verifies forward redo behavior after undo.
   * Expected: goForward decreases index until current tip is reached.
   */
  test('goForward returns toward latest state after undo', () => {
    undo.stateChanged();
    undo.stateChanged();

    undo.goBack();
    undo.goForward();

    expect(undo.index).toBe(0);
  });

  /**
   * Verifies empty stack edge-case safety.
   * Expected: undo on empty stack does not throw and does not move index.
   */
  test('goBack on empty stack is a no-op', () => {
    undo.data = [];
    undo.index = 0;

    expect(() => undo.goBack()).not.toThrow();
    expect(undo.index).toBe(0);
  });

  /**
   * Verifies clearState semantics.
   * Expected: clear resets stack and captures a new base state.
   */
  test('clearState resets history and stores one fresh state', () => {
    undo.stateChanged();
    undo.stateChanged();

    undo.clearState();

    expect(undo.index).toBe(0);
    expect(undo.data.length).toBe(1);
  });
});
