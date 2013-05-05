Build and run BDD flows with before/after hooks, describe, it

_Source: [lib/bdd-flow/index.js](../lib/bdd-flow/index.js)_

- [exports.Bddflow](#exportsbddflow)
- [exports.create](#exportscreate)
- [exports.extend](#exportsextendext)
- [Bddflow](#bddflow)
- [Bddflow.prototype.addContextProp](#bddflowprototypeaddcontextpropkey-val)
- [Bddflow.prototype.addRootDescribe](#bddflowprototypeaddrootdescribename-cb)
- [Bddflow.prototype.currentDepth](#bddflowprototypecurrentdepth)
- [Bddflow.prototype.hideContextProp](#bddflowprototypehidecontextproptype-regex)
- [Bddflow.prototype.run](#bddflowprototyperun)
- [Describe.prototype.it](#describeprototypeitname-cb)
- [Describe.prototype.describe](#describeprototypedescribename-cb)
- [Describe.prototype.before](#describeprototypebeforecb)
- [Describe.prototype.beforeEach](#describeprototypebeforeeachcb)
- [Describe.prototype.after](#describeprototypeaftercb)
- [Describe.prototype.afterEach](#describeprototypeaftereachcb)

# exports.Bddflow()

> [Bddflow](#bddflow) constructor.

# exports.create()

> Create a new [Bddflow](#bddflow).

**Return:**

`{object}`

# exports.extend(ext)

> Extend [Bddflow](#bddflow).prototype.

**Parameters:**

- `{object} ext`

**Return:**

`{object}` Merge result.

# Bddflow()

> Bddflow constructor.

**Usage:**

```js
var flow = require('bdd-flow').create();
flow.addRootDescribe('subject', function() {
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
- `{function} itWrap` `it()` wrapper from which context can be 'inherited'
  - Receives: (`name`, `cb`)
  - Or for auto-detected async, receives: (`name`, `cb`, `done`)
- `{function} describeWrap` `describe()` wrapper from which context can be 'inherited'
  - Receives: (`name`, `cb`)
- `{object} omitContextRegex` Property name patterns
  - Ex. used to omit properties from propagating between `it()` handlers
  - Indexed by type: `all`, `describe`, `hook`, `it`, `rootDescribe`
  - Values are arrays of `RegExp`.
- `{array} path` Names of ancestor describe levels to the currently executing `it()`
- `{regexp} grep` Filter `it()` execution by "current path + `it()` name"
- `{regexp} grepv` Omit `it()` execution by "current path + `it()` name"
- `{object} sharedContext` hook/describe/it context that is 'inherited'
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

# Bddflow.prototype.addContextProp(key, val)

> Add a property to the initial hook/describe/it shared context.

**Parameters:**

- `{string} key`
- `{mixed} val`

**Return:**

`{object}` this

# Bddflow.prototype.addRootDescribe(name, cb)

> Add a top-level `describe()`.

**Parameters:**

- `{string} name`
- `{function} cb`

**Return:**

`{object}` this

# Bddflow.prototype.currentDepth()

> Get the current stack depth.

**Return:**

`{number}`

- `0` = every root `describe()`
- Each deeper `describe()` is 1 more than its parent `describe()`.
- Each `it()` is 1 more than its parent `describe()`.

# Bddflow.prototype.hideContextProp(type, regex)

> Prevent a type of flow function from 'inheriting' specific context properties
from enclosing/subsequently-executed flow functions.

**Parameters:**

- `{string} type` 'it', 'hook'
- `{regexp} regex`

**Return:**

`{object}` this

# Bddflow.prototype.run()

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

> Run a custom hook after to the last `it()` in the current `describe()`.

**Parameters:**

- `{function} cb`

  - Async-mode is optional and auto-detected.
- Ex. `function(done) { ... done(); }`

# Describe.prototype.after(cb)

> Override the default no-op after() hook.

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

_&mdash;generated by [gitemplate-dox](https://github.com/codeactual/gitemplate-dox)&mdash;_
