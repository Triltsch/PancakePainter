/**
 * @file Unit tests for helper.file-io.js
 *
 * Scope: verifies project save/open paths and graceful failure behavior using
 * mocked fs, paper, and UI dependencies.
 */
'use strict';

const fileIO = require('../../../src/helpers/helper.file-io');

describe('helper.file-io', () => {
  let fsMock;
  let paperMock;
  let toastrMock;
  let i18nMock;
  let currentFile;

  beforeEach(() => {
    fsMock = {
      writeFileSync: jest.fn(),
      readFileSync: jest.fn(() => '<pbp />'),
      existsSync: jest.fn(() => true)
    };

    paperMock = {
      getPBP: jest.fn(() => '<pbp />'),
      loadPBP: jest.fn()
    };

    toastrMock = {
      success: jest.fn(),
      error: jest.fn()
    };

    i18nMock = {
      t: jest.fn((key, vars) => {
        if (key === 'file.note') return 'saved ' + vars.file;
        if (key === 'file.error') return 'error ' + vars.file;
        return key;
      })
    };

    currentFile = {
      name: '',
      path: 'C:/tmp/design',
      changed: true
    };
  });

  /**
   * Verifies extension normalization behavior.
   * Expected: missing .pbp extension is appended.
   */
  test('normalizeProjectPath appends .pbp for missing extension', () => {
    expect(fileIO.normalizeProjectPath('C:/tmp/drawing')).toBe('C:/tmp/drawing.pbp');
  });

  /**
   * Verifies save happy path.
   * Expected: path/name update, write call, success notice, changed=false.
   */
  test('saveProjectFile writes project and updates file state', () => {
    const success = fileIO.saveProjectFile({
      fs: fsMock,
      paper: paperMock,
      toastr: toastrMock,
      i18n: i18nMock,
      currentFile: currentFile,
      filePath: 'C:/tmp/new-design'
    });

    expect(success).toBe(true);
    expect(currentFile.path).toBe('C:/tmp/new-design.pbp');
    expect(currentFile.name).toBe('new-design.pbp');
    expect(currentFile.changed).toBe(false);
    expect(fsMock.writeFileSync).toHaveBeenCalled();
    expect(toastrMock.success).toHaveBeenCalled();
  });

  /**
   * Verifies save error handling.
   * Expected: write exceptions are caught and surfaced as error notifications.
   */
  test('saveProjectFile handles write errors gracefully', () => {
    fsMock.writeFileSync.mockImplementation(() => {
      throw new Error('disk full');
    });

    const success = fileIO.saveProjectFile({
      fs: fsMock,
      paper: paperMock,
      toastr: toastrMock,
      i18n: i18nMock,
      currentFile: currentFile,
      filePath: 'C:/tmp/new-design.pbp'
    });

    expect(success).toBe(false);
    expect(toastrMock.error).toHaveBeenCalled();
  });

  /**
   * Verifies open behavior for missing file paths.
   * Expected: missing file is rejected with user-facing error.
   */
  test('openProjectFile handles missing file gracefully', () => {
    fsMock.existsSync.mockReturnValue(false);

    const success = fileIO.openProjectFile({
      fs: fsMock,
      paper: paperMock,
      toastr: toastrMock,
      i18n: i18nMock,
      currentFile: currentFile,
      filePath: 'C:/tmp/missing.pbp'
    });

    expect(success).toBe(false);
    expect(paperMock.loadPBP).not.toHaveBeenCalled();
    expect(toastrMock.error).toHaveBeenCalled();
  });

  /**
   * Verifies unreadable file behavior.
   * Expected: read exceptions are handled and do not crash caller.
   */
  test('openProjectFile handles unreadable file gracefully', () => {
    fsMock.readFileSync.mockImplementation(() => {
      throw new Error('EACCES');
    });

    const success = fileIO.openProjectFile({
      fs: fsMock,
      paper: paperMock,
      toastr: toastrMock,
      i18n: i18nMock,
      currentFile: currentFile,
      filePath: 'C:/tmp/protected.pbp'
    });

    expect(success).toBe(false);
    expect(toastrMock.error).toHaveBeenCalled();
  });

  /**
   * Verifies malformed content handling via renderer load failure.
   * Expected: parse/load exceptions are caught and surfaced as error notices.
   */
  test('openProjectFile handles malformed content gracefully', () => {
    paperMock.loadPBP.mockImplementation(() => {
      throw new Error('malformed file');
    });

    const success = fileIO.openProjectFile({
      fs: fsMock,
      paper: paperMock,
      toastr: toastrMock,
      i18n: i18nMock,
      currentFile: currentFile,
      filePath: 'C:/tmp/bad.pbp'
    });

    expect(success).toBe(false);
    expect(toastrMock.error).toHaveBeenCalled();
  });

  /**
   * Verifies open happy path.
   * Expected: file is read, delegated to paper loader, and file state updates.
   */
  test('openProjectFile loads project and updates file state', () => {
    const success = fileIO.openProjectFile({
      fs: fsMock,
      paper: paperMock,
      toastr: toastrMock,
      i18n: i18nMock,
      currentFile: currentFile,
      filePath: 'C:/tmp/valid.pbp'
    });

    expect(success).toBe(true);
    expect(fsMock.readFileSync).toHaveBeenCalledWith('C:/tmp/valid.pbp', 'utf8');
    expect(paperMock.loadPBP).toHaveBeenCalledWith('C:/tmp/valid.pbp');
    expect(currentFile.name).toBe('valid.pbp');
    expect(currentFile.changed).toBe(false);
  });
});
