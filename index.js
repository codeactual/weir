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
  Describe: Describe,
  It: It,
  HookContext: HookContext,
  HookSet: HookSet,
  create: create,
  require: require // Allow tests to use component-land require.
};

var Batch = require('batch');
var bind = require('bind');
var clone = require('clone');
var configurable = require('configurable.js');
var extend = require('extend');

// Match properties that should not be 'inherited' between hook/describe/it.
var defOmitContextRegex = /^__|^(it|describe|before|beforeEach|after|afterEach)$/;

// TODO make this a property, not a global
var initOmitContextRegex = {
  all: [defOmitContextRegex],
  it: [],
  hook: []
};
var omitContextRegex;

function create() {
  return new Bddflow();
}

function Bddflow() {
  this.settings = {
    initDescribe: noOp,
    done: noOp
  };
  this.rootDescribes = [];
  this.batch = new Batch();
  this.seedProps = {}; // Will me merged into initial hook/describe/it context.

  omitContextRegex = clone(initOmitContextRegex); // TODO refactor
}

configurable(Bddflow.prototype);

/**
 * Add a "root" describe().
 *
 * @param {string} name
 * @param {function} cb
 */
Bddflow.prototype.addRootDescribe = function(name, cb, context) {
  var desc = new Describe(name);
  desc.describe(name, cb);
  this.rootDescribes.push(desc);
  return this;
};

/**
 * Run the batched steps in each root describe().
 */
Bddflow.prototype.run = function() {
  var self = this;
  var batch = new Batch();
  batch.concurrency = 1;
  this.rootDescribes.forEach(function(desc) {
    batch.push(function(taskDone) {
      extend(desc, self.seedProps);
      runArrayOfFn(desc.__steps, taskDone, 1);
    });
  });
  batch.end(this.get('done'));
};

/**
 * Add custom property to the initial hook/describe/it context.
 *
 * @param {string} key
 * @param {mixed} val
 * @return {object} this
 */
Bddflow.prototype.addContextProp = function(key, val) {
  this.seedProps[key] = val;
  return this;
};

Bddflow.prototype.omitContextByRegex = function(type, regex) {
  omitContextRegex[type].push(regex);
  return this;
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
 * Construct before(), beforeEach(), etc.
 *
 * @param {string} name Of enclosing describe().
 */
function HookContext(name) {
  Bddflow.addInternalProp.call(this, 'name', name);
}
HookContext.prototype.getInheritableContext = Bddflow.getInheritableContext;

// Auto-terminating callback for use with Batch#push.
Bddflow.defaultHookImpl = function(done) { done(); };

/**
 * Construct a container for a before(), beforeEach(), etc. method set.
 */
function HookSet() {
  this.before = Bddflow.defaultHookImpl;
  this.beforeEach = Bddflow.defaultHookImpl;
  this.after = Bddflow.defaultHookImpl;
  this.afterEach = Bddflow.defaultHookImpl;
}

/**
 * Construct an it() context.
 *
 * @param {string} name // Ex. 'shoul do X'
 */
function It(name) {
  Bddflow.addInternalProp.call(this, 'name', name);
}

/**
 * Construct a describe() context.
 *
 * @param {string} name Subject expected to exhibit some behavior.
 */
function Describe(name) {
  Bddflow.addInternalProp.call(this, 'name', name);
  Bddflow.addInternalProp.call(this, 'steps', []);
  Bddflow.addInternalProp.call(this, 'hooks', new HookSet());
}
Describe.prototype.getInheritableContext = Bddflow.getInheritableContext;

/**
 * Add an it() step.
 *
 * @param {string} name
 * @param {function} cb Batch#push compat.
 */
Describe.prototype.it = function(name, cb) {
  cb.type = 'it';
  this.__steps.push(cb);
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
    extend(desc, self.getInheritableContext());
    cb.call(desc);

    var hc = new HookContext(name);
    var batch = new Batch();

    batch.push(function(done) {
      extend(hc, desc.getInheritableContext('hook'));
      desc.__hooks.before.call(hc, function() {
        extend(desc, hc.getInheritableContext('hook'));
        done();
      });
    });

    batch.push(function(done) { // Wrap hooks around each internal describe()/it()
      desc.__steps = desc.__steps.map(function(fn) {
        if ('describe' === fn.type) {
          extend(desc, hc.getInheritableContext());
          return bind(desc, fn);
        }
        return function(done) { // type = 'it'
          var batch = new Batch();
          batch.push(function(done) {
            extend(hc, desc.getInheritableContext('hook'));
            desc.__hooks.beforeEach.call(hc, done);
          });
          batch.push(function(done) {
            var it = new It(name);

            // Start with context inherited from outer describe().
            // Then merge in changes/additions from the hooks.
            // If only the hook context is used, hook-targeted omission
            // strip some desired props from the describe().
            extend(it, desc.getInheritableContext('it'));
            extend(it, hc.getInheritableContext('it'));

            fn.call(it, done);
          });
          batch.push(function(done) {
            desc.__hooks.afterEach.call(hc, function() {
              extend(desc, hc.getInheritableContext('hook'));
              done();
            });
          });
          batch.concurrency = 1;
          batch.end(done);
        };
      });

      runArrayOfFn(desc.__steps, done);
    });

    batch.push(function(done) {
      extend(hc, desc.getInheritableContext('hook'));
      desc.__hooks.after.call(hc, done);
    });

    batch.concurrency = 1;
    batch.end(done);
  };
  step.type = 'describe';
  this.__steps.push(step);
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
 * Execute an array of functions w/ Batch.
 *
 * @param {array} list
 * @param {function} cb Called at completion.
 * @param {number} [concurrency=1]
 */
function runArrayOfFn(list, cb, concurrency) {
  var batch = new Batch();
  batch.concurrency = typeof concurrency === 'undefined' ? 1 : concurrency;
  list.forEach(function(fn) { batch.push(fn); });
  batch.end(cb);
}

function noOp() {}
