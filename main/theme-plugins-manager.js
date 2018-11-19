const {app} = require('electron');
const path = require('path');
// const log = require('electron-log');
const fs = require('fs-extra');
const {ThemeInfo} = require('./theme-info');
const {PluginManager} = require('live-plugin-manager');
const EventEmitter = require('events');
const semver = require('semver');
/**
 * This is the main process interface.
 *
 * Manages themes packages. Installs, uninstalls and updates themes from it's
 * repository or npm registry.
 */
class ThemePluginsManager extends EventEmitter {
  /**
   * @param {?String} basePath Themes base location. If not set the default
   * path is used.
   */
  constructor(basePath) {
    super();
    /**
     * Base path to the themes folder.
     * @type {String}
     */
    this.themesBasePath = this.resolvePath(basePath) ||
      path.join(app.getPath('userData'), 'themes');
    /**
     * Location of the installed themes info file.
     * @type {String}
     */
    this.infoFilePath = path.join(this.themesBasePath, 'themes-info.json');
    /**
     * Main module (ARC's) path location to generate absolute URL
     * @type {String}
     */
    this.root = path.dirname(require.main.filename);
  }

  get pluginManager() {
    if (!this.__pluginManager) {
      this.__pluginManager = new PluginManager({
        cwd: this.themesBasePath,
        pluginsPath: this.themesBasePath
      });
    }
    return this.__pluginManager;
  }

  get themeInfo() {
    return new ThemeInfo(this.infoFilePath);
  }

  /**
   * Resolves file path to correct path if it's starts with `~`.
   *
   * @param {String} file Settings file path
   * @return {String} Path to the file.
   */
  resolvePath(file) {
    if (file && file[0] === '~') {
      file = app.getPath('home') + file.substr(1);
    }
    return file;
  }
  /**
   * Installs a theme package to the themes directory.
   * @param {String} name NPM name or Github repo
   * @param {String} version Theme version to install.
   * @return {Promise}
   */
  install(name, version) {
    return this.pluginManager.install(
      ...this._prepareSourceAndVersion(name, version))
    .then((info) => this._createThemeInfo(name, info))
    .then((info) => this._addThemeEntry(info));
  }

  uninstall(name) {
    return this.pluginManager.uninstall(name)
    .then(() => this._removeThemeEntry(name));
  }

  getInfo(name) {
    const store = this.themeInfo;
    return store.load()
    .then((themes) => {
      for (let i = 0, len = themes.length; i < len; i++) {
        if (themes[i]._id === name) {
          return themes[i];
        }
      }
    });
  }

  checkUpdateAvailable(name, version) {
    const names = this._prepareSourceAndVersion(name, version);
    const qPromise = this.pluginManager.queryPackage(...names);
    const iPromise = this.getInfo(name);
    return Promise.all([iPromise, qPromise])
    .then((data) => {
      const localInfo = data[0];
      const remoteInfo = data[1];
      return semver.gt(remoteInfo.version, localInfo.version);
    });
  }
  /**
   * Processes source and version properties to produce right input for
   * `live-plugin-manager`
   * @param {String} source NPM name or Github repo
   * @param {String} version Theme version to install.
   * @return {Array<String>} First item is the source and version the other.
   */
  _prepareSourceAndVersion(source, version) {
    if (source.indexOf('/') !== -1 && source[0] !== '@') {
      if (!version) {
        version = 'master';
      }
      version = source + '#' + version;
    }
    return [source, version];
  }
  /**
   * Creates a theme info object from both `live-plugin-manager` install response
   * and installed theme package file.
   * @param {String} id
   * @param {Object} info
   * @return {Object} An object to be stored in theme info file.
   */
  _createThemeInfo(id, info) {
    const result = {
      _id: id,
      name: info.name,
      version: info.version,
      location: info.location,
      mainFile: info.mainFile,
      title: info.name,
      description: ''
    };
    return fs.readJson(path.join(info.location, 'package.json'))
    .then((pkg) => {
      if (pkg.themeTitle) {
        result.title = pkg.themeTitle;
      }
      if (pkg.description) {
        result.description = pkg.description;
      }
      return result;
    });
  }
  /**
   * Adds theme info object to themes registry file.
   * @param {Object} info An object to add.
   * @return {Promise}
   */
  _addThemeEntry(info) {
    const store = this.themeInfo;
    return store.load()
    .then((themes) => {
      themes.push(info);
      return store.store();
    })
    .then(() => this.emit('theme-addded', info));
  }

  _removeThemeEntry(name) {
    const store = this.themeInfo;
    return store.load()
    .then((themes) => {
      for (let i = 0, len = themes.length; i < len; i++) {
        if (themes[i]._id === name) {
          themes.splice(i, 1);
          return store.store();
        }
      }
    })
    .then(() => this.emit('theme-removed', name));
  }
}

module.exports.ThemePluginsManager = ThemePluginsManager;
