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

## API Documentation

[Bddflow/Describe](docs/Bddflow.md)

## License

  MIT

## Tests

    npm test
