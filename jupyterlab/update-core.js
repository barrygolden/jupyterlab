var childProcess = require('child_process');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var sortPackageJson = require('sort-package-json');

var schemaDir = path.resolve('./schemas');
fs.removeSync(schemaDir);
fs.ensureDirSync(schemaDir);

var themesDir = path.resolve('./themes');
fs.removeSync(themesDir);
fs.ensureDirSync(themesDir);

var corePackage = require('./package.json');
corePackage.jupyterlab.extensions = {};
corePackage.jupyterlab.mimeExtensions = {};
corePackage.jupyterlab.themeExtensions = {};
corePackage.dependencies = {};

var basePath = path.resolve('..');
var packages = glob.sync(path.join(basePath, 'packages/*'));
packages.forEach(function(packagePath) {
   var dataPath = path.join(packagePath, 'package.json');
   try {
    var data = require(dataPath);
  } catch (e) {
    return;
  }
  var jlab = data.jupyterlab;
  if (!jlab) {
    return;
  }

  // Make sure it is included as a dependency.
  corePackage.dependencies[data.name] = '^' + String(data.version);

  // Add its dependencies to the core dependencies.
  var deps = data.dependencies || [];
  for (var dep in deps) {
    corePackage.dependencies[dep] = deps[dep];
  }

  // Handle extensions.
  ['extension', 'mimeExtension'].forEach(function(item) {
    var ext = jlab[item];
    if (ext === true) {
      ext = ''
    }
    if (typeof ext !== 'string') {
      return;
    }
    corePackage.jupyterlab[item + 's'][data.name] = ext;
  });

  // Handle schemas.
  var schemas = jlab['schemas'] || [];
  schemas.forEach(function(schemaPath) {
    var file = path.basename(schemaPath);
    var from = path.join(packagePath, schemaPath)
    var to = path.join(basePath, 'jupyterlab', 'schemas', file);
    fs.copySync(from, to);
  });

  // Handle theme assets.
  var themes = jlab['themeAssets'];
  if (themes) {
    var name = data['name'].replace('@', '');
    name = name.replace('/', '-');
    var from = path.join(packagePath, themes);
    var to = path.join(basePath, 'jupyterlab', 'themes', name);
    fs.copySync(from, to);
  }
});


// Write the package.json back to disk.
var text = JSON.stringify(sortPackageJson(corePackage), null, 2) + '\n';
fs.writeFileSync('./package.json', text);
