/**
 * Library for creating BDD-style test flows for JavaScript
 *
 * Licensed under MIT.
 * Copyright (c) 2013 David Smith <https://github.com/codeactual/>
 */

/*jshint node:true*/
'use strict';

/**
 * Weir constructor.
 */
exports.Weir = Weir;

/**
 * Create a new Weir.
 *
 * @return {object}
 */
exports.create = function() { return new Weir(); };

/**
 * Extend Weir.prototype.
 *
 * @param {object} ext
 * @return {object} Merge result.
 */
exports.extend = function(ext) { return extend(Weir.prototype, ext); };

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

// Match properties that should not be shared by it(), hooks, etc.
var flowFnRegex = /^(it|describe|before|beforeEach|after|afterEach)$/;
var defOmitContextRegex = {
  all: [/^__conjure__/],
  describe: [],
  hook: [flowFnRegex],
  it: [flowFnRegex],
  rootDescribe: []
};

/**
 * Weir constructor.
 *
 * Usage:
 *
 *     var flow = require('weir').create();
 *     flow
 *       .addRootDescribe('subject', function() {
 *         this.it('should do X', function() {
 *         // ...
 *         });
 *       })
 *       .addContextProp('someKey', someVal)
 *       .set('done', function() {
 *         console.log('Run finished.');
 *       })
 *       .run();
 *
 * Configuration:
 *
 * - `{function} done` Callback fired after run finishes
 * - `{function} itWrap` `it()` wrapper from which context can be shared
 * - `{function} describeWrap` `describe()` wrapper from which context can be shared
 * - `{object} omitContextRegex` Property name patterns
 *   - Ex. used to omit properties from propagating between `it()` handlers
 *   - Indexed by type: `all`, `describe`, `hook`, `it`, `rootDescribe`
 *   - Values are arrays of `RegExp`.
 * - `{array} path` Names of ancestor describe levels to the currently executing `it()`
 * - `{regexp} grep` Filter `it()` execution by `current path + it() name`
 * - `{regexp} grepv` Omit `it()` execution by `current path + it() name`
 * - `{object} sharedContext` Shared `this` updated after each hook/describe/it execution
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
 * @see [Events, context injection wrappers, etc.](examples.md)
 * @see Batch https://github.com/visionmedia/batch#api
 * @see emitter https://github.com/component/emitter
 */
