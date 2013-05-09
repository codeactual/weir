Library for creating BDD-style test flows for JavaScript

_Source: [lib/weir/index.js](../lib/weir/index.js)_

- [exports.Weir](#exportsweir)
- [exports.create](#exportscreate)
- [exports.extend](#exportsextendext)
- [Weir](#weir)
- [Weir.prototype.addContextProp](#weirprototypeaddcontextpropkey-val)
- [Weir.prototype.addRootDescribe](#weirprototypeaddrootdescribename-cb)
- [Weir.prototype.currentDepth](#weirprototypecurrentdepth)
- [Weir.prototype.hideContextProp](#weirprototypehidecontextproptype-regex)
- [Weir.prototype.run](#weirprototyperun)
- [Describe.prototype.it](#describeprototypeitname-cb)
- [Describe.prototype.describe](#describeprototypedescribename-cb)
- [Describe.prototype.before](#describeprototypebeforecb)
- [Describe.prototype.beforeEach](#describeprototypebeforeeachcb)
- [Describe.prototype.after](#describeprototypeaftercb)
- [Describe.prototype.afterEach](#describeprototypeaftereachcb)

# exports.Weir()

> [Weir](#weir) constructor.

# exports.create()

> Create a new [Weir](#weir).

**Return:**

`{object}`

# exports.extend(ext)

> Extend [Weir](#weir).prototype.

**Parameters:**

- `{object} ext`

**Return:**

`{object}` Merge result.

# Weir()

> Weir constructor.

**Usage:**

```js
var flow = require('weir').create();
flow
  .addRootDescribe('subject', function() {
    this.it('should do X', function() {
    // ...
    });
  })
  .addContextProp('someKey', someVal)
  .set('done', function() {
    console.log('Run finished.');
  })
  .run();
```

**Configuration:**

- `{function} done` Callback fired after run finishes
- `{function} itWrap` `it()` wrapper from which context can be shared
  - Receives: `(name, cb)`
  - Or for auto-detected async, receives: `(name, cb, done)`
- `{function} describeWrap` `describe()` wrapper from which context can be shared
  - Receives: `(name, cb)`
- `{object} omitContextRegex` Property name patterns
  - Ex. used to omit properties from propagating between `it()` handlers
  - Indexed by type: `all`, `describe`, `hook`, `it`, `rootDescribe`
  - Values are arrays of `RegExp`.
- `{array} path` Names of ancestor describe levels to the currently executing `it()`
- `{regexp} grep` Filter `it()` execution by `current path + it() name`
- `{regexp} grepv` Omit `it()` execution by `current path + it() name`
- `{object} sharedContext` Shared `this` updated after each hook/describe/it execution
- `{object} stats`
  - `{number} depth` Current stack depth during test run

**Properties:**

- `{array} rootDescribe` Top-level `Describe` objects
- `{object} batch` `Batch` instance used to run collected test steps
- `{object} seedProps` Merged into initial hook/describe/it context

**Inherits:**

- `emitter` component

**Emits events:**

- `describePush` About to start running its collected steps
  - `{string} name`
- `describePop` Finished its collected steps, including nested `describe()`
  - `{string} name`
- `itPush` About to start running its callback
  - `{string} name`
- `itPop` Its callback finished
  - `{string} name`

**See:**

- [emitter](https://github.com/component/emitter)

# Weir.prototype.addContextProp(key, val)

> Add a property to the initial hook/describe/it shared context.

**Parameters:**

- `{string} key`
- `{mixed} val`

**Return:**

`{object}` this

# Weir.prototype.addRootDescribe(name, cb)

> Add a top-level `describe()`.

**Parameters:**

- `{string} name`
- `{function} cb`

**Return:**

`{object}` this

# Weir.prototype.currentDepth()

> Get the current stack depth.

**Return:**

`{number}`

- `0` = every root `describe()`
- Each deeper `describe()` is 1 more than its parent `describe()`.
- Each `it()` is 1 more than its parent `describe()`.

# Weir.prototype.hideContextProp(type, regex)

> Prevent a type of flow function from 'inheriting' specific context properties
from enclosing/subsequently-executed flow functions.

**Parameters:**

- `{string} type` 'it', 'hook'
- `{regexp} regex`

**Return:**

`{object}` this

# Weir.prototype.run()

> Run collected `describe()` steps.

# Describe.prototype.it(name, cb)

> Add an `it()` step.

**Parameters:**

- `{string} name`
- `{function} cb` `Batch#push` compatible

**See:**

- [Batch](https://github.com/visionmedia/batch#api)

# Describe.prototype.describe(name, cb)

> Add a `describe()` step.

**Parameters:**

- `{string} name`
- `{function} cb` `Batch#push` compatible

**See:**

- [Batch](https://github.com/visionmedia/batch#api)

# Describe.prototype.before(cb)

> Run a custom hook before the first `it()` in the current `describe()`.

**Parameters:**

- `{function} cb`

  - Async-mode is optional and auto-detected.
  - Ex. `function(done) { ... done(); }`

# Describe.prototype.beforeEach(cb)

> Run a custom hook before each `it()` in the current `describe()`.

**Parameters:**

- `{function} cb`

  - Async-mode is optional and auto-detected.
  - Ex. `function(done) { ... done(); }`

# Describe.prototype.after(cb)

> Run a custom hook at the end of the current `describe()`.

**Parameters:**

- `{function} cb`

  - Async-mode is optional and auto-detected.
  - Ex. `function(done) { ... done(); }`

# Describe.prototype.afterEach(cb)

> Run a custom hook after each `it()` in the current `describe()`.

**Parameters:**

- `{function} cb`

  - Async-mode is optional and auto-detected.
  - Ex. `function(done) { ... done(); }`

_&mdash;generated by [apidox](https://github.com/codeactual/apidox)&mdash;_
