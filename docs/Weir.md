Library for creating BDD-style test flows for JavaScript

_Source: [lib/weir/index.js](../lib/weir/index.js)_

<a name="tableofcontents"></a>

- <a name="toc_exportsweir"></a><a name="toc_exports"></a>[exports.Weir](#exportsweir)
- <a name="toc_exportscreate"></a>[exports.create](#exportscreate)
- <a name="toc_exportsextendext"></a>[exports.extend](#exportsextendext)
- <a name="toc_weir"></a>[Weir](#weir)
- <a name="toc_weirprototypeaddcontextpropkey-val"></a><a name="toc_weirprototype"></a>[Weir.prototype.addContextProp](#weirprototypeaddcontextpropkey-val)
- <a name="toc_weirprototypeaddrootdescribename-cb"></a>[Weir.prototype.addRootDescribe](#weirprototypeaddrootdescribename-cb)
- <a name="toc_weirprototypecurrentdepth"></a>[Weir.prototype.currentDepth](#weirprototypecurrentdepth)
- <a name="toc_weirprototypehidecontextproptype-regex"></a>[Weir.prototype.hideContextProp](#weirprototypehidecontextproptype-regex)
- <a name="toc_weirprototyperun"></a>[Weir.prototype.run](#weirprototyperun)
- <a name="toc_describeprototypeitname-cb"></a><a name="toc_describeprototype"></a><a name="toc_describe"></a>[Describe.prototype.it](#describeprototypeitname-cb)
- <a name="toc_describeprototypedescribename-cb"></a>[Describe.prototype.describe](#describeprototypedescribename-cb)
- <a name="toc_describeprototypebeforecb"></a>[Describe.prototype.before](#describeprototypebeforecb)
- <a name="toc_describeprototypebeforeeachcb"></a>[Describe.prototype.beforeEach](#describeprototypebeforeeachcb)
- <a name="toc_describeprototypeaftercb"></a>[Describe.prototype.after](#describeprototypeaftercb)
- <a name="toc_describeprototypeaftereachcb"></a>[Describe.prototype.afterEach](#describeprototypeaftereachcb)

<a name="exports"></a>

# exports.Weir()

> [Weir](#weir) constructor.

<sub>Go: [TOC](#tableofcontents) | [exports](#toc_exports)</sub>

# exports.create()

> Create a new [Weir](#weir).

**Return:**

`{object}`

<sub>Go: [TOC](#tableofcontents) | [exports](#toc_exports)</sub>

# exports.extend(ext)

> Extend [Weir](#weir).prototype.

**Parameters:**

- `{object} ext`

**Return:**

`{object}` Merge result.

<sub>Go: [TOC](#tableofcontents) | [exports](#toc_exports)</sub>

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
- `{function} describeWrap` `describe()` wrapper from which context can be shared
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

**See:**

- [Events, context injection wrappers, etc.](examples.md)
- [Batch](https://github.com/visionmedia/batch#api)
- [emitter](https://github.com/component/emitter)

<sub>Go: [TOC](#tableofcontents)</sub>

<a name="weirprototype"></a>

# Weir.prototype.addContextProp(key, val)

> Add a property to the initial hook/describe/it shared context.

**Parameters:**

- `{string} key`
- `{mixed} val`

**Return:**

`{object}` this

<sub>Go: [TOC](#tableofcontents) | [Weir.prototype](#toc_weirprototype)</sub>

# Weir.prototype.addRootDescribe(name, cb)

> Add a top-level `describe()`.

**Parameters:**

- `{string} name`
- `{function} cb`

**Return:**

`{object}` this

<sub>Go: [TOC](#tableofcontents) | [Weir.prototype](#toc_weirprototype)</sub>

# Weir.prototype.currentDepth()

> Get the current stack depth.

**Return:**

`{number}`

- `0` = every root `describe()`
- Each deeper `describe()` is 1 more than its parent `describe()`.
- Each `it()` is 1 more than its parent `describe()`.

<sub>Go: [TOC](#tableofcontents) | [Weir.prototype](#toc_weirprototype)</sub>

# Weir.prototype.hideContextProp(type, regex)

> Prevent a type of flow function from 'inheriting' specific context properties
from enclosing/subsequently-executed flow functions.

**Parameters:**

- `{string} type` 'it', 'hook'
- `{regexp} regex`

**Return:**

`{object}` this

<sub>Go: [TOC](#tableofcontents) | [Weir.prototype](#toc_weirprototype)</sub>

# Weir.prototype.run()

> Run collected `describe()` steps.

**See:**

- [Batch](https://github.com/visionmedia/batch#api)

<sub>Go: [TOC](#tableofcontents) | [Weir.prototype](#toc_weirprototype)</sub>

<a name="describeprototype"></a>

<a name="describe"></a>

# Describe.prototype.it(name, cb)

> Add an `it()` step.

**Parameters:**

- `{string} name`
- `{function} cb` `Batch#push` compatible

**See:**

- [Batch](https://github.com/visionmedia/batch#api)

<sub>Go: [TOC](#tableofcontents) | [Describe.prototype](#toc_describeprototype)</sub>

# Describe.prototype.describe(name, cb)

> Add a `describe()` step.

**Parameters:**

- `{string} name`
- `{function} cb` `Batch#push` compatible

**See:**

- [Batch](https://github.com/visionmedia/batch#api)

<sub>Go: [TOC](#tableofcontents) | [Describe.prototype](#toc_describeprototype)</sub>

# Describe.prototype.before(cb)

> Run a custom hook before the first `it()` in the current `describe()`.

**Parameters:**

- `{function} cb`
  - Async-mode is optional and auto-detected: `function(done) { ... done(); }`

<sub>Go: [TOC](#tableofcontents) | [Describe.prototype](#toc_describeprototype)</sub>

# Describe.prototype.beforeEach(cb)

> Run a custom hook before each `it()` in the current `describe()`.

**Parameters:**

- `{function} cb`
  - Async-mode is optional and auto-detected: `function(done) { ... done(); }`

<sub>Go: [TOC](#tableofcontents) | [Describe.prototype](#toc_describeprototype)</sub>

# Describe.prototype.after(cb)

> Run a custom hook after the last `it()` in the current `describe()`.

**Parameters:**

- `{function} cb`
  - Async-mode is optional and auto-detected: `function(done) { ... done(); }`

<sub>Go: [TOC](#tableofcontents) | [Describe.prototype](#toc_describeprototype)</sub>

# Describe.prototype.afterEach(cb)

> Run a custom hook after each `it()` in the current `describe()`.

**Parameters:**

- `{function} cb`
  - Async-mode is optional and auto-detected: `function(done) { ... done(); }`

<sub>Go: [TOC](#tableofcontents) | [Describe.prototype](#toc_describeprototype)</sub>

_&mdash;generated by [apidox](https://github.com/codeactual/apidox)&mdash;_