function Weir() {
  this.settings = {
    done: weirNoOp,

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

// Weir configs propagated to each new `Describe`.
Weir.describeConfigKeys = [
  'describeWrap', 'emit', 'itWrap', 'omitContextRegex', 'path', 'grep', 'grepv',
  'sharedContext', 'stats'
];

configurable(Weir.prototype);
emitter(Weir.prototype);

/**
 * Add a property to the initial hook/describe/it shared context.
 *
 * @param {string} key
 * @param {mixed} val
 * @return {object} this
 */
Weir.prototype.addContextProp = function(key, val) {
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
Weir.prototype.addRootDescribe = function(name, cb) {
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
Weir.prototype.currentDepth = function() {
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
Weir.prototype.hideContextProp = function(type, regex) {
  if (typeof regex === 'string') {
    regex = new RegExp('^' + regex + '$');
  }
  this.get('omitContextRegex')[type].push(regex);
  return this;
};

/**
 * Run collected `describe()` steps.
 *
 * @see Batch https://github.com/visionmedia/batch#api
 */
Weir.prototype.run = function() {
  var self = this;

  var batch = new Batch();
  batch.concurrency(1);
  this.set('sharedContext', this.seedProps);
  this.rootDescribes.forEach(function weirEachRootDescribe(desc) {
    batch.push(function weirBatchPushRootDescribe(taskDone) {
      self.set('path', []);
      Weir.describeConfigKeys.forEach(function weirForEachConfigKey(key) {
        desc.set(key, self.get(key));
      });
      weirRunStepsInBatch(desc.steps, taskDone);
    });
  });
  batch.end(this.get('done'));
};

// Auto-terminating callback for use with `Batch#push`.
Weir.defaultHookImpl = function(done) { done(); };

/**
 * HookSet constructor.
 *
 * Container for a `before()`, `beforeEach()`, etc. method set.
 *
 * @api private
 */
function HookSet() {
  this.before = Weir.defaultHookImpl;
  this.beforeEach = Weir.defaultHookImpl;
  this.after = Weir.defaultHookImpl;
  this.afterEach = Weir.defaultHookImpl;
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
 * Copy configs from one Describe instance to another.
 *
 * - Ex. proapgate shared context between parent and child `describe()`.
 *
 * @param {object} src
 * @param {object} dest
 * @see Describe.prototype.createStep
 * @api private
 */
Describe.copyConfig = function(src, dest) {
  Weir.describeConfigKeys.forEach(function weirDescribeCopyConfigIter(key) {
    dest.set(key, src.get(key));
  });
};

/**
 * Wrap the function passed to `describe()` for execution in the `steps` batch.
 *
 * Part of the support for nesting comes from creating a new Describe instance
 * for the function passed to `describe()`, creating a `Batch` for its own
 * internal hook/describe/it steps, and returning a function consumable by
 * the current Describe instance's own `Batch`.
 *
 * @param {string} name From `describe()` call
 * @param {function} cb From `describe()` call
 * @return {function} `Batch#push` compatible
 * @see Describe.prototype.describe
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.createStep = function(name, cb) {
  var self = this;
  return function(taskDone) {
    var desc = new Describe(name);
    Describe.copyConfig(self, desc);

    desc.runStep(name, cb); // Run `cb` and collect its own nested steps

    var batch = new Batch(); // Execute collected steps
    batch.concurrency(1);
    batch.push(bind(desc, desc.beforeTask));
    batch.push(function weirRunNestedDescribeSteps(done) {
      desc.steps = desc.steps.map(bind(desc, desc.prepareSteps));
      weirRunStepsInBatch(desc.steps, done);
    });
    batch.push(bind(desc, desc.afterTask));
    batch.end(function weirEndDescribeBatch() {
      desc.popStep();
      taskDone();
    });
  };
};

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
  return Object.keys(obj).reduce(function weirReduceFilterProps(memo, key) {
    var omit = false;
    regex.forEach(function weirForEachFilterPropsRegex(re) {
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
 * Filter 'this' into an object with properties that can be shared
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
 * Perform last-minute changes to each `it()` and nested `describe().
 *
 * @api private
 */
Describe.prototype.prepareSteps = function(step) {
  var self = this;
  var path = this.get('path');

  /**
   * Nested `describe()`:
   *
   * - Don't wrap nested `describe()` in a hook set.
   * - Inject the shared context.
   */
  if (step instanceof DescribeCallback) {
    var context = this.getSharedContext('describe');
    return new DescribeCallback(step.name, bind(context, step.cb));
  }

  /**
   * `it()`
   */

  // If the name does not pass the grep/grepv check, convert it to a no-op.
  var itPath = path.concat(step.name);
  var grep = this.get('grep');
  var grepv = this.get('grepv');
  if (grepv) {
    if (grepv.test(itPath.join(' '))) {
      return new ItCallback(step.name, weirBatchNoOp);
    }
  } else if (grep) {
    if (!grep.test(itPath.join(' '))) {
      return new ItCallback(step.name, weirBatchNoOp);
    }
  }

  // Schedule hooks to run before/after.
  return new ItCallback(step.name, function weirItCallback(done) {
    var batch = new Batch();
    batch.push(bind(self, self.beforeEachTask));
    batch.push(bind(self, self.itTask, step, itPath));
    batch.push(bind(self, self.afterEachTask));
    batch.concurrency(1);
    batch.end(done);
  });
};

/**
 * Run the function provided to Describe.prototype.describe.
 *
 * @param {string} name From `describe()` call
 * @param {function} cb From `describe()` call
 * @api private
 */
Describe.prototype.runStep = function(name, cb) {
  var self = this;

  var path = this.get('path');
  path.push(name);

  var describeWrap = this.get('describeWrap') || weirDefDescribeWrap;
  describeWrap(name, function weirDescribeWrap() {
    // Extend the function's context from the configurable `describeWrap` callback.
    var wrapContext = this || {};
    var mergedContext = self.extendSharedContext(wrapContext, 'describe');

    // Add ability to define nested hook/describe/it steps.
    mergedContext.describe = bind(self, self.describe);
    mergedContext.it = bind(self, self.it);
    mergedContext.before = bind(self, self.before);
    mergedContext.beforeEach = bind(self, self.beforeEach);
    mergedContext.after = bind(self, self.after);
    mergedContext.afterEach = bind(self, self.afterEach);

    weirAddInternalProp(mergedContext, 'name', name);

    cb.call(mergedContext);
    self.pushStep();
  });
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
  this.steps.push(new DescribeCallback(name, this.createStep(name, cb)));
};

/**
 * Run a custom hook before the first `it()` in the current `describe()`.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected: `function(done) { ... done(); }`
 */
Describe.prototype.before = function(cb) { this.hooks.before = cb; };

/**
 * Execute `before` as a `Batch` task.
 *
 * @param {function} taskDone From `Batch#push`
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.beforeTask = function(taskDone) {
  var self = this;
  var hook = this.hooks.before;
  var context = this.getSharedContext('hook');

  function weirBeforeDone() {
    self.extendSharedContext(context, 'hook'); // Apply changes.
    taskDone();
  }

  if (hook.length) { // Expects callback arg.
    this.hooks.before.call(context, weirBeforeDone);
  } else {
    this.hooks.before.call(context);
    weirBeforeDone();
  }
};

/**
 * Run a custom hook before each `it()` in the current `describe()`.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected: `function(done) { ... done(); }`
 */
Describe.prototype.beforeEach = function(cb) { this.hooks.beforeEach = cb; };

/**
 * Execute `beforeEach` as a `Batch` task.
 *
 * @param {function} taskDone From `Batch#push`
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.beforeEachTask = function(taskDone) {
  var self = this;
  var hook = this.hooks.beforeEach;
  var context = this.getSharedContext('hook');

  function weirBeforeEachDone() {
    self.extendSharedContext(context, 'hook'); // Apply changes.
    taskDone();
  }

  if (hook.length) { // Expects callback arg.
    this.hooks.beforeEach.call(context, weirBeforeEachDone);
  } else {
    this.hooks.beforeEach.call(context);
    weirBeforeEachDone();
  }
};

/**
 * Run a custom hook after the last `it()` in the current `describe()`.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected: `function(done) { ... done(); }`
 */
Describe.prototype.after = function(cb) { this.hooks.after = cb; };

/**
 * Execute `after` as a `Batch` task.
 *
 * @param {function} taskDone From `Batch#push`
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.afterTask = function(taskDone) {
  var self = this;
  var hook = this.hooks.after;
  var context = this.getSharedContext('hook');

  function weirAfterDone() {
    self.extendSharedContext(context, 'hook'); // Apply changes.
    taskDone();
  }

  if (hook.length) { // Expects callback arg.
    this.hooks.after.call(context, weirAfterDone);
  } else {
    this.hooks.after.call(context);
    weirAfterDone();
  }
};

/**
 * Run a custom hook after each `it()` in the current `describe()`.
 *
 * @param {function} cb
 * - Async-mode is optional and auto-detected: `function(done) { ... done(); }`
 */
Describe.prototype.afterEach = function(cb) { this.hooks.afterEach = cb; };

/**
 * Execute `afterEach` as a `Batch` task.
 *
 * @param {function} taskDone From `Batch#push`
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.afterEachTask = function(taskDone) {
  var self = this;
  var hook = this.hooks.afterEach;
  var context = this.getSharedContext('hook');

  function weirAfterEachDone() {
    self.extendSharedContext(context, 'hook'); // Apply changes.
    taskDone();
  }

  if (hook.length) { // Expects callback arg.
    this.hooks.afterEach.call(context, weirAfterEachDone);
  } else {
    this.hooks.afterEach.call(context);
    weirAfterEachDone();
  }
};

/**
 * Execute an `it()` step as a `Batch` task.
 *
 * @param {object} step ItCallback or DescribeCallback instance
 * @param {string} path Execution path leading to this `it`()
 * - Space-delimited names of describe/it steps (same string used for grep/grepv)
 * @param {function} taskDone From `Batch#push`
 * @see Batch https://github.com/visionmedia/batch#api
 * @api private
 */
Describe.prototype.itTask = function(step, path, taskDone) {
  var self = this;
  var context = this.getSharedContext('it');
  var emit = this.get('emit');
  var itWrap = this.get('itWrap') || weirDefItWrap;

  function weirItDone() {
    self.extendSharedContext(context, 'it'); // Apply changes.
    emit('itPop', step.name);
    taskDone();
  }

  if (itWrap.length == 3) { // it() wrapper will trigger next step
    itWrap(step.name, function weirItWrapAsync() {
      var wrapContext = this || {};
      extend(context, wrapContext);
      weirAddInternalProp(context, 'name', step.name, true);
      weirAddInternalProp(context, 'path', path, true);
      emit('itPush', step.name);
      step.cb.call(context);
    }, weirItDone);
  } else {
    itWrap(step.name, function weirItWrap() {
      var wrapContext = this || {};
      extend(context, wrapContext);
      weirAddInternalProp(context, 'name', step.name, true);
      weirAddInternalProp(context, 'path', path, true);
      emit('itPush', step.name);
      if (step.cb.length) { // Expects callback arg.
        step.cb.call(context, weirItDone);
      } else {
        step.cb.call(context);
        weirItDone();
      }
    });
  }
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
function weirRunStepsInBatch(steps, cb) {
  var batch = new Batch();
  batch.concurrency(1);
  steps.forEach(function weirForEachStep(step) { batch.push(step.cb); });
  batch.end(cb);
}

function weirNoOp() {}
function weirBatchNoOp(taskDone) { taskDone(); }

// Default wrappers that inject no new context properties.
function weirDefItWrap(name, cb) { cb(); }
function weirDefDescribeWrap(name, cb) { cb(); }

/**
 * Remove a test/debug-only property.
 *
 * @param {object} obj
 * @param {string} key
 * @api private
 */
function weirDelInternalProp(obj, key) {
  delete obj['__conjure__' + key];
}

/**
 * Add a test/debug-only property.
 *
 * @param {object} obj
 * @param {string} key
 * @param {mixed} val
 * @param {boolean} [writable=false]
 * @api private
 */
function weirAddInternalProp(obj, key, val, writable) {
  Object.defineProperty(
    obj, '__conjure__' + key,
    {value: val, enumerable: false, configurable: true, writable: !!writable}
  );
}
