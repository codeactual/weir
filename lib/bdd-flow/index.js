/**
 * Build and run BDD flows with before/after hooks, describe, it
 *
 * Licensed under MIT.
 * Copyright (c) 2013 David Smith <https://github.com/codeactual/>
 */

/*jshint node:true*/
'use strict';

/**
 * Bddflow constructor.
 */
exports.Bddflow = Bddflow;

/**
 * Create a new Bddflow.
 *
 * @return {object}
 */
exports.create = function() { return new Bddflow(); };

/**
 * Extend Bddflow.prototype.
 *
 * @param {object} ext
 * @return {object} Merge result.
 */
exports.extend = function(ext) { return extend(Bddflow.prototype, ext); };

/**
 * Let tests load component-land modules.
 *
 * @api private
 */
exports.requireComponent = require;

var Batch = require('batch');
var clone = require('clone');
var configurable = require('configurable.js');
var extend = require('extend');

// Match properties that should not be 'inherited' by it(), hooks, etc.
var flowFnRegex = /^(it|describe|before|beforeEach|after|afterEach)$/;
var defOmitContextRegex = {
  all: [/^__conjure__/],
  describe: [],
  hook: [flowFnRegex],
  it: [flowFnRegex],
  rootDescribe: []
};

/**
 * Bddflow constructor.
 *
 * Usage:
 *
 *     var flow = require('bdd-flow').create();
 *     flow.addRootDescribe('subject', function() {
 *       this.it('should do X', function() {
 *         // ...
 *       });
 *     })
 *     .addContextProp('someKey', someVal)
 *     .set('done', function() {
 *       console.log('Run finished.');
 *     })
 *     .run();
 *
 * Configuration:
 *
 * - `{function} done` Callback fired after run finishes
 * - `{function} itWrap` `it()` wrapper from which context can be 'inherited'
 * - `{function} describeWrap` `describe()` wrapper from which context can be 'inherited'
 * - `{object} omitContextRegex` Property name patterns
 *   - Ex. used to omit properties from propagating between `it()` handlers
 *   - Indexed by type: `all`, `describe`, `hook`, `it`, `rootDescribe`
 *   - Values are arrays of `RegExp`.
 * - `{array} path` Names of ancestor describe levels to the currently executing `it()`
 * - `{regexp} grep` Filter `it()` execution by "current path + `it()` name"
 * - `{regexp} grepv` Omit `it()` execution by "current path + `it()` name"
 * - `{object} sharedContext` hook/describe/it context that is 'inherited'
 *
 * Properties:
 *
 * - `{array} rootDescribe` Top-level `Describe` objects
 * - `{object} batch` `Batch` instance used to run collected test steps
 * - `{object} seedProps` Merged into initial hook/describe/it context
 * - `{boolean} running` True after `run()` has been called
 */
function Bddflow() {
  this.settings = {
    done: noOp,

    // Propagate to each new Describe instance:
    itWrap: null,
    describeWrap: null,
    omitContextRegex: clone(defOmitContextRegex),
    path: [],
    grep: /.?/,
    grepv: null,
    sharedContext: {}
  };
  this.rootDescribes = [];
  this.batch = new Batch();
  this.seedProps = {};
  this.running = false;
}

// Bddflow configs propagated to each new `Describe`.
Bddflow.describeConfigKeys = [
  'describeWrap', 'itWrap', 'omitContextRegex', 'path', 'grep', 'grepv', 'sharedContext'
];

configurable(Bddflow.prototype);

/**
 * Add a property to the initial hook/describe/it shared context.
 *
 * @param {string} key
 * @param {mixed} val
 * @return {object} this
 */
Bddflow.prototype.addContextProp = function(key, val) {
  this.seedProps[key] = val;
  return this;
};

/**
 * Add a top-level `describe()`.
 *
 * @param {string} name
 * @param {function} cb
 * @return {object} this
 */
Bddflow.prototype.addRootDescribe = function(name, cb) {
  var self = this;
  var desc = new Describe(name);
  desc.describe(name, cb);
  this.rootDescribes.push(desc);
  return this;
};

/**
 * Prevent a type of flow function from 'inheriting' specific context properties
 * from enclosing/subsequently-executed flow functions.
 *
 * @param {string} type 'it', 'hook'
 * @param {regexp} regex
 * @return {object} this
 */
Bddflow.prototype.hideContextProp = function(type, regex) {
  if (typeof regex === 'string') {
    regex = new RegExp('^' + regex + '$');
  }
  this.get('omitContextRegex')[type].push(regex);
  return this;
};

/**
 * Check if `run()` has been called.
 *
 * @return {boolean}
 */
Bddflow.prototype.isRunning = function() {
  return this.running;
};

/**
 * Run collected `describe()` steps.
 */
