# weir

Library for creating BDD-style test flows for JavaScript.

* Nested `describe()`
* Optionally async `it()` and `before/beforeEach/after/afterEach` hooks
* Filter `it()` execution by regular expression
* Manage `it()` and hook contexts with property injection/omission
* Supply your own runner CLI, assertion library, etc.

API modeled after [Mocha](http://mochajs.org/).

[![Build Status](https://travis-ci.org/codeactual/weir.png)](https://travis-ci.org/codeactual/weir)

## Goal

Ability to add BDD-style flow to new environments like [CasperJS](https://github.com/n1k0/casperjs/)/[PhantomJS](https://github.com/ariya/phantomjs), but integrate with preexisting assertion APIs, etc.

## Use case: [conjure](https://github.com/codeactual/conjure), a [CasperJS](https://github.com/n1k0/casperjs/) runner and library

`conjure` allows you to write modular tests in a BDD-style flow.

```js
module.exports = function(conjure) {
  conjure.set('initUrl', '/login').set('initSel', '.login');

  conjure.test('login page', function() {
    this.describe('form', function() {
      this.it('should not auto-check "Remember Me"' , function() {
        this.conjure.selectorExists('.remember-me');
        this.conjure.selectorMissing('.remember-me:checked');
      });
    });
  });
};
```

Standard `CasperJS` APIs like `casper` and `utils` are injected into test method contexts using [addContextProp()](docs/Weir.md).

## Examples

### Basic run

```js
flow = weir.create();
flow
  .addRootDescribe('subject', function() {
    this.it('should do X', function() {
      // ...
    });
  })
  .run();
```

### Async `it()` and `beforeEach()`

```js
flow = weir.create();
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

[More](docs/examples.md)

## Documentation

* [API](docs/Weir.md)
* [Events, context injection wrappers, etc.](docs/examples.md)

## License

  MIT

## Tests

    npm test
