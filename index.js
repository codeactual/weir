/**
 * Build and run BDD flows with before/after hooks, describe, it
 *
 * Licensed under MIT.
 * Copyright (c) 2013 David Smith <https://github.com/codeactual/>
 */

/*jshint node:true*/
'use strict';

module.exports = {
  Bddflow: Bddflow,
  mixin: mixin,
  require: require // Allow tests to use component-land require.
};

var configurable = require('configurable.js');

function Bddflow() {
  this.settings = {
    nativeRequire: {}
  };
}

configurable(Bddflow.prototype);

/**
 * Apply collected configuration.
 */
Bddflow.prototype.init = function() {
  var nativeRequire = this.get('nativeRequire');

  // Store refs to native modules ...
};

/**
 * Mix the given function set into Bddflow's prototype.
 *
 * @param {object} ext
 */
function mixin(ext) {
  Object.keys(ext).forEach(function(key) {
    if (typeof ext[key] === 'function') {
      Bddflow.prototype[key] = ext[key];
    }
  });
}