Bddflow.prototype.run = function() {
  var self = this;

  this.running = true;

  var batch = new Batch();
  batch.concurrency(1);
  this.set('sharedContext', this.seedProps);
  this.rootDescribes.forEach(function(desc) {
    batch.push(function(taskDone) {
      self.set('path', []);
      Bddflow.describeConfigKeys.forEach(function(key) {
        desc.set(key, self.get(key));
      });
      runSteps(desc.steps, taskDone);
    });
  });
  batch.end(this.get('done'));
};

// Auto-terminating callback for use with `Batch#push`.
Bddflow.defaultHookImpl = function(done) { done(); };

/**
 * HookSet constructor.
 *
 * Container for a `before()`, `beforeEach()`, etc. method set.
 *
 * @api private
 */
function HookSet() {
  this.before = Bddflow.defaultHookImpl;
  this.beforeEach = Bddflow.defaultHookImpl;
  this.after = Bddflow.defaultHookImpl;
  this.afterEach = Bddflow.defaultHookImpl;
}

/**
 * ItCallback constructor.
 *
 * @param {string} name Subject expectation.
 * @param {string} name Test subject.
 * @api private
 */
function ItCallback(name, cb) {
  this.name = name;
  this.cb = cb;
}

/**
 * Describe constructor.
 *
 * Stores its properties, internal hooks, and nested steps (describe/it).
 *
 * @param {string} name Subject expected to exhibit some behavior.
 * @api private
 */
function Describe(name) {
  this.name = name;
  this.steps = [];
  this.hooks = new HookSet();
  this.settings = {};
}

configurable(Describe.prototype);

/**
 * TODO
 *
 * @api private
 */
Describe.prototype.extendSharedContext = function(ext, type) {
  return extend(this.get('sharedContext'), this.filterProps(ext, type));
};

/**
 * TODO
 *
 * @api private
 */
Describe.prototype.filterProps = function(obj, type) {
  var omitContextRegex = this.get('omitContextRegex');
  var regex = omitContextRegex.all.concat(omitContextRegex[type]);
  return Object.keys(obj).reduce(function(memo, key) {
    var omit = false;
    regex.forEach(function(re) {
      omit = omit || re.test(key);
    });
    if (omit) {
      return memo;
    }
    memo[key] = obj[key];
    return memo;
  }, {});
};

/**
 * Filter 'this' into an object with properties that can be 'inherited'
 * between hook/describe/it.
 *
 * Static used in other classes via `call()`. Exposed for test access.
 *
 * @param {string} type 'describe', 'hook', 'it', 'rootDescribe'
 * @return {object}
 * @api private
 */
Describe.prototype.getSharedContext = function(type) {
  return this.filterProps(this.get('sharedContext'), type);
};

/**
 * Add an `it()` step.
 *
 * @param {string} name
 * @param {function} cb `Batch#push` compatible
 * @see Batch https://github.com/visionmedia/batch#api
 */
Describe.prototype.it = function(name, cb) {
  this.steps.push(new ItCallback(name, cb));
};

/**
 * Add a `describe()` step.
 *
 * @param {string} name
 * @param {function} cb `Batch#push` compatible
 * @see Batch https://github.com/visionmedia/batch#api
 */
