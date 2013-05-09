# General

## Nested `describe()` with `it()` filtering and custom context properties

```js
flow = weir.create();
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

# Events

## `describePush`

>  A `describe()` is about to run its collected steps.

```js
flow.on('describePush', function(name) {
  console.log('describe() started: %s', name);
});
```

## `describePop`

> A `describe()` finished its collected steps, including nested `describe()` if any.

```js
flow.on('describePop', function(name) {
  console.log('describe() finished: %s', name);
});
```

## `itPush`

> An `it()` step is about to run.

```js
flow.on('itPush', function(name) {
  console.log('it() started: %s', name);
});
```

## `itPop`

> An `it()` step finished.

```js
flow.on('itPop', function(name) {
  console.log('it() finished: %s', name);
});
```

# Context-injection wrappers

## `describeWrap`

> Set a `describeWrap` function if you need to customize the context of each function (`cb`) passed to `describe()`.

```js
flow.set('describeWrap', function (name, cb) {
  var secretSauce = {};
  // ...
  cb.call(secretSauce);
});
```

## `itWrap`

> Set an `itWrap` function if you need to customize the context of each function (`cb`) passed to `it()`.

```js
flow.set('itWrap', function(name, cb) {
  var secretSauce = {};
  // ...
  cb.call(secretSauce);
});

// OR

flow.set('itWrap', function(name, cb, done) {
  doSomethingAsync(function() {
    var secretSauce = {};
    // ...
    cb.call(secretSauce);
    done();
  }):
});
```
