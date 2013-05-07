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
var bind = require('bind');
var clone = require('clone');
var configurable = require('configurable.js');
var emitter = require('emitter');
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
 *   - Receives: (`name`, `cb`)
 *   - Or for auto-detected async, receives: (`name`, `cb`, `done`)
 * - `{function} describeWrap` `describe()` wrapper from which context can be 'inherited'
 *   - Receives: (`name`, `cb`)
 * - `{object} omitContextRegex` Property name patterns
 *   - Ex. used to omit properties from propagating between `it()` handlers
 *   - Indexed by type: `all`, `describe`, `hook`, `it`, `rootDescribe`
 *   - Values are arrays of `RegExp`.
 * - `{array} path` Names of ancestor describe levels to the currently executing `it()`
 * - `{regexp} grep` Filter `it()` execution by "current path + `it()` name"
 * - `{regexp} grepv` Omit `it()` execution by "current path + `it()` name"
 * - `{object} sharedContext` hook/describe/it context that is 'inherited'
 * - `{object} stats`
 *   - `{number} depth` Current stack depth during test run
 *
 * Properties:
 *
 * - `{array} rootDescribe` Top-level `Describe` objects
 * - `{object} batch` `Batch` instance used to run collected test steps
 * - `{object} seedProps` Merged into initial hook/describe/it context
 *
 * Inherits:
 *
 * - `emitter` component
 *
 * Emits events:
 *
 * - `describePush` About to start running its collected steps
 *   - `{string} name`
 * - `describePop` Finished its collected steps, including nested `describe()`
 *   - `{string} name`
 * - `itPush` About to start running its callback
 *   - `{string} name`
 * - `itPop` Its callback finished
 *   - `{string} name`
 *
 * @see emitter https://github.com/component/emitter
 */
function Bddflow() {
  this.settings = {
    done: bddflowNoOp,

    // Propagate to each new Describe instance:
    itWrap: null,
    describeWrap: null,
    omitContextRegex: clone(defOmitContextRegex),
    path: [],
    grep: /.?/,
    grepv: null,
    sharedContext: {},
    stats: {depth: 0},
    emit: bind(this, this.emit)
  };
  this.rootDescribes = [];
  this.batch = new Batch();
  this.seedProps = {};
}

// Bddflow configs propagated to each new `Describe`.
Bddflow.describeConfigKeys = [
  'describeWrap', 'emit', 'itWrap', 'omitContextRegex', 'path', 'grep', 'grepv',
  'sharedContext', 'stats'
];

configurable(Bddflow.prototype);
emitter(Bddflow.prototype);

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
 * Get the current stack depth.
 *
 * @return {number}
 * - `0` = every root `describe()`
 * - Each deeper `describe()` is 1 more than its parent `describe()`.
 * - Each `it()` is 1 more than its parent `describe()`.
 */
