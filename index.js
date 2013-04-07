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
  create: create,
  require: require // Allow tests to use component-land require.
};

var Batch = require('batch');
var bind = require('bind');
var clone = require('clone');
var configurable = require('configurable.js');
var extend = require('extend');

// Match properties that should not be 'inherited' by it(), hooks, etc.
var defOmitContextRegex = {
  all: [/^__conjure__/],
  describe: [],
  hook: [/^(it|describe|before|beforeEach|after|afterEach)$/],
  it: [/^(it|describe|before|beforeEach|after|afterEach)$/],
  rootDescribe: []
};

function create() { return new Bddflow(); }

var sharedContext;

/**
 * Flow configuration and execution.
 */
function Bddflow() {
  this.settings = {
    done: noOp, // Batch#end callback that fires after flow completes.

    // Propagate to each new Describe instance:
    itWrap: null,
    describeWrap: null,
    omitContextRegex: clone(defOmitContextRegex),
    path: [], // Names of ancestor describe levels to the currently executing it().
    grep: /.?/, // Filters it() execution by "current path + it() name".
    grepv: null // Omits it() execution by "current path + it() name".
  };
  this.rootDescribes = [];
  this.batch = new Batch();
  this.seedProps = {}; // Will me merged into initial hook/describe/it context.
  this.running = false;
}

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
 * Add a top-level describe().
 *
 * @param {string} name
 * @param {function} cb
 */
Bddflow.prototype.addRootDescribe = function(name, cb) {
  var self = this;
  var desc = new Describe(name);
  desc.set('bddFlow', this);
  desc.describe(name, cb, true);
  this.rootDescribes.push(desc);
  return this;
};

