/**
 * @file Settings persistence helper for main-process configuration loading.
 */
'use strict';

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function createSettingsStore(options) {
  var fs = options.fs;
  var settingsFile = options.settingsFile;
  var userSettingsFile = options.userSettingsFile;
  var defaults = options.defaults || {};

  var store = {
    v: {},
    defaults: defaults,
    clear: function() {
      fs.removeSync(settingsFile);
    },
    clearUserOverrides: function() {
      fs.removeSync(userSettingsFile);
    },
    save: function() {
      var serialized = JSON.stringify(this.v);
      try {
        fs.writeFileSync(settingsFile, serialized);
      } catch (e) {
        fs.writeFileSync(userSettingsFile, serialized);
      }
    },
    load: function() {
      var userConfig = {};
      this.v = {};

      try {
        if (fs.existsSync(settingsFile)) {
          this.v = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        }
      } catch (e) {}

      for (var i in this.defaults) {
        if (!hasOwn(this.v, i)) {
          this.v[i] = this.defaults[i];
        }
      }

      try {
        if (fs.existsSync(userSettingsFile)) {
          userConfig = JSON.parse(fs.readFileSync(userSettingsFile, 'utf8'));
        }
      } catch (e) {}

      for (var j in userConfig) {
        this.v[j] = userConfig[j];
      }

      this.save();
    },
    reset: function() {
      this.clear();
      this.clearUserOverrides();
      this.load();
    }
  };

  return store;
}

module.exports = createSettingsStore;
