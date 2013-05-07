(function() {
    function require(path, parent, orig) {
        var resolved = require.resolve(path);
        if (null == resolved) {
            orig = orig || path;
            parent = parent || "root";
            var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
            err.path = orig;
            err.parent = parent;
            err.require = true;
            throw err;
        }
        var module = require.modules[resolved];
        if (!module.exports) {
            module.exports = {};
            module.client = module.component = true;
            module.call(this, module.exports, require.relative(resolved), module);
        }
        return module.exports;
    }
    require.modules = {};
    require.aliases = {};
    require.resolve = function(path) {
        if (path.charAt(0) === "/") path = path.slice(1);
        var index = path + "/index.js";
        var paths = [ path, path + ".js", path + ".json", path + "/index.js", path + "/index.json" ];
        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];
            if (require.modules.hasOwnProperty(path)) return path;
        }
        if (require.aliases.hasOwnProperty(index)) {
            return require.aliases[index];
        }
    };
    require.normalize = function(curr, path) {
        var segs = [];
        if ("." != path.charAt(0)) return path;
        curr = curr.split("/");
        path = path.split("/");
        for (var i = 0; i < path.length; ++i) {
            if (".." == path[i]) {
                curr.pop();
            } else if ("." != path[i] && "" != path[i]) {
                segs.push(path[i]);
            }
        }
        return curr.concat(segs).join("/");
    };
    require.register = function(path, definition) {
        require.modules[path] = definition;
    };
    require.alias = function(from, to) {
        if (!require.modules.hasOwnProperty(from)) {
            throw new Error('Failed to alias "' + from + '", it does not exist');
        }
        require.aliases[to] = from;
    };
    require.relative = function(parent) {
        var p = require.normalize(parent, "..");
        function lastIndexOf(arr, obj) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === obj) return i;
            }
            return -1;
        }
        function localRequire(path) {
            var resolved = localRequire.resolve(path);
            return require(resolved, parent, path);
        }
        localRequire.resolve = function(path) {
            var c = path.charAt(0);
            if ("/" == c) return path.slice(1);
            if ("." == c) return require.normalize(p, path);
            var segs = parent.split("/");
            var i = lastIndexOf(segs, "deps") + 1;
            if (!i) i = 0;
            path = segs.slice(0, i + 1).join("/") + "/deps/" + path;
            return path;
        };
        localRequire.exists = function(path) {
            return require.modules.hasOwnProperty(localRequire.resolve(path));
        };
        return localRequire;
    };
    require.register("visionmedia-configurable.js/index.js", function(exports, require, module) {
        module.exports = function(obj) {
            obj.settings = {};
            obj.set = function(name, val) {
                if (1 == arguments.length) {
                    for (var key in name) {
                        this.set(key, name[key]);
                    }
                } else {
                    this.settings[name] = val;
                }
                return this;
            };
            obj.get = function(name) {
                return this.settings[name];
            };
            obj.enable = function(name) {
                return this.set(name, true);
            };
            obj.disable = function(name) {
                return this.set(name, false);
            };
            obj.enabled = function(name) {
                return !!this.get(name);
            };
            obj.disabled = function(name) {
                return !this.get(name);
            };
            return obj;
        };
    });
    require.register("codeactual-extend/index.js", function(exports, require, module) {
        module.exports = function extend(object) {
            var args = Array.prototype.slice.call(arguments, 1);
            for (var i = 0, source; source = args[i]; i++) {
                if (!source) continue;
                for (var property in source) {
                    object[property] = source[property];
                }
            }
            return object;
        };
    });
    require.register("visionmedia-batch/index.js", function(exports, require, module) {
        try {
            var EventEmitter = require("events").EventEmitter;
        } catch (err) {
            var Emitter = require("emitter");
        }
        function noop() {}
        module.exports = Batch;
        function Batch() {
            this.fns = [];
            this.concurrency(Infinity);
            for (var i = 0, len = arguments.length; i < len; ++i) {
                this.push(arguments[i]);
            }
        }
        if (EventEmitter) {
            Batch.prototype.__proto__ = EventEmitter.prototype;
        } else {
            Emitter(Batch.prototype);
        }
        Batch.prototype.concurrency = function(n) {
            this.n = n;
            return this;
        };
        Batch.prototype.push = function(fn) {
            this.fns.push(fn);
            return this;
        };
        Batch.prototype.end = function(cb) {
            var self = this, total = this.fns.length, pending = total, results = [], cb = cb || noop, fns = this.fns, max = this.n, index = 0, done;
            if (!fns.length) return cb(null, results);
            function next() {
                var i = index++;
                var fn = fns[i];
                if (!fn) return;
                var start = new Date();
                fn(function(err, res) {
                    if (done) return;
                    if (err) return done = true, cb(err);
                    var complete = total - pending + 1;
                    var end = new Date();
                    results[i] = res;
                    self.emit("progress", {
                        index: i,
                        value: res,
                        pending: pending,
                        total: total,
                        complete: complete,
                        percent: complete / total * 100 | 0,
                        start: start,
                        end: end,
                        duration: end - start
                    });
                    if (--pending) next(); else cb(null, results);
                });
            }
            for (var i = 0; i < fns.length; i++) {
                if (i == max) break;
                next();
            }
            return this;
        };
    });
    require.register("component-type/index.js", function(exports, require, module) {
        var toString = Object.prototype.toString;
        module.exports = function(val) {
            switch (toString.call(val)) {
              case "[object Function]":
                return "function";

              case "[object Date]":
                return "date";

              case "[object RegExp]":
                return "regexp";

              case "[object Arguments]":
                return "arguments";

              case "[object Array]":
                return "array";

              case "[object String]":
                return "string";
            }
            if (val === null) return "null";
            if (val === undefined) return "undefined";
            if (val && val.nodeType === 1) return "element";
            if (val === Object(val)) return "object";
            return typeof val;
        };
    });
    require.register("component-clone/index.js", function(exports, require, module) {
        var type;
        try {
            type = require("type");
        } catch (e) {
            type = require("type-component");
        }
        module.exports = clone;
        function clone(obj) {
            switch (type(obj)) {
              case "object":
                var copy = {};
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        copy[key] = clone(obj[key]);
                    }
                }
                return copy;

              case "array":
                var copy = new Array(obj.length);
                for (var i = 0, l = obj.length; i < l; i++) {
                    copy[i] = clone(obj[i]);
                }
                return copy;

              case "regexp":
                var flags = "";
                flags += obj.multiline ? "m" : "";
                flags += obj.global ? "g" : "";
                flags += obj.ignoreCase ? "i" : "";
                return new RegExp(obj.source, flags);

              case "date":
                return new Date(obj.getTime());

              default:
                return obj;
            }
        }
    });
    require.register("component-indexof/index.js", function(exports, require, module) {
        var indexOf = [].indexOf;
        module.exports = function(arr, obj) {
            if (indexOf) return arr.indexOf(obj);
            for (var i = 0; i < arr.length; ++i) {
                if (arr[i] === obj) return i;
            }
            return -1;
        };
    });
    require.register("component-emitter/index.js", function(exports, require, module) {
        var index = require("indexof");
        module.exports = Emitter;
        function Emitter(obj) {
            if (obj) return mixin(obj);
        }
        function mixin(obj) {
            for (var key in Emitter.prototype) {
                obj[key] = Emitter.prototype[key];
            }
            return obj;
        }
        Emitter.prototype.on = function(event, fn) {
            this._callbacks = this._callbacks || {};
            (this._callbacks[event] = this._callbacks[event] || []).push(fn);
            return this;
        };
        Emitter.prototype.once = function(event, fn) {
            var self = this;
            this._callbacks = this._callbacks || {};
            function on() {
                self.off(event, on);
                fn.apply(this, arguments);
            }
            fn._off = on;
            this.on(event, on);
            return this;
        };
        Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = function(event, fn) {
            this._callbacks = this._callbacks || {};
            if (0 == arguments.length) {
                this._callbacks = {};
                return this;
            }
            var callbacks = this._callbacks[event];
            if (!callbacks) return this;
            if (1 == arguments.length) {
                delete this._callbacks[event];
                return this;
            }
            var i = index(callbacks, fn._off || fn);
            if (~i) callbacks.splice(i, 1);
            return this;
        };
        Emitter.prototype.emit = function(event) {
            this._callbacks = this._callbacks || {};
            var args = [].slice.call(arguments, 1), callbacks = this._callbacks[event];
            if (callbacks) {
                callbacks = callbacks.slice(0);
                for (var i = 0, len = callbacks.length; i < len; ++i) {
                    callbacks[i].apply(this, args);
                }
            }
            return this;
        };
        Emitter.prototype.listeners = function(event) {
            this._callbacks = this._callbacks || {};
            return this._callbacks[event] || [];
        };
        Emitter.prototype.hasListeners = function(event) {
            return !!this.listeners(event).length;
        };
    });
    require.register("component-bind/index.js", function(exports, require, module) {
        var slice = [].slice;
        module.exports = function(obj, fn) {
            if ("string" == typeof fn) fn = obj[fn];
            if ("function" != typeof fn) throw new Error("bind() requires a function");
            var args = [].slice.call(arguments, 2);
            return function() {
                return fn.apply(obj, args.concat(slice.call(arguments)));
            };
        };
    });
    require.register("bdd-flow/lib/bdd-flow/index.js", function(exports, require, module) {
        "use strict";
        exports.Bddflow = Bddflow;
        exports.create = function() {
            return new Bddflow();
        };
        exports.extend = function(ext) {
            return extend(Bddflow.prototype, ext);
        };
        exports.requireComponent = require;
        var Batch = require("batch");
        var bind = require("bind");
        var clone = require("clone");
        var configurable = require("configurable.js");
        var emitter = require("emitter");
        var extend = require("extend");
        var flowFnRegex = /^(it|describe|before|beforeEach|after|afterEach)$/;
        var defOmitContextRegex = {
            all: [ /^__conjure__/ ],
            describe: [],
            hook: [ flowFnRegex ],
            it: [ flowFnRegex ],
            rootDescribe: []
        };
        function Bddflow() {
            this.settings = {
                done: bddflowNoOp,
                itWrap: null,
                describeWrap: null,
                omitContextRegex: clone(defOmitContextRegex),
                path: [],
                grep: /.?/,
                grepv: null,
                sharedContext: {},
                stats: {
                    depth: 0
                },
                emit: bind(this, this.emit)
            };
            this.rootDescribes = [];
            this.batch = new Batch();
            this.seedProps = {};
        }
        Bddflow.describeConfigKeys = [ "describeWrap", "emit", "itWrap", "omitContextRegex", "path", "grep", "grepv", "sharedContext", "stats" ];
        configurable(Bddflow.prototype);
        emitter(Bddflow.prototype);
        Bddflow.prototype.addContextProp = function(key, val) {
            this.seedProps[key] = val;
            return this;
        };
        Bddflow.prototype.addRootDescribe = function(name, cb) {
            var self = this;
            var desc = new Describe(name);
            desc.describe(name, cb);
            this.rootDescribes.push(desc);
            return this;
        };
        Bddflow.prototype.currentDepth = function() {
            return this.get("stats").depth;
        };
        Bddflow.prototype.hideContextProp = function(type, regex) {
            if (typeof regex === "string") {
                regex = new RegExp("^" + regex + "$");
            }
            this.get("omitContextRegex")[type].push(regex);
            return this;
        };
        Bddflow.prototype.run = function() {
            var self = this;
            var batch = new Batch();
            batch.concurrency(1);
            this.set("sharedContext", this.seedProps);
            this.rootDescribes.forEach(function bddflowEachRootDescribe(desc) {
                batch.push(function bddflowBatchPushRootDescribe(taskDone) {
                    self.set("path", []);
                    Bddflow.describeConfigKeys.forEach(function bddflowForEachConfigKey(key) {
                        desc.set(key, self.get(key));
                    });
                    bddflowRunStepsInBatch(desc.steps, taskDone);
                });
            });
            batch.end(this.get("done"));
        };
        Bddflow.defaultHookImpl = function(done) {
            done();
        };
        function HookSet() {
            this.before = Bddflow.defaultHookImpl;
            this.beforeEach = Bddflow.defaultHookImpl;
            this.after = Bddflow.defaultHookImpl;
            this.afterEach = Bddflow.defaultHookImpl;
        }
        function ItCallback(name, cb) {
            this.name = name;
            this.cb = cb;
        }
        function Describe(name) {
            this.name = name;
            this.steps = [];
            this.hooks = new HookSet();
            this.settings = {};
        }
        configurable(Describe.prototype);
        Describe.copyConfig = function(src, dest) {
            Bddflow.describeConfigKeys.forEach(function bddflowDescribeCopyConfigIter(key) {
                dest.set(key, src.get(key));
            });
        };
        Describe.prototype.createStep = function(name, cb) {
            var self = this;
            return function(taskDone) {
                var desc = new Describe(name);
                Describe.copyConfig(self, desc);
                desc.runStep(name, cb);
                var batch = new Batch();
                batch.concurrency(1);
                batch.push(bind(desc, desc.beforeTask));
                batch.push(function bddflowRunNestedDescribeSteps(done) {
                    desc.steps = desc.steps.map(bind(desc, desc.prepareSteps));
                    bddflowRunStepsInBatch(desc.steps, done);
                });
                batch.push(bind(desc, desc.afterTask));
                batch.end(function bddflowEndDescribeBatch() {
                    desc.popStep();
                    taskDone();
                });
            };
        };
        Describe.prototype.extendSharedContext = function(ext, type) {
            return extend(this.get("sharedContext"), this.filterProps(ext, type));
        };
        Describe.prototype.filterProps = function(obj, type) {
            var omitContextRegex = this.get("omitContextRegex");
            var regex = omitContextRegex.all.concat(omitContextRegex[type]);
            return Object.keys(obj).reduce(function bddflowReduceFilterProps(memo, key) {
                var omit = false;
                regex.forEach(function bddflowForEachFilterPropsRegex(re) {
                    omit = omit || re.test(key);
                });
                if (omit) {
                    return memo;
                }
                memo[key] = obj[key];
                return memo;
            }, {});
        };
        Describe.prototype.getSharedContext = function(type) {
            return this.filterProps(this.get("sharedContext"), type);
        };
        Describe.prototype.prepareSteps = function(step) {
            var self = this;
            var path = this.get("path");
            if (step instanceof DescribeCallback) {
                var context = this.getSharedContext("describe");
                return new DescribeCallback(step.name, bind(context, step.cb));
            }
            var itPath = path.concat(step.name);
            var grep = this.get("grep");
            var grepv = this.get("grepv");
            if (grepv) {
                if (grepv.test(itPath.join(" "))) {
                    return new ItCallback(step.name, bddflowBatchNoOp);
                }
            } else if (grep) {
                if (!grep.test(itPath.join(" "))) {
                    return new ItCallback(step.name, bddflowBatchNoOp);
                }
            }
            return new ItCallback(step.name, function bddflowItCallback(done) {
                var batch = new Batch();
                batch.push(bind(self, self.beforeEachTask));
                batch.push(bind(self, self.itTask, step, itPath));
                batch.push(bind(self, self.afterEachTask));
                batch.concurrency(1);
                batch.end(done);
            });
        };
        Describe.prototype.runStep = function(name, cb) {
            var self = this;
            var path = this.get("path");
            path.push(name);
            var describeWrap = this.get("describeWrap") || bddflowDefDescribeWrap;
            describeWrap(name, function bddflowDescribeWrap() {
                var wrapContext = this || {};
                var mergedContext = self.extendSharedContext(wrapContext, "describe");
                mergedContext.describe = bind(self, self.describe);
                mergedContext.it = bind(self, self.it);
                mergedContext.before = bind(self, self.before);
                mergedContext.beforeEach = bind(self, self.beforeEach);
                mergedContext.after = bind(self, self.after);
                mergedContext.afterEach = bind(self, self.afterEach);
                bddflowAddInternalProp(mergedContext, "name", name);
                cb.call(mergedContext);
                self.pushStep();
            });
        };
        Describe.prototype.it = function(name, cb) {
            this.steps.push(new ItCallback(name, cb));
        };
        Describe.prototype.describe = function(name, cb) {
            this.steps.push(new DescribeCallback(name, this.createStep(name, cb)));
        };
        Describe.prototype.before = function(cb) {
            this.hooks.before = cb;
        };
        Describe.prototype.beforeTask = function(taskDone) {
            var self = this;
            var hook = this.hooks.before;
            var context = this.getSharedContext("hook");
            function bddflowBeforeDone() {
                self.extendSharedContext(context, "hook");
                taskDone();
            }
            if (hook.length) {
                this.hooks.before.call(context, bddflowBeforeDone);
            } else {
                this.hooks.before.call(context);
                bddflowBeforeDone();
            }
        };
        Describe.prototype.beforeEach = function(cb) {
            this.hooks.beforeEach = cb;
        };
        Describe.prototype.beforeEachTask = function(taskDone) {
            var self = this;
            var hook = this.hooks.beforeEach;
            var context = this.getSharedContext("hook");
            function bddflowBeforeEachDone() {
                self.extendSharedContext(context, "hook");
                taskDone();
            }
            if (hook.length) {
                this.hooks.beforeEach.call(context, bddflowBeforeEachDone);
            } else {
                this.hooks.beforeEach.call(context);
                bddflowBeforeEachDone();
            }
        };
        Describe.prototype.after = function(cb) {
            this.hooks.after = cb;
        };
        Describe.prototype.afterTask = function(taskDone) {
            var self = this;
            var hook = this.hooks.after;
            var context = this.getSharedContext("hook");
            function bddflowAfterDone() {
                self.extendSharedContext(context, "hook");
                taskDone();
            }
            if (hook.length) {
                this.hooks.after.call(context, bddflowAfterDone);
            } else {
                this.hooks.after.call(context);
                bddflowAfterDone();
            }
        };
        Describe.prototype.afterEach = function(cb) {
            this.hooks.afterEach = cb;
        };
        Describe.prototype.afterEachTask = function(taskDone) {
            var self = this;
            var hook = this.hooks.afterEach;
            var context = this.getSharedContext("hook");
            function bddflowAfterEachDone() {
                self.extendSharedContext(context, "hook");
                taskDone();
            }
            if (hook.length) {
                this.hooks.afterEach.call(context, bddflowAfterEachDone);
            } else {
                this.hooks.afterEach.call(context);
                bddflowAfterEachDone();
            }
        };
        Describe.prototype.itTask = function(step, path, taskDone) {
            var self = this;
            var context = this.getSharedContext("it");
            var emit = this.get("emit");
            var itWrap = this.get("itWrap") || bddflowDefItWrap;
            function bddflowItDone() {
                self.extendSharedContext(context, "it");
                emit("itPop", step.name);
                taskDone();
            }
            if (itWrap.length == 3) {
                itWrap(step.name, function bddflowItWrapAsync() {
                    var wrapContext = this || {};
                    extend(context, wrapContext);
                    bddflowAddInternalProp(context, "name", step.name, true);
                    bddflowAddInternalProp(context, "path", path, true);
                    emit("itPush", step.name);
                    step.cb.call(context);
                }, bddflowItDone);
            } else {
                itWrap(step.name, function bddflowItWrap() {
                    var wrapContext = this || {};
                    extend(context, wrapContext);
                    bddflowAddInternalProp(context, "name", step.name, true);
                    bddflowAddInternalProp(context, "path", path, true);
                    emit("itPush", step.name);
                    if (step.cb.length) {
                        step.cb.call(context, bddflowItDone);
                    } else {
                        step.cb.call(context);
                        bddflowItDone();
                    }
                });
            }
        };
        Describe.prototype.pushStep = function() {
            var emit = this.get("emit");
            var stats = this.get("stats");
            stats.depth++;
            this.set("stats", stats);
            emit("describePush", this.name);
        };
        Describe.prototype.popStep = function() {
            var emit = this.get("emit");
            var stats = this.get("stats");
            stats.depth--;
            this.set("stats", stats);
            emit("describePop", this.name);
        };
        function DescribeCallback(name, cb) {
            this.name = name;
            this.cb = cb;
        }
        function bddflowRunStepsInBatch(steps, cb) {
            var batch = new Batch();
            batch.concurrency(1);
            steps.forEach(function bddflowForEachStep(step) {
                batch.push(step.cb);
            });
            batch.end(cb);
        }
        function bddflowNoOp() {}
        function bddflowBatchNoOp(taskDone) {
            taskDone();
        }
        function bddflowDefItWrap(name, cb) {
            cb();
        }
        function bddflowDefDescribeWrap(name, cb) {
            cb();
        }
        function bddflowDelInternalProp(obj, key) {
            delete obj["__conjure__" + key];
        }
        function bddflowAddInternalProp(obj, key, val, writable) {
            Object.defineProperty(obj, "__conjure__" + key, {
                value: val,
                enumerable: false,
                configurable: true,
                writable: !!writable
            });
        }
    });
    require.alias("visionmedia-configurable.js/index.js", "bdd-flow/deps/configurable.js/index.js");
    require.alias("codeactual-extend/index.js", "bdd-flow/deps/extend/index.js");
    require.alias("visionmedia-batch/index.js", "bdd-flow/deps/batch/index.js");
    require.alias("component-emitter/index.js", "visionmedia-batch/deps/emitter/index.js");
    require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");
    require.alias("component-clone/index.js", "bdd-flow/deps/clone/index.js");
    require.alias("component-type/index.js", "component-clone/deps/type/index.js");
    require.alias("component-emitter/index.js", "bdd-flow/deps/emitter/index.js");
    require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");
    require.alias("component-bind/index.js", "bdd-flow/deps/bind/index.js");
    require.alias("bdd-flow/lib/bdd-flow/index.js", "bdd-flow/index.js");
    if (typeof exports == "object") {
        module.exports = require("bdd-flow");
    } else if (typeof define == "function" && define.amd) {
        define(function() {
            return require("bdd-flow");
        });
    } else {
        window["bddflow"] = require("bdd-flow");
    }
})();