Bddflow.prototype.currentDepth = function() {
  return this.get('stats').depth;
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
 * Run collected `describe()` steps.
 */
Bddflow.prototype.run = function() {
  var self = this;

  var batch = new Batch();
  batch.concurrency(1);
  this.set('sharedContext', this.seedProps);
  this.rootDescribes.forEach(function bddflowEachRootDescribe(desc) {
    batch.push(function bddflowBatchPushRootDescribe(taskDone) {
      self.set('path', []);
      Bddflow.describeConfigKeys.forEach(function bddflowForEachConfigKey(key) {
        desc.set(key, self.get(key));
      });
      bddflowRunStepsInBatch(desc.steps, taskDone);
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
 * Add properties to the context shared by hooks/describe/it.
 *
 * Properties will be filtered based on `type`.
 *
 * @param {object} ext
 * @param {string} type 'describe', 'hook', 'it', 'rootDescribe'
 * @api private
 */
Describe.prototype.extendSharedContext = function(ext, type) {
  return extend(this.get('sharedContext'), this.filterProps(ext, type));
};

/**
 * Use regex stored in `omitContextRegex` to filter properties (from the
 * context shared by hooks/describe/it) based on name.
 *
 * @param {object} obj
 * @param {string} type 'describe', 'hook', 'it', 'rootDescribe'
 * @return {object} Filtered `obj`
 * @api private
 */
Describe.prototype.filterProps = function(obj, type) {
  var omitContextRegex = this.get('omitContextRegex');
  var regex = omitContextRegex.all.concat(omitContextRegex[type]);
  return Object.keys(obj).reduce(function bddflowReduceFilterProps(memo, key) {
    var omit = false;
    regex.forEach(function bddflowForEachFilterPropsRegex(re) {
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

  // This function is executed inside bddflowRunStepsInBatch().
  var step = function(done) {
    var desc = new Describe(name); // Collect nested steps.
    Bddflow.describeConfigKeys.forEach(function bddflowForEachConfigKey(key) {
      desc.set(key, self.get(key));
    });
    var path = desc.get('path');
    path.push(name);

    var describeWrap = desc.get('describeWrap') || bddflowDefDescribeWrap;
    describeWrap(name, function bddflowDescribeWrap() {
      var wrapContext = this || {};
      var mergedContext = desc.extendSharedContext(wrapContext, 'describe');
      mergedContext.describe = bind(desc, desc.describe);
      mergedContext.it = bind(desc, desc.it);
      mergedContext.before = bind(desc, desc.before);
      mergedContext.beforeEach = bind(desc, desc.beforeEach);
      mergedContext.after = bind(desc, desc.after);
      mergedContext.afterEach = bind(desc, desc.afterEach);
      bddflowAddInternalProp(mergedContext, 'name', name);
      cb.call(mergedContext);
    });

    desc.pushStep();

    var batch = new Batch();

    batch.push(desc.createBeforeTask());

    batch.push(function bddflowBatchPushItOrDescribe(done) { // Wrap hooks around each internal describe()/it()
      desc.steps = desc.steps.map(function bddflowMapDescribeSteps(step) {
        // Don't wrap nested `describe()` in a hook set.
        if (step instanceof DescribeCallback) {
          var context = desc.getSharedContext('describe');
          return new DescribeCallback(step.name, bind(context, step.cb));
        }

        var itPath = path.concat(step.name);
        var grep = desc.get('grep');
        var grepv = desc.get('grepv');
        if (grepv) {
          if (grepv.test(itPath.join(' '))) {
            return new ItCallback(step.name, bddflowBatchNoOp);
          }
        } else if (grep) {
          if (!grep.test(itPath.join(' '))) {
            return new ItCallback(step.name, bddflowBatchNoOp);
          }
        }

        return new ItCallback(step.name, function bddflowItCallback(done) { // instanceof ItCallback
          var batch = new Batch();
          batch.push(desc.createBeforeEachTask());
          batch.push(function bddflowBatchPushIt(done) {
            var context = desc.getSharedContext('it');
            var emit = desc.get('emit');

            function asyncCb() {
              desc.extendSharedContext(context, 'it'); // Apply changes.
              emit('itPop', step.name);
              done();
            }

            var itWrap = desc.get('itWrap') || bddflowDefItWrap;
            if (itWrap.length == 3) { // it() wrapper will trigger next step
              itWrap(step.name, function bddflowItWrapAsync() {
                var wrapContext = this || {};
                extend(context, wrapContext);
                bddflowAddInternalProp(context, 'name', step.name, true);
                bddflowAddInternalProp(context, 'path', itPath, true);
                emit('itPush', step.name);
                step.cb.call(context);
              }, asyncCb);
            } else {
              itWrap(step.name, function bddflowItWrap() {
                var wrapContext = this || {};
                extend(context, wrapContext);
                bddflowAddInternalProp(context, 'name', step.name, true);
                bddflowAddInternalProp(context, 'path', itPath, true);
                emit('itPush', step.name);
                if (step.cb.length) { // Expects callback arg.
                  step.cb.call(context, asyncCb);
                } else {
                  step.cb.call(context);
                  asyncCb();
                }
              });
            }
          });
          batch.push(desc.createAfterEachTask());
          batch.concurrency(1);
          batch.end(done);
        });
      });

      bddflowRunStepsInBatch(desc.steps, done);
    });

    batch.push(desc.createAfterTask());

    batch.concurrency(1);
    batch.end(function bddflowEndDescribeBatch() {
      desc.popStep();
      done();
    });
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
 * Execute `before` hook as a `Batch` task.
 *
 * @return {function} `Batch#push` compatible
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.createBeforeTask = function() {
  var self = this;
  return function bddflowExecBeforePushTask(taskDone) {
    function bddflowExecBeforeDone() {
      self.extendSharedContext(context, 'hook'); // Apply changes.
      taskDone();
    }

    var hook = self.hooks.before;
    var context = self.getSharedContext('hook');

    if (hook.length) { // Expects callback arg.
      self.hooks.before.call(context, bddflowExecBeforeDone);
    } else {
      self.hooks.before.call(context);
      bddflowExecBeforeDone();
    }
  };
};

/**
 * Run a custom hook after to the last `it()` in the current `describe()`.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected.
 *   - Ex. `function(done) { ... done(); }`
 */
Describe.prototype.beforeEach = function(cb) { this.hooks.beforeEach = cb; };

/**
 * Execute `beforeEach` hook as a `Batch` task.
 *
 * @return {function} `Batch#push` compatible
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.createBeforeEachTask = function() {
  var self = this;
  return function bddflowExecBeforeEachPushTask(taskDone) {
    function bddflowExecBeforeEachDone() {
      self.extendSharedContext(context, 'hook'); // Apply changes.
      taskDone();
    }
    var hook = self.hooks.beforeEach;
    var context = self.getSharedContext('hook');
    if (hook.length) { // Expects callback arg.
      self.hooks.beforeEach.call(context, bddflowExecBeforeEachDone);
    } else {
      self.hooks.beforeEach.call(context);
      bddflowExecBeforeEachDone();
    }
  };
};

/**
 * Override the default no-op after() hook.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected.
 *   - Ex. `function(done) { ... done(); }`
 */
Describe.prototype.after = function(cb) { this.hooks.after = cb; };

/**
 * Execute `after` hook as a `Batch` task.
 *
 * @return {function} `Batch#push` compatible
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.createAfterTask = function() {
  var self = this;
  return function bddflowExecAfterPushTask(taskDone) {
    function bddflowExecAfterDone() {
      self.extendSharedContext(context, 'hook'); // Apply changes.
      taskDone();
    }
    var hook = self.hooks.after;
    var context = self.getSharedContext('hook');
    if (hook.length) { // Expects callback arg.
      self.hooks.after.call(context, bddflowExecAfterDone);
    } else {
      self.hooks.after.call(context);
      bddflowExecAfterDone();
    }
  };
};

/**
 * Run a custom hook after each `it()` in the current `describe()`.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected.
 *   - Ex. `function(done) { ... done(); }`
 */
Describe.prototype.afterEach = function(cb) { this.hooks.afterEach = cb; };

/**
 * Execute `afterEach` hook as a `Batch` task.
 *
 * @return {function} `Batch#push` compatible
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.createAfterEachTask = function() {
  var self = this;
  return function bddflowExecAfterEachPushTask(taskDone) {
    function bddflowExecAfterEachDone() {
      self.extendSharedContext(context, 'hook'); // Apply changes.
      taskDone();
    }
    var hook = self.hooks.afterEach;
    var context = self.getSharedContext('hook');
    if (hook.length) { // Expects callback arg.
      self.hooks.afterEach.call(context, bddflowExecAfterEachDone);
    } else {
      self.hooks.afterEach.call(context);
      bddflowExecAfterEachDone();
    }
  };
};

/**
 * Update stack depth stats.
 *
 * - Depth is increased by 1 before a `describe()` executes its collected steps.
 * - Ex. all hooks and `it()` cases share the same (post-increment) depth.
 *
 * @api private
 */
Describe.prototype.pushStep = function() {
  var emit = this.get('emit');
  var stats = this.get('stats');
  stats.depth++;
  this.set('stats', stats);
  emit('describePush', this.name);
};

/**
 * Update stack depth stats.
 *
 * - Depth is decreased by 1 after a `describe()` executes its collected steps.
 *
 * @api private
 */
Describe.prototype.popStep = function() {
  var emit = this.get('emit');
  var stats = this.get('stats');
  stats.depth--;
  this.set('stats', stats);
  emit('describePop', this.name);
};

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
function bddflowRunStepsInBatch(steps, cb) {
  var batch = new Batch();
  batch.concurrency(1);
  steps.forEach(function bddflowForEachStep(step) { batch.push(step.cb); });
  batch.end(cb);
}

function bddflowNoOp() {}
function bddflowBatchNoOp(taskDone) { taskDone(); }

// Default wrappers that inject no new context properties.
function bddflowDefItWrap(name, cb) { cb(); }
function bddflowDefDescribeWrap(name, cb) { cb(); }

function bddflowDelInternalProp(obj, key) {
  delete obj['__conjure__' + key];
}

function bddflowAddInternalProp(obj, key, val, writable) {
  Object.defineProperty(
    obj, '__conjure__' + key,
    {value: val, enumerable: false, configurable: true, writable: !!writable}
  );
}
