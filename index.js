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

// Match properties that should not be 'inherited' by it(), hooks, or all.
var defOmitContextRegex = {
  all: [/^__|^(it|describe|before|beforeEach|after|afterEach|settings|set|get)$/],
  it: [],
  hook: []
};

function create() { return new Bddflow(); }

/**
 * Flow configuration and execution.
 */
function Bddflow() {
  this.settings = {
    done: noOp, // Batch#end callback that fires after flow completes.

    // Propagate to each new Describe instance:
    itWrap: null,
    omitContextRegex: clone(defOmitContextRegex),
    path: [], // Names of ancestor describe levels to the currently executing it().
    grep: /.?/ // Filters it() execution by "current path + it() name".
  };
  this.rootDescribes = [];
  this.batch = new Batch();
  this.seedProps = {}; // Will me merged into initial hook/describe/it context.
}
Bddflow.sharedConfigKeys = ['itWrap', 'omitContextRegex', 'path', 'grep'];

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

  var bddFlowConfig = {}; // Propagate selected settings.
  Bddflow.sharedConfigKeys.forEach(function(key) {
    bddFlowConfig[key] = self.get(key);
  });
  desc.set('bddFlowConfig', bddFlowConfig);

  desc.describe(name, cb);
  this.rootDescribes.push(desc);
  return this;
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
  this.get('omitContextRegex')[type].push(regex);
  return this;
};

/**
 * Run collected describe() layers.
 */
Bddflow.prototype.run = function() {
  var self = this;
  var batch = new Batch();
  batch.concurrency = 1;
  this.rootDescribes.forEach(function(desc) {
    batch.push(function(taskDone) {
      extend(desc, self.seedProps);
      runSteps(desc.__steps, taskDone);
    });
  });
  batch.end(this.get('done'));
};

/**
 * Filter 'this' into an object with properties that can be 'inherited'
 * between hooks/describe/it.
 *
 * Static used in other classes via call(). Exposed for test access.
 *
 * @param {string} type 'describe', 'it', 'hook'
 * @return {object}
 */
Bddflow.getInheritableContext = function(type) {
  var self = this;
  var omitContextRegex = this.get('bddFlowConfig').omitContextRegex;
  var regex = omitContextRegex.all.concat(type ? omitContextRegex[type] : []);

  return Object.keys(this).reduce(function(memo, key) {
    var omit = false;
    regex.forEach(function(re) {
      omit = omit || re.test(key);
    });
    if (omit) {
      return memo;
    }
    memo[key] = self[key];
    return memo;
  }, {});
};

/**
 * Augment 'this' with a new non-enumerable/configrable property intended
 * for internal-use only. Help avoid conflicts with properties 'inherited'
 * via getInheritableContext.
 *
 * Static used in other classes via call(). Exposed for test access.
 *
 * @param {string} key
 * @param {mixed} value
 */
Bddflow.addInternalProp = function(key, value) {
  Object.defineProperty(
    this, '__' + key,
    {value: value, enumerable: false, configurable: false, writable: true}
  );
};

/**
 * Callback context for before(), beforeEach(), etc.
 *
 * @param {string} name Of enclosing describe().
 */
function HookContext(name) {
  Bddflow.addInternalProp.call(this, 'name', name);
}
configurable(HookContext.prototype);
HookContext.prototype.getInheritableContext = Bddflow.getInheritableContext;

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
  Bddflow.addInternalProp.call(this, 'name', name);
  this.cb = cb;
}

/**
 * A describe()'s properties, internal hooks, and nested steps (describe/it).
 *
 * @param {string} name Subject expected to exhibit some behavior.
 */
function Describe(name) {
  Bddflow.addInternalProp.call(this, 'name', name);
  Bddflow.addInternalProp.call(this, 'steps', []);
  Bddflow.addInternalProp.call(this, 'hooks', new HookSet());
  this.settings = {
    bddFlowConfig: {}
  };
}
configurable(Describe.prototype);
Describe.prototype.getInheritableContext = Bddflow.getInheritableContext;

/**
 * Add an it() step.
 *
 * @param {string} name
 * @param {function} cb Batch#push compat.
 */
Describe.prototype.it = function(name, cb) {
  this.__steps.push(new ItCallback(name, cb));
};

/**
 * Add a describe() step.
 *
 * @param {string} name
 * @param {function} cb Batch#push compat.
 */
