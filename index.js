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

var configurable = require('configurable.js');
var Batch = require('batch');
var bind = require('bind');
var extend = require('extend');

// Match properties that should not be 'inherited' between hook/describe/it.
var contextOmitRegex = /^__|^(it|describe|before|beforeEach|after|afterEach)$/;

function create() {
  return new Bddflow();
}

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
  var desc = new Describe(name);
  desc.describe(name, this.get('initDescribe'));
  runArrayOfFn(desc.__steps, this.get('done'), this.get('concurrency'));
};

/**
 * Filter 'this' into an object with properties that can be 'inherited'
 * between hooks/describe/it.
 *
 * Static used in other classes via call(). Exposed for test access.
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
 * for internal-use only. Help avoid conflicts with properties 'inherited'
 * via getInheritableContext().
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
      extend(hc, desc.getInheritableContext());
      desc.__hooks.before.call(hc, function() {
        extend(desc, hc.getInheritableContext());
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
            extend(hc, desc.getInheritableContext());
            desc.__hooks.beforeEach.call(hc, done);
          });
          batch.push(function(done) {
            var it = new It(name);
            extend(it, hc.getInheritableContext());
            fn.call(it, done);
          });
          batch.push(function(done) {
            desc.__hooks.afterEach.call(hc, function() {
              extend(desc, hc.getInheritableContext());
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
      extend(hc, desc.getInheritableContext());
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