Bddflow.prototype.filterProps = function(obj, type) {
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
 * between hooks/describe/it.
 *
 * Static used in other classes via call(). Exposed for test access.
 *
 * @param {string} type 'describe', 'hook', 'it', 'rootDescribe'
 * @return {object}
 */
Bddflow.prototype.getSharedContext = function(type) {
  return this.filterProps(sharedContext, type);
};

/**
 * Prevent a type of flow function from 'inheriting' specific context properties
 * from enclosing/subsequently-executed flow functions.
 *
 * @param {string} 'it', 'hook'
 * @param {object} RegExp instance.
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
 * Check if run() has been called.
 *
 * @return {boolean}
 */
Bddflow.prototype.isRunning = function() {
  return this.running;
};

/**
 * Run collected describe() layers.
 */
Bddflow.prototype.run = function() {
  var self = this;

  this.running = true;

  var batch = new Batch();
  batch.concurrency = 1;
  sharedContext = clone(this.seedProps);
  this.rootDescribes.forEach(function(desc) {
    batch.push(function(taskDone) {
      runSteps(desc.steps, function() {
        taskDone();
      });
    });
  });
  batch.end(this.get('done'));
};

// Auto-terminating callback for use with Batch#push.
Bddflow.defaultHookImpl = function(done) { done(); };

/**
 * Container for a before(), beforeEach(), etc. method set.
 */
function HookSet() {
  this.before = Bddflow.defaultHookImpl;
  this.beforeEach = Bddflow.defaultHookImpl;
  this.after = Bddflow.defaultHookImpl;
  this.afterEach = Bddflow.defaultHookImpl;
}

/**
 * @param {string} name Subject expectation.
 * @param {string} name Test subject.
 */
function ItCallback(name, cb) {
  this.name = name;
  this.cb = cb;
}

/**
 * A describe()'s properties, internal hooks, and nested steps (describe/it).
 *
 * @param {string} name Subject expected to exhibit some behavior.
 */
function Describe(name) {
  this.name = name;
  this.steps = [];
  this.hooks = new HookSet();
  this.settings = {
    bddFlow: {}
  };
}
configurable(Describe.prototype);

/**
 * Add an it() step.
 *
 * @param {string} name
 * @param {function} cb Batch#push compat.
 */
Describe.prototype.it = function(name, cb) {
  this.steps.push(new ItCallback(name, cb));
};

/**
 * Add a describe() step.
 *
 * @param {string} name
 * @param {function} cb Batch#push compat.
 */
Describe.prototype.describe = function(name, cb, isRoot) {
  var self = this;
  var step = function(done) {
    var desc = new Describe(name); // Collect nested steps.
    var bddFlow = self.get('bddFlow');
    var path = bddFlow.get('path');
    path.push(name);
    desc.set('bddFlow', bddFlow);

    var describeWrap = bddFlow.get('describeWrap') || defDescribeWrap;
    describeWrap(name, function() {
      var wrapContext = this;
      var mergedContext = extend(
        sharedContext,
        wrapContext
      );
      mergedContext.describe = bind(desc, 'describe');
      mergedContext.it = bind(desc, 'it');
      mergedContext.before = bind(desc, 'before');
      mergedContext.beforeEach = bind(desc, 'beforeEach');
      mergedContext.after = bind(desc, 'after');
      mergedContext.afterEach = bind(desc, 'afterEach');
      addInternalProp(mergedContext, 'name', name);
      cb.call(mergedContext);
    });

    var batch = new Batch();

    batch.push(function(done) {
      function asyncCb() {
        extend(sharedContext, bddFlow.filterProps(context, 'hook')); // Apply any changes.
        done();
      }
      var hook = desc.hooks.before;
      var context = bddFlow.getSharedContext('hook');
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
          var context = bddFlow.getSharedContext('describe');
          return new DescribeCallback(step.name, bind(context, step.cb));
        }

        var itPath = path.concat(step.name);
        var grep = bddFlow.get('grep');
        var grepv = bddFlow.get('grepv');
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
              extend(sharedContext, bddFlow.filterProps(context, 'it')); // Apply any changes.
              done();
            }
            var hook = desc.hooks.beforeEach;
            var context = bddFlow.getSharedContext('hook');
            if (hook.length) { // Expects callback arg.
              desc.hooks.beforeEach.call(context, asyncCb);
            } else {
              desc.hooks.beforeEach.call(context);
              asyncCb();
            }
          });
          batch.push(function(done) {
            var context = bddFlow.getSharedContext('it');

            function asyncCb() {
              extend(sharedContext, bddFlow.filterProps(context, 'it')); // Apply any changes.
              done();
            }

            var itWrap = bddFlow.get('itWrap') || defItWrap;
            itWrap(step.name, function() {
              var wrapContext = this;
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
              extend(sharedContext, bddFlow.filterProps(context, 'hook')); // Apply any changes.
              done();
            }
            var hook = desc.hooks.afterEach;
            var context = bddFlow.getSharedContext('hook');
            if (hook.length) { // Expects callback arg.
              desc.hooks.afterEach.call(context, asyncCb);
            } else {
              desc.hooks.afterEach.call(context);
              asyncCb();
            }
          });
          batch.concurrency = 1;
          batch.end(done);
        });
      });

      runSteps(desc.steps, done);
    });

    batch.push(function(done) {
      function asyncCb() {
        extend(sharedContext, bddFlow.filterProps(context, 'hook')); // Apply any changes.
        done();
      }
      var hook = desc.hooks.after;
      var context = bddFlow.getSharedContext('hook');
      if (hook.length) { // Expects callback arg.
        desc.hooks.after.call(context, asyncCb);
      } else {
        desc.hooks.after.call(context);
        asyncCb();
      }
    });

    batch.concurrency = 1;
    batch.end(done);
  };
  this.steps.push(new DescribeCallback(name, step));
};

/**
 * Override the default no-op before() hook.
 *
 * @param {function} cb
 */
Describe.prototype.before = function(cb) { this.hooks.before = cb; };

/**
 * Override the default no-op beforeEach() hook.
 *
 * @param {function} cb
 */
Describe.prototype.beforeEach = function(cb) { this.hooks.beforeEach = cb; };

/**
 * Override the default no-op after() hook.
 *
 * @param {function} cb
 */
Describe.prototype.after = function(cb) { this.hooks.after = cb; };

/**
 * Override the default no-op afterEach() hook.
 *
 * @param {function} cb
 */
Describe.prototype.afterEach = function(cb) { this.hooks.afterEach = cb; };

/**
 * @param {string} name Test subject.
 * @param {function} cb
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
 */
function runSteps(steps, cb) {
  var batch = new Batch();
  batch.concurrency = 1;
  steps.forEach(function(step) { batch.push(step.cb); });
  batch.end(cb);
}

function noOp() {}
function batchNoOp(taskDone) { taskDone(); }
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