Describe.prototype.describe = function(name, cb) {
  var self = this;
  var step = function(done) {
    var desc = new Describe(name); // Collect nested steps.
    var bddFlowConfig = clone(self.get('bddFlowConfig'));
    bddFlowConfig.path.push(name);
    desc.set('bddFlowConfig', bddFlowConfig);
    extend(desc, self.getInheritableContext());
    cb.call(desc);

    var hc = new HookContext(name);
    hc.set('bddFlowConfig', self.get('bddFlowConfig'));

    var batch = new Batch();

    batch.push(function(done) {
      extend(hc, desc.getInheritableContext('hook'));
      function asyncCb() {
        extend(desc, hc.getInheritableContext('hook'));
        done();
      }
      var hook = desc.__hooks.before;
      if (hook.length) { // Custom before() expects callback arg.
        desc.__hooks.before.call(hc, asyncCb);
      } else {
        desc.__hooks.before.call(hc);
        asyncCb();
      }
    });

    batch.push(function(done) { // Wrap hooks around each internal describe()/it()
      desc.__steps = desc.__steps.map(function(step) {
        if (step instanceof DescribeCallback) {
          extend(desc, hc.getInheritableContext());
          return new DescribeCallback(step.__name, bind(desc, step.cb));
        }

        var itPath = bddFlowConfig.path.concat(step.__name);
        if (!bddFlowConfig.grep.test(itPath.join(' '))) {
          return new ItCallback(step.__name, batchNoOp);
        }

        return new DescribeCallback(step.__name, function(done) { // instanceof ItCallback
          var batch = new Batch();
          batch.push(function(done) {
            extend(hc, desc.getInheritableContext('hook'));
            function asyncCb() {
              extend(desc, hc.getInheritableContext('hook'));
              done();
            }
            var hook = desc.__hooks.beforeEach;
            if (hook.length) { // Custom beforeEach() expects callback arg.
              desc.__hooks.beforeEach.call(hc, asyncCb);
            } else {
              desc.__hooks.beforeEach.call(hc);
              asyncCb();
            }
          });
          batch.push(function(done) {
            var itContext = {};

            // Start with context inherited from outer describe().
            // Then merge in changes/additions from the hooks.
            // If only the hook context is used, hook-targeted omission
            // strip some desired props from the describe().
            extend(itContext, desc.getInheritableContext('it'));
            extend(itContext, hc.getInheritableContext('it'));
            itContext.__name = step.__name;
            itContext.__path = itPath;

            var itWrap = self.get('bddFlowConfig').itWrap || defItWrap;
            itWrap(step.__name, function() {
              var wrapContext = this;
              var mergedContext = extend(itContext, wrapContext);
              if (step.cb.length) { // Custom afterEach() expects callback arg.
                step.cb.call(mergedContext, done);
              } else {
                step.cb.call(mergedContext);
                done();
              }
            });
          });
          batch.push(function(done) {
            function asyncCb() {
              extend(desc, hc.getInheritableContext('hook'));
              done();
            }
            var hook = desc.__hooks.afterEach;
            if (hook.length) { // Custom afterEach() expects callback arg.
              desc.__hooks.afterEach.call(hc, asyncCb);
            } else {
              desc.__hooks.afterEach.call(hc);
              asyncCb();
            }
          });
          batch.concurrency = 1;
          batch.end(done);
        });
      });

      runSteps(desc.__steps, done);
    });

    batch.push(function(done) {
      extend(hc, desc.getInheritableContext('hook'));
      function asyncCb() {
        extend(desc, hc.getInheritableContext('hook'));
        done();
      }
      var hook = desc.__hooks.after;
      if (hook.length) { // Custom after() expects callback arg.
        desc.__hooks.after.call(hc, asyncCb);
      } else {
        desc.__hooks.after.call(hc);
        asyncCb();
      }
    });

    batch.concurrency = 1;
    batch.end(done);
  };
  this.__steps.push(new DescribeCallback(name, step));
};

/**
 * Override the default no-op before() hook.
 *
 * @param {function} cb
 */
Describe.prototype.before = function(cb) { this.__hooks.before = cb; };

/**
 * Override the default no-op beforeEach() hook.
 *
 * @param {function} cb
 */
Describe.prototype.beforeEach = function(cb) { this.__hooks.beforeEach = cb; };

/**
 * Override the default no-op after() hook.
 *
 * @param {function} cb
 */
Describe.prototype.after = function(cb) { this.__hooks.after = cb; };

/**
 * Override the default no-op afterEach() hook.
 *
 * @param {function} cb
 */
Describe.prototype.afterEach = function(cb) { this.__hooks.afterEach = cb; };

/**
 * @param {string} name Test subject.
 * @param {function} cb
 */
function DescribeCallback(name, cb) {
  Bddflow.addInternalProp.call(this, 'name', name);
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
