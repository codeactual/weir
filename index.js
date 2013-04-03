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
  require: require // Allow tests to use component-land require.
};

var configurable = require('configurable.js');
var Batch = require('batch');
var bind = require('bind');
var extend = require('extend');

// Matching properties are omitted from contexts 'inherited' during
// transitions like beforeEach() -> it().
var contextOmitRegex = /^__|^(it|describe|before|beforeEach|after|afterEach)$/;

function Bddflow() {
  this.settings = {
    name: '',
    initDescribe: noOp,
    done: noOp,
    concurrency: 1
  };

  this.batch = new Batch();
}

configurable(Bddflow.prototype);

/**
 */
Bddflow.prototype.run = function() {
  var name = this.get('name');
  var d = new Describe(name);
  d.describe(name, this.get('initDescribe'));
  runArrayOfFn(d.__steps, this.get('done'), this.get('concurrency'));
};

/**
 * Builds an object whose properties are a sub-set of 'this'.
 * That subset is based on property names and contextOmitRegex.
 *
 * @return {object}
 */
Bddflow.getInheritableContext = function() {
  var self = this;
  return Object.keys(this).reduce(function(memo, key) {
    if (contextOmitRegex.test(key)) {
      return memo;
    }
    memo[key] = self[key];
    return memo;
  }, {});
};

/**
 * Augment 'this' with a new non-enumerable/configrable property intended
 * for internal-use only. Helps avoid conflicts with "inherited" contexts.
 *
 * @param {string} key
 * @param {mixed} value
 */
Bddflow.addInternalProp = function(key, value) {
  Object.defineProperty(
    this, '__' + key,
    {value: value, enumerable: false, configurable: false}
  );
};

/**
 * Getter for properties added via addInternalProp().
 *
 * @param {string} key
 * @return {mixed}
 */
Bddflow.getInternalProp = function(key) {
  return this['__' + key];
};

/**
 * Construct before(), beforeEach(), etc.
 *
 * @param {string} name
 */
function HookContext(name) {
  Bddflow.addInternalProp.call(this, 'name', name);
}
HookContext.prototype.get = Bddflow.getInternalProp;
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
 *  Construct an it() context.
 *
 *  @param {string} name
 */
function It(name) {
  /**
   * Name of expected behavior (ex. should X).
   * @property
   * @type string
   */
  this.__name = name;
}
It.prototype.get = Bddflow.getInternalProp;

/**
 * Construct a describe() context.
 */
function Describe(name) {
  /**
   * Name of subject expected to exhibit some behavior.
   * @property
   * @type string
   */
  this.__name = name;

  /**
   * describe() and it() callbacks. Each is Batch#push compat.
   * @property
   * @type array
   */
  this.__steps = [];

  /**
   * HookSet instance.
   * @property
   * @type object
   */
  this.__hooks = new HookSet();
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
  var func = function(done) {
    // Collect steps nested in the given step.
    var f = new Describe(name);
    extend(f, self.getInheritableContext());
    cb.call(f);

    // Prep a context with the AOP methods.
    var a = new HookContext(name);

    var batch = new Batch();

    batch.push(function(done) {
      extend(a, f.getInheritableContext());
      f.__hooks.before.call(a, function() {
        extend(f, a.getInheritableContext());
        done();
      });
    });

    // Bookend each collected it() and describe() inside a beforeEach/afterEach.
    batch.push(function(done) {
      f.__steps = f.__steps.map(function(fn) {
        if ('describe' === fn.type) {
          extend(f, a.getInheritableContext());
          return bind(f, fn);
        }
        return function(done) { // type = 'it'
          var batch = new Batch();
          batch.push(function(done) {
            extend(a, f.getInheritableContext());
            f.__hooks.beforeEach.call(a, done);
          });
          batch.push(function(done) {
            var i = new It(name);
            extend(i, a.getInheritableContext());
            fn.call(i, done);
          });
          batch.push(function(done) {
            f.__hooks.afterEach.call(a, function() {
              extend(f, a.getInheritableContext());
              done();
            });
          });
          batch.concurrency = 1;
          batch.end(done);
        };
      });

      runArrayOfFn(f.__steps, done);
    });

    batch.push(function(done) {
      extend(a, f.getInheritableContext());
      f.__hooks.after.call(a, done);
    });

    batch.concurrency = 1;
    batch.end(done);
  };
  func.type = 'describe';
  this.__steps.push(func);
};

/**
 * Override the default no-op before() hook.
 *
 * @param {function} cb
 */
Describe.prototype.before = function(cb) {
  this.__hooks.before = cb;
};

/**
 * Override the default no-op beforeEach() hook.
 *
 * @param {function} cb
 */
Describe.prototype.beforeEach = function(cb) {
  this.__hooks.beforeEach = cb;

};
/**
 * Override the default no-op after() hook.
 *
 * @param {function} cb
 */
Describe.prototype.after = function(cb) {
  this.__hooks.after = cb;
};

/**
 * Override the default no-op afterEach() hook.
 *
 * @param {function} cb
 */
Describe.prototype.afterEach = function(cb) {
  this.__hooks.afterEach = cb;
};

function noOp() {}

function runArrayOfFn(set, cb, concurrency) {
  var batch = new Batch();
  batch.concurrency = typeof concurrency === 'undefined' ? 1 : concurrency;
  set.forEach(function(fn) { batch.push(fn); });
  batch.end(cb);
}
