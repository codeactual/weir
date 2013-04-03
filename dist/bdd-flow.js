;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
  }

  if (require.aliases.hasOwnProperty(index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("visionmedia-configurable.js/index.js", Function("exports, require, module",
"\n/**\n * Make `obj` configurable.\n *\n * @param {Object} obj\n * @return {Object} the `obj`\n * @api public\n */\n\nmodule.exports = function(obj){\n\n  /**\n   * Mixin settings.\n   */\n\n  obj.settings = {};\n\n  /**\n   * Set config `name` to `val`, or\n   * multiple with an object.\n   *\n   * @param {String|Object} name\n   * @param {Mixed} val\n   * @return {Object} self\n   * @api public\n   */\n\n  obj.set = function(name, val){\n    if (1 == arguments.length) {\n      for (var key in name) {\n        this.set(key, name[key]);\n      }\n    } else {\n      this.settings[name] = val;\n    }\n\n    return this;\n  };\n\n  /**\n   * Get setting `name`.\n   *\n   * @param {String} name\n   * @return {Mixed}\n   * @api public\n   */\n\n  obj.get = function(name){\n    return this.settings[name];\n  };\n\n  /**\n   * Enable `name`.\n   *\n   * @param {String} name\n   * @return {Object} self\n   * @api public\n   */\n\n  obj.enable = function(name){\n    return this.set(name, true);\n  };\n\n  /**\n   * Disable `name`.\n   *\n   * @param {String} name\n   * @return {Object} self\n   * @api public\n   */\n\n  obj.disable = function(name){\n    return this.set(name, false);\n  };\n\n  /**\n   * Check if `name` is enabled.\n   *\n   * @param {String} name\n   * @return {Boolean}\n   * @api public\n   */\n\n  obj.enabled = function(name){\n    return !! this.get(name);\n  };\n\n  /**\n   * Check if `name` is disabled.\n   *\n   * @param {String} name\n   * @return {Boolean}\n   * @api public\n   */\n\n  obj.disabled = function(name){\n    return ! this.get(name);\n  };\n\n  return obj;\n};//@ sourceURL=visionmedia-configurable.js/index.js"
));
require.register("manuelstofer-each/index.js", Function("exports, require, module",
"\"use strict\";\n\nvar nativeForEach = [].forEach;\n\n// Underscore's each function\nmodule.exports = function (obj, iterator, context) {\n    if (obj == null) return;\n    if (nativeForEach && obj.forEach === nativeForEach) {\n        obj.forEach(iterator, context);\n    } else if (obj.length === +obj.length) {\n        for (var i = 0, l = obj.length; i < l; i++) {\n            if (iterator.call(context, obj[i], i, obj) === {}) return;\n        }\n    } else {\n        for (var key in obj) {\n            if (Object.prototype.hasOwnProperty.call(obj, key)) {\n                if (iterator.call(context, obj[key], key, obj) === {}) return;\n            }\n        }\n    }\n};\n//@ sourceURL=manuelstofer-each/index.js"
));
require.register("codeactual-is/index.js", Function("exports, require, module",
"/*jshint node:true*/\n\"use strict\";\n\nvar each = require('each');\nvar types = ['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Array'];\n\neach(types, function (type) {\n  var method = type === 'Function' ? type : type.toLowerCase();\n  module.exports[method] = function (obj) {\n    return Object.prototype.toString.call(obj) === '[object ' + type + ']';\n  };\n});\n\nif (Array.isArray) {\n  module.exports.array = Array.isArray;\n}\n\nmodule.exports.object = function (obj) {\n  return obj === Object(obj);\n};\n\n//@ sourceURL=codeactual-is/index.js"
));
require.register("component-bind/index.js", Function("exports, require, module",
"\n/**\n * Slice reference.\n */\n\nvar slice = [].slice;\n\n/**\n * Bind `obj` to `fn`.\n *\n * @param {Object} obj\n * @param {Function|String} fn or string\n * @return {Function}\n * @api public\n */\n\nmodule.exports = function(obj, fn){\n  if ('string' == typeof fn) fn = obj[fn];\n  if ('function' != typeof fn) throw new Error('bind() requires a function');\n  var args = [].slice.call(arguments, 2);\n  return function(){\n    return fn.apply(obj, args.concat(slice.call(arguments)));\n  }\n};\n//@ sourceURL=component-bind/index.js"
));
require.register("qualiancy-tea-properties/lib/properties.js", Function("exports, require, module",
"/*!\n * goodwin - deep object get/set path values\n * Copyright(c) 2012 Jake Luer <jake@alogicalparadox.com>\n * MIT Licensed\n *\n * @website https://github.com/logicalparadox/goodwin/'\n * @issues https://github.com/logicalparadox/goodwin/issues'\n */\n\n/*!\n * Primary exports\n */\n\nvar exports = module.exports = {};\n\n/**\n * ### .get(obj, path)\n *\n * Retrieve the value in an object given a string path.\n *\n * ```js\n * var obj = {\n *     prop1: {\n *         arr: ['a', 'b', 'c']\n *       , str: 'Hello'\n *     }\n *   , prop2: {\n *         arr: [ { nested: 'Universe' } ]\n *       , str: 'Hello again!'\n *     }\n * };\n * ```\n *\n * The following would be the results.\n *\n * ```js\n * var properties = require('tea-properties');\n * properties.get(obj, 'prop1.str'); // Hello\n * properties.get(obj, 'prop1.att[2]'); // b\n * properties.get(obj, 'prop2.arr[0].nested'); // Universe\n * ```\n *\n * @param {Object} object\n * @param {String} path\n * @return {Object} value or `undefined`\n */\n\nexports.get = function (obj, path) {\n  var parsed = parsePath(path);\n  return getPathValue(parsed, obj);\n};\n\n/**\n * ### .set(path, value, object)\n *\n * Define the value in an object at a given string path.\n *\n * ```js\n * var obj = {\n *     prop1: {\n *         arr: ['a', 'b', 'c']\n *       , str: 'Hello'\n *     }\n *   , prop2: {\n *         arr: [ { nested: 'Universe' } ]\n *       , str: 'Hello again!'\n *     }\n * };\n * ```\n *\n * The following would be acceptable.\n *\n * ```js\n * var properties = require('tea-properties');\n * properties.set(obj, 'prop1.str', 'Hello Universe!');\n * properties.set(obj, 'prop1.arr[2]', 'B');\n * properties.set(obj, 'prop2.arr[0].nested.value', { hello: 'universe' });\n * ```\n *\n * @param {Object} object\n * @param {String} path\n * @param {Mixed} value\n * @api public\n */\n\nexports.set = function (obj, path, val) {\n  var parsed = parsePath(path);\n  setPathValue(parsed, val, obj);\n};\n\nfunction defined (val) {\n  return 'undefined' === typeof val;\n}\n\n/*!\n * Helper function used to parse string object\n * paths. Use in conjunction with `getPathValue`.\n *\n *  var parsed = parsePath('myobject.property.subprop');\n *\n * ### Paths:\n *\n * * Can be as near infinitely deep and nested\n * * Arrays are also valid using the formal `myobject.document[3].property`.\n *\n * @param {String} path\n * @returns {Object} parsed\n */\n\nfunction parsePath (path) {\n  var str = path.replace(/\\[/g, '.[')\n    , parts = str.match(/(\\\\\\.|[^.]+?)+/g);\n\n  return parts.map(function (value) {\n    var re = /\\[(\\d+)\\]$/\n      , mArr = re.exec(value)\n    if (mArr) return { i: parseFloat(mArr[1]) };\n    else return { p: value };\n  });\n};\n\n/*!\n * Companion function for `parsePath` that returns\n * the value located at the parsed address.\n *\n *  var value = getPathValue(parsed, obj);\n *\n * @param {Object} parsed definition from `parsePath`.\n * @param {Object} object to search against\n * @returns {Object|Undefined} value\n */\n\nfunction getPathValue (parsed, obj) {\n  var tmp = obj\n    , res;\n\n  for (var i = 0, l = parsed.length; i < l; i++) {\n    var part = parsed[i];\n    if (tmp) {\n      if (!defined(part.p)) tmp = tmp[part.p];\n      else if (!defined(part.i)) tmp = tmp[part.i];\n      if (i == (l - 1)) res = tmp;\n    } else {\n      res = undefined;\n    }\n  }\n\n  return res;\n};\n\n/*!\n * Companion function for `parsePath` that sets\n * the value located at a parsed address.\n *\n *  setPathValue(parsed, 'value', obj);\n *\n * @param {Object} parsed definition from `parsePath`\n * @param {*} value to use upon set\n * @param {Object} object to search and define on\n * @api private\n */\n\nfunction setPathValue (parsed, val, obj) {\n  var tmp = obj;\n\n  for (var i = 0, l = parsed.length; i < l; i++) {\n    var part = parsed[i];\n    if (!defined(tmp)) {\n      if (i == (l - 1)) {\n        if (!defined(part.p)) tmp[part.p] = val;\n        else if (!defined(part.i)) tmp[part.i] = val;\n      } else {\n        if (!defined(part.p) && tmp[part.p]) tmp = tmp[part.p];\n        else if (!defined(part.i) && tmp[part.i]) tmp = tmp[part.i];\n        else {\n          var next = parsed[i + 1];\n          if (!defined(part.p)) {\n            tmp[part.p] = {};\n            tmp = tmp[part.p];\n          } else if (!defined(part.i)) {\n            tmp[part.i] = [];\n            tmp = tmp[part.i]\n          }\n        }\n      }\n    } else {\n      if (i == (l - 1)) tmp = val;\n      else if (!defined(part.p)) tmp = {};\n      else if (!defined(part.i)) tmp = [];\n    }\n  }\n};\n//@ sourceURL=qualiancy-tea-properties/lib/properties.js"
));
require.register("codeactual-sinon-doublist/index.js", Function("exports, require, module",
"/**\n * Sinon.JS test double mixins.\n *\n * Licensed under MIT.\n * Copyright (c) 2013 David Smith <https://github.com/codeactual/>\n */\n\n/*jshint node:true*/\n'use strict';\n\nvar sinonDoublist = module.exports = function(sinon, test, disableAutoSandbox) {\n  if (typeof test === 'string') {\n    globalInjector[test](sinon, disableAutoSandbox);\n    return;\n  }\n\n  Object.keys(mixin).forEach(function(method) {\n    test[method] = bind(test, mixin[method]);\n  });\n  if (!disableAutoSandbox) {\n    test._createSandbox(sinon);\n  }\n};\n\nvar is = require('is');\nvar bind = require('bind');\nvar properties = require('tea-properties');\nvar setPathValue = properties.set;\nvar getPathValue = properties.get;\nvar mixin = {};\nvar browserEnv = typeof window === 'object';\n\nmixin._createSandbox = function(sinon) {\n  var self = this;\n  this.sandbox = sinon.sandbox.create();\n  this.spy = bind(self.sandbox, this.sandbox.spy);\n  this.stub = bind(self.sandbox, this.sandbox.stub);\n  this.mock = bind(self.sandbox, this.sandbox.mock);\n  this.clock = this.sandbox.useFakeTimers();\n  this.server = this.sandbox.useFakeServer();\n  if (browserEnv) {\n    this.requests = this.server.requests;\n  }\n};\n\nmixin.restoreSandbox = function() {\n  this.sandbox.restore();\n};\n\n/**\n * _doubleMany() wrapper configured for 'spy' type.\n *\n * @param {object} obj Double target object.\n * @param {string|array} methods One or more method names/namespaces.\n *   They do not have to exist, e.g. 'obj' and be {} for convenience.\n * @return {object} Stub(s) indexed by method name.\n */\nmixin.spyMany = function(obj, methods) {\n  // Use call() to propagate the context bound in beforeEach().\n  return mixin._doubleMany.call(this, 'spy', obj, methods);\n};\n\n/**\n * _doubleMany() wrapper configured for 'stub' type.\n *\n * @param {object} obj Double target object.\n * @param {string|array} methods One or more method names/namespaces.\n *   They do not have to exist, e.g. 'obj' and be {} for convenience.\n * @return {object} Stub(s) indexed by method name.\n */\nmixin.stubMany = function(obj, methods) {\n  // Use call() to propagate the context bound in beforeEach().\n  return mixin._doubleMany.call(this, 'stub', obj, methods);\n};\n\n/**\n * withArgs()/returns() convenience wrapper.\n *\n * Example use case: SUT is that lib function foo() calls bar()\n * with expected arguments. But one of the arguments to bar()\n * is the return value of baz(). Use this helper to stub baz()\n * out of the picture, to focus on the foo() and bar() relationship.\n *\n * A baz() example is _.bind().\n *\n * @param {object} config\n *   Required:\n *\n *   {string} method` Stub target method name, ex. 'bind'\n *\n *   Optional:\n *\n *   {object} obj Stub target object, ex. underscore.\n *   {array} args Arguments 'method' expects to receive.\n *   {string|array} spies Stub will return an object with spies given these names.\n *     An alternative to setting an explicit returns.\n *   {mixed} returns Stub returns this value.\n *     An alternative to setting  spies.\n * @return {object}\n *   {function} returnedSpy or {object} returnedSpies Depends on whether spies is a string or array.\n *   {function} <method> The created stub. The property name will match the configured method name.\n *   {object} target Input obj, or {} if 'obj' was null.\n * @throws Error If method not specified.\n */\nmixin.stubWithReturn = function(config) {\n  config = config || {};\n\n  var self = this;\n  var stub;\n  var returns;\n  var isReturnsConfigured = config.hasOwnProperty('returns');\n  var payload = {};\n\n  if (!is.string(config.method) || !config.method.length) {\n    throw new Error('method not specified');\n  }\n\n  // Allow test to avoid creating the config.obj ahead of time.\n  if (config.obj) {\n    stub = this.stubMany(config.obj, config.method)[config.method];\n  } else {\n    config.obj = {};\n    stub = this.stubMany(config.obj, config.method)[config.method];\n  }\n\n  // Detect the need for withArgs().\n  if (is.array(config.args) && config.args.length) {\n    stub = stub.withArgs.apply(stub, config.args);\n  }\n\n  // Create the stub return value. Either a spy itself or hash of them.\n  if (config.spies) {\n    returns = {};\n\n    // 'a.b.c.spy1'\n    if (is.string(config.spies) && /\\./.test(config.spies)) {\n      setPathValue(returns, config.spies, this.spy());\n    } else {\n      var spies = [].concat(config.spies);\n      for (var s = 0; s < spies.length; s++) {\n        setPathValue(returns, spies[s], this.spy());\n      }\n    }\n  } else {\n    if (isReturnsConfigured) {\n      returns = config.returns;\n    } else {\n      returns = this.spy();\n    }\n  }\n  stub.returns(returns);\n\n  if (!isReturnsConfigured) {\n    if (is.Function(returns)) {\n      payload.returnedSpy = returns;\n    } else {\n      payload.returnedSpies = returns;\n    }\n  }\n  payload[config.method] = stub;\n  payload.target = config.obj;\n\n  return payload;\n};\n\n/**\n * Spy/stub one or more methods of an object.\n *\n * @param {string} type 'spy' or 'stub'\n * @param {object} obj Double target object.\n * @param {string|array} methods One or more method names/namespaces.\n *   They do not have to exist, e.g. 'obj' and be {} for convenience.\n * @return {object} Stub(s) indexed by method name.\n */\nmixin._doubleMany = function(type, obj, methods) {\n  var self = this;\n  var doubles = {};\n  methods = [].concat(methods);\n\n  for (var m = 0; m < methods.length; m++) {\n    var method = methods[m];\n\n    // Sinon requires doubling target to exist.\n    if (!getPathValue(obj, method)) {\n      setPathValue(obj, method, sinonDoublistNoOp);\n    }\n\n    if (/\\./.test(method)) { // Ex. 'a.b.c'\n      var lastNsPart = method.split('.').slice(-1);  // Ex. 'c'\n      doubles[method] = self[type](\n        getPathValue(obj, method.split('.').slice(0, -1).join('.')), // Ex. 'a.b'\n        method.split('.').slice(-1)  // Ex. 'c'\n      );\n    } else {\n      doubles[method] = self[type](obj, method);\n    }\n  }\n\n  return doubles;\n};\n\nvar globalInjector = {\n  mocha: function(sinon, disableAutoSandbox) {\n    beforeEach(function(done) {\n      sinonDoublist(sinon, this, disableAutoSandbox);\n      done();\n    });\n\n    afterEach(function(done) {\n      this.sandbox.restore();\n      done();\n    });\n  }\n};\n\nfunction sinonDoublistNoOp() {}\n//@ sourceURL=codeactual-sinon-doublist/index.js"
));
require.register("bdd-flow/index.js", Function("exports, require, module",
"/**\n * Build and run BDD flows with before/after hooks, describe, it\n *\n * Licensed under MIT.\n * Copyright (c) 2013 David Smith <https://github.com/codeactual/>\n */\n\n/*jshint node:true*/\n'use strict';\n\nmodule.exports = {\n  Bddflow: Bddflow,\n  mixin: mixin,\n  require: require // Allow tests to use component-land require.\n};\n\nvar configurable = require('configurable.js');\n\nfunction Bddflow() {\n  this.settings = {\n    nativeRequire: {}\n  };\n}\n\nconfigurable(Bddflow.prototype);\n\n/**\n * Apply collected configuration.\n */\nBddflow.prototype.init = function() {\n  var nativeRequire = this.get('nativeRequire');\n\n  // Store refs to native modules ...\n};\n\n/**\n * Mix the given function set into Bddflow's prototype.\n *\n * @param {object} ext\n */\nfunction mixin(ext) {\n  Object.keys(ext).forEach(function(key) {\n    if (typeof ext[key] === 'function') {\n      Bddflow.prototype[key] = ext[key];\n    }\n  });\n}\n//@ sourceURL=bdd-flow/index.js"
));
require.alias("visionmedia-configurable.js/index.js", "bdd-flow/deps/configurable.js/index.js");

require.alias("codeactual-sinon-doublist/index.js", "bdd-flow/deps/sinon-doublist/index.js");
require.alias("codeactual-is/index.js", "codeactual-sinon-doublist/deps/is/index.js");
require.alias("manuelstofer-each/index.js", "codeactual-is/deps/each/index.js");

require.alias("component-bind/index.js", "codeactual-sinon-doublist/deps/bind/index.js");

require.alias("qualiancy-tea-properties/lib/properties.js", "codeactual-sinon-doublist/deps/tea-properties/lib/properties.js");
require.alias("qualiancy-tea-properties/lib/properties.js", "codeactual-sinon-doublist/deps/tea-properties/index.js");
require.alias("qualiancy-tea-properties/lib/properties.js", "qualiancy-tea-properties/index.js");

if (typeof exports == "object") {
  module.exports = require("bdd-flow");
} else if (typeof define == "function" && define.amd) {
  define(function(){ return require("bdd-flow"); });
} else {
  window["Bddflow"] = require("bdd-flow");
}})();