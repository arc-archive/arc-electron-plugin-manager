// const assert = require('chai').assert;
// const fs = require('fs-extra');
const {ThemePluginsManager} = require('../main');

describe('ThemePluginsManager basic tests- main process', function() {
  const basePath = 'test/themes';
  describe('install()', function() {
    it('Reads default config', function() {
      const instance = new ThemePluginsManager(basePath);
      // return instance.install(
      //   'advanced-rest-client/arc-electron-default-theme', '2.0.0-preview');
      // return instance.checkUpdateAvailable(
      //   'advanced-rest-client/arc-electron-default-theme', '2.0.0-preview');
      return instance.getInfo('advanced-rest-client/arc-electron-default-theme')
      .then((info) => console.log(info));
    });
  });
});
