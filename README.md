# bdd-flow

Library for building and running BDD flows.

* Nested `describe()`
* Sync or async `it()`
* Sync or async `before/beforeEach/after/afterEach`
* Select/omit `it()` execution by regular expression
* Manage `it()` and hook contexts with property injection/omission
* Supply your own assertion library

API modeled after [Mocha](http://visionmedia.github.io/mocha/).

[![Build Status](https://travis-ci.org/codeactual/bdd-flow.png)](https://travis-ci.org/codeactual/bdd-flow)

## Example

### Integration

* [conjure](https://github.com/codeactual/conjure): Relies on `bdd-flow` for test composition. Injects the standard [CasperJS](http://casperjs.org/) testing API, and custom wrappers, into each `it()`.

```js
module.exports = function(conjure) {
  conjure.set('initUrl', '/login').set('initSel', '.login');

  conjure.test('login page', function() {
    this.describe('form', function() {
      this.it('should not auto-check "Remember Me"' , function() {
        this.selectorExists('.remember-me');
        this.selectorMissing('.remember-me:checked');
      });
    });
  });
};
```

### API: Basic run

```js
flow = bddflow.create();
flow
  .addRootDescribe('subject', function() {
    this.it('should do X', function() {
      // ...
    });
  })
  .run();
```

### API: Async it() and hook

```js
flow = bddflow.create();
flow
  .addRootDescribe('subject', function() {
    this.beforeEach(function(done) {
      this.fixture = 'foo';
      done();
    });
    this.it('should receive fixture prepared by hook', function(done) {
      // this.fixture still equals 'foo'
      done();
    });
  })
  .run();
```

### API: Nested describe() with it() filtering and custom context properties

```js
flow = bddflow.create();
flow
  .set('grep', /should run/)
  .addContextProp('foo', 'bar')
  .addContextProp('hello', 'world')
  .hideContextProp('it', 'hello')
  .addRootDescribe('subject', function() {
    this.describe(function() {
      this.describe(function() {
        this.beforeEach(function() {
          // this.foo = 'bar'
          // this.hello = 'world';
        });
        this.it('should run', function() {
          // this.foo = 'bar'
          // this.hello = undefined
        });
        this.it('should not run', function() {
          // ...
        });
      });
    });
  })
  .run();
```

## Installation

### [Component](https://github.com/component/component)

    $ component install codeactual/bdd-flow

### [NPM](https://npmjs.org/package/bdd-flow)

    npm install bdd-flow

## Module API

* `Bddflow`: Flow configuration and execution.
* `create`: `new Bddflow()` wrapper

## `Bddflow` API

Optional:

### `set(key, val)`

* `{function} done`: Fires after flow completion.
* `{function} itWrap`: `it()` callbacks will be executed inside this wrapper and "inherit" that context. For example, [conjure](https://github.com/codeactual/conjure) uses it to run every `it()` inside a [CasperJS](http://casperjs.org/) `then()` to inject the latter's API.
* `{function} describeWrap`: Same behavior as `itWrap` for `describe()`.
* `{RegExp} grep`: Limit execution to `it()` definitions whose "BDD path" matches the pattern. Example path from a script with nested `describe()` layers: `"my-lib MyClass #myMethod should validate X"`. (Cannot combine with `grepv`.)
* `{RegExp} grepv`: Limit execution to `it()` definitions whose "BDD path" don't match the pattern. Example path from a script with nested `describe()` layers: `"my-lib MyClass #myMethod should validate X"`. (Cannot combine with `grep`.)

### `addContextProp(key, val)`

> Add a property to the initial hook/describe/it shared context.

### `addRootDescribe(name, cb)`

> Add a top-level describe().

### `isRunning()`

> Check if run() has been called.

### `hideContextProp(type, key)`

> Prevent a type of flow function from 'inheriting' specific context properties from enclosing/subsequently-executed flow functions.

* Types: `it`, `hook`
* Key: `RegExp` or `string` for an exact match.

### `run()`

> Run collected describe() layers.

## License

  MIT

## Tests

    npm test