Describe.prototype.describe = function(name, cb) {
  var self = this;
  var step = function(done) {
    var desc = new Describe(name); // Collect nested steps.
    Bddflow.describeConfigKeys.forEach(function(key) {
      desc.set(key, self.get(key));
    });
    var path = desc.get('path');
    path.push(name);

    var describeWrap = desc.get('describeWrap') || defDescribeWrap;
    describeWrap(name, function() {
      var wrapContext = this || {};
      var mergedContext = desc.extendSharedContext(wrapContext, 'describe');
      mergedContext.describe = desc.describe.bind(desc);
      mergedContext.it = desc.it.bind(desc);
      mergedContext.before = desc.before.bind(desc);
      mergedContext.beforeEach = desc.beforeEach.bind(desc);
      mergedContext.after = desc.after.bind(desc);
      mergedContext.afterEach = desc.afterEach.bind(desc);
      addInternalProp(mergedContext, 'name', name);
      cb.call(mergedContext);
    });

    var batch = new Batch();

    batch.push(function(done) {
      function asyncCb() {
        desc.extendSharedContext(context, 'hook'); // Apply changes.
        done();
      }
      var hook = desc.hooks.before;
      var context = desc.getSharedContext('hook');
      if (hook.length) { // Expects callback arg.
        desc.hooks.before.call(context, asyncCb);
      } else {
        desc.hooks.before.call(context);
        asyncCb();
      }
    });

    batch.push(function(done) { // Wrap hooks around each internal describe()/it()
      desc.steps = desc.steps.map(function(step) {
        if (step instanceof DescribeCallback) {
          var context = desc.getSharedContext('describe');
          return new DescribeCallback(step.name, step.cb.bind(context));
        }

        var itPath = path.concat(step.name);
        var grep = desc.get('grep');
        var grepv = desc.get('grepv');
        if (grepv) {
          if (grepv.test(itPath.join(' '))) {
            return new ItCallback(step.name, batchNoOp);
          }
        } else if (grep) {
          if (!grep.test(itPath.join(' '))) {
            return new ItCallback(step.name, batchNoOp);
          }
        }

        return new ItCallback(step.name, function(done) { // instanceof ItCallback
          var batch = new Batch();
          batch.push(function(done) {
            function asyncCb() {
              desc.extendSharedContext(context, 'hook'); // Apply changes.
              done();
            }
            var hook = desc.hooks.beforeEach;
            var context = desc.getSharedContext('hook');
            if (hook.length) { // Expects callback arg.
              desc.hooks.beforeEach.call(context, asyncCb);
            } else {
              desc.hooks.beforeEach.call(context);
              asyncCb();
            }
          });
          batch.push(function(done) {
            var context = desc.getSharedContext('it');

            function asyncCb() {
              desc.extendSharedContext(context, 'it'); // Apply changes.
              done();
            }

            var itWrap = desc.get('itWrap') || defItWrap;
            itWrap(step.name, function() {
              var wrapContext = this || {};
              extend(context, wrapContext);
              addInternalProp(context, 'name', step.name, true);
              addInternalProp(context, 'path', itPath, true);
              if (step.cb.length) { // Expects callback arg.
                step.cb.call(context, asyncCb);
              } else {
                step.cb.call(context);
                asyncCb();
              }
            });
          });
          batch.push(function(done) {
            function asyncCb() {
              desc.extendSharedContext(context, 'hook'); // Apply changes.
              done();
            }
            var hook = desc.hooks.afterEach;
            var context = desc.getSharedContext('hook');
            if (hook.length) { // Expects callback arg.
              desc.hooks.afterEach.call(context, asyncCb);
            } else {
              desc.hooks.afterEach.call(context);
              asyncCb();
            }
          });
          batch.concurrency(1);
          batch.end(done);
        });
      });

      runSteps(desc.steps, done);
    });

    batch.push(function(done) {
      function asyncCb() {
        desc.extendSharedContext(context, 'hook'); // Apply changes.
        done();
      }
      var hook = desc.hooks.after;
      var context = desc.getSharedContext('hook');
      if (hook.length) { // Expects callback arg.
        desc.hooks.after.call(context, asyncCb);
      } else {
        desc.hooks.after.call(context);
        asyncCb();
      }
    });

    batch.concurrency(1);
    batch.end(done);
  };
  this.steps.push(new DescribeCallback(name, step));
};

/**
 * Run a custom hook before the first `it()` in the current `describe()`.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected.
 *   - Ex. `function(done) { ... done(); }`
 */
Describe.prototype.before = function(cb) { this.hooks.before = cb; };

/**
 * Run a custom hook after to the last `it()` in the current `describe()`.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected.
 *   - Ex. `function(done) { ... done(); }`
 */
Describe.prototype.beforeEach = function(cb) { this.hooks.beforeEach = cb; };

/**
 * Override the default no-op after() hook.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected.
 *   - Ex. `function(done) { ... done(); }`
 */
Describe.prototype.after = function(cb) { this.hooks.after = cb; };

/**
 * Run a custom hook after each `it()` in the current `describe()`.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected.
 *   - Ex. `function(done) { ... done(); }`
 */
Describe.prototype.afterEach = function(cb) { this.hooks.afterEach = cb; };

/**
 * DescribeCallback constructor.
 *
 * @param {string} name Test subject.
 * @param {function} cb
 * @api private
 */
function DescribeCallback(name, cb) {
  this.name = name;
  this.cb = cb;
}

/**
 * Execute an array of functions w/ Batch.
 *
 * @param {array} steps
 * @param {function} cb Called at completion.
 * @param {number} [concurrency=1]
 * @api private
 */
function runSteps(steps, cb) {
  var batch = new Batch();
  batch.concurrency(1);
  steps.forEach(function(step) { batch.push(step.cb); });
  batch.end(cb);
}

function noOp() {}
function batchNoOp(taskDone) { taskDone(); }

// Default wrappers that inject no new context properties.
function defItWrap(name, cb) { cb(); }
function defDescribeWrap(name, cb) { cb(); }

function delInternalProp(obj, key) {
  delete obj['__conjure__' + key];
}

function addInternalProp(obj, key, val, writable) {
  Object.defineProperty(
    obj, '__conjure__' + key,
    {value: val, enumerable: false, configurable: true, writable: !!writable}
  );
}
