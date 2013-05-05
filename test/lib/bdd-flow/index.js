/*jshint expr:true*/
var sinon = require('sinon');
var chai = require('chai');

var should = chai.should();
chai.Assertion.includeStack = true;
chai.use(require('sinon-chai'));

var bddflow = require('../../..');
var Bddflow = bddflow.Bddflow;

var requireComponent = bddflow.requireComponent;
var Batch = requireComponent('batch');

describe('Bddflow', function() {
  beforeEach(function() {
    this.expectedOrder = [
      'b',
      'be',
      'i1',
      'ae',
      'be',
      'i2',
      'ae',
      'd1b',
      'd1be',
      'd1i1',
      'd1ae',
      'd1be',
      'd1i2',
      'd1ae',
      'd1ai1',
      'd1a',
      'a'
    ];

    this.defaultDescribe = function(log) {
      this.before(function() { log.call(this, 'b'); });
      this.after(function() { log.call(this, 'a');  });
      this.beforeEach(function() { log.call(this, 'be'); });
      this.afterEach(function() { log.call(this, 'ae'); });
      this.it('i1', function() { log.call(this, 'i1'); });
      this.it('i2', function() { log.call(this, 'i2'); });
      this.describe('d1', function() {
        this.before(function() { log.call(this, 'd1b'); });
        this.after(function() { log.call(this, 'd1a'); });
        this.beforeEach(function() { log.call(this, 'd1be'); });
        this.afterEach(function() { log.call(this, 'd1ae'); });
        this.it('d1i1', function() { log.call(this, 'd1i1'); });
        this.it('d1i2', function() { log.call(this, 'd1i2'); });
        this.describe('d1a', function() {
          this.it('d1ai1', function() { log.call(this, 'd1ai1'); });
        });
      });
    };

    this.flow = bddflow.create();
  });

  it('should follow correct execution order', function(testDone) {
    var self = this;
    var actualOrder;

    function log(loc) { // Passed to this.defaultDescribe
      // Also verify shared/inherited contexts between hooks/describe/it by using it
      // to track execution order.
      this.shared = this.shared || [];
      this.shared.push(loc);
      if (loc === 'a') { actualOrder = this.shared; }
    }

    this.flow
      .addRootDescribe(this.test.name, function() {
        self.defaultDescribe.call(this, log);
      })
      .set('done', function() {
        actualOrder.should.deep.equal(self.expectedOrder);
        testDone();
      })
      .run();
  });

  it('should seed context properties', function(testDone) {
    var self = this;
    var prop = ['first']; // Verify this gets updated with more items.

    function log(loc) { this.prop.push(loc); prop = this.prop; }

    this.flow
      .addRootDescribe('subject', function() {
        self.defaultDescribe.call(this, log);
      })
      .addContextProp('prop', prop)
      .set('done', function() {
        prop.should.deep.equal(['first'].concat(self.expectedOrder));
        testDone();
      })
      .run();
  });

  it('should pass context from #before to #it', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) { results.push(loc + ':' + this.prop); }

    this.flow
      .addRootDescribe('subject', function() {
        this.describe('d', function() {
          this.before(function() { this.prop = 'foo'; });
          this.it('i1', function() { log.call(this, 'i1'); });
        });
      })
      .set('done', function() {
        results.should.deep.equal(['i1:foo']);
        testDone();
      })
      .run();
  });

  it('should pass context from #beforeEach to #it', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) { results.push(loc + ':' + this.prop); }

    this.flow
      .addRootDescribe('subject', function() {
        this.describe('d', function() {
          this.beforeEach(function() { this.prop = 'foo'; });
          this.it('i1', function() { log.call(this, 'i1'); });
        });
      })
      .set('done', function() {
        results.should.deep.equal(['i1:foo']);
        testDone();
      })
      .run();
  });

  it('should pass context from #afterEach to #it', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) { results.push(loc + ':' + this.prop); }

    this.flow
      .addRootDescribe('subject', function() {
        this.describe('d', function() {
          this.afterEach(function() { this.prop++; });
          this.it('i1', function() { this.prop = 1; });
          this.it('i2', function() { log.call(this, 'i2'); });
        });
      })
      .set('done', function() {
        results.should.deep.equal(['i2:2']);
        testDone();
      })
      .run();
  });

  it('should pass context from #after to #it', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) { results.push(loc + ':' + this.prop); }

    this.flow
      .addRootDescribe('subject', function() {
        this.describe('d', function() {
          this.after(function() { this.prop++; });
          this.it('i1', function() { this.prop = 1; });
        });
        this.describe('d2', function() {
          this.it('i2', function() { log.call(this, 'i2'); });
        });
      })
      .set('done', function() {
        results.should.deep.equal(['i2:2']);
        testDone();
      })
      .run();
  });

  it('should pass context from #it to #it', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) { results.push(loc + ':' + this.prop); }

    this.flow
      .addRootDescribe('subject', function() {
        this.before(function() { this.prop = 0; });
        this.describe('d', function() {
          this.it('i1', function() { this.prop++; log.call(this, 'i1'); });
          this.it('i2', function() { this.prop++; log.call(this, 'i2'); });
        });
        this.describe('d2', function() {
          this.it('i3', function() { this.prop++; log.call(this, 'i3'); });
        });
      })
      .set('done', function() {
        results.should.deep.equal(['i1:1', 'i2:2', 'i3:3']);
        testDone();
      })
      .run();
  });

  it('should omit bdd-flow class props', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) {
      results.push(
        loc + ':' +
        [
          typeof this.settings,
          typeof this.set,
          typeof this.addRootDescribe
        ].join(',')
      );
    }

    this.flow
      .addRootDescribe('subject', function() {
        this.before(function() { log.call(this, 'b'); });
        this.beforeEach(function() { log.call(this, 'be'); });
        this.it('i1', function() { log.call(this, 'i1'); });
        this.describe('d', function() { log.call(this, 'd'); });
        this.afterEach(function() { log.call(this, 'ae'); });
        this.after(function() { log.call(this, 'a');  });
      })
      .set('done', function() {
        results.should.deep.equal([
          'b:undefined,undefined,undefined',
          'be:undefined,undefined,undefined',
          'i1:undefined,undefined,undefined',
          'ae:undefined,undefined,undefined',
          'd:undefined,undefined,undefined',
          'a:undefined,undefined,undefined'
        ]);
        testDone();
      })
      .run();
  });

  it('should omit Describe methods non-#describe contexts', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) {
      results.push(
        loc + ':' +
        [
          typeof this.describe,
          typeof this.it,
          typeof this.before,
          typeof this.beforeEach,
          typeof this.after,
          typeof this.afterEach
        ].join(',')
      );
    }

    this.flow
      .addRootDescribe('subject', function() {
        this.before(function() { log.call(this, 'b'); });
        this.beforeEach(function() { log.call(this, 'be'); });
        this.it('i1', function() { log.call(this, 'i1'); });
        this.describe('d', function() {
          this.it('i2', function() { log.call(this, 'i2'); });
        });
        this.after(function() { log.call(this, 'a');  });
        this.afterEach(function() { log.call(this, 'ae'); });
      })
      .set('done', function() {
        results.should.deep.equal([
          'b:undefined,undefined,undefined,undefined,undefined,undefined',
          'be:undefined,undefined,undefined,undefined,undefined,undefined',
          'i1:undefined,undefined,undefined,undefined,undefined,undefined',
          'ae:undefined,undefined,undefined,undefined,undefined,undefined',
          'i2:undefined,undefined,undefined,undefined,undefined,undefined',
          'a:undefined,undefined,undefined,undefined,undefined,undefined'
        ]);
        testDone();
      })
      .run();
  });

  it('should omit context props from #it', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) { results.push(loc + ':' + typeof this[propName]); }

    var prop = 'it-cant-see-me';

    this.flow
      .addContextProp(prop, 'foo')
      .hideContextProp('it', new RegExp('^' + prop + '$'))
      .addRootDescribe('subject', function() {
        this.before(function() { log.call(this, 'b', prop); });
        this.describe('d', function() { log.call(this, 'd', prop); });
        this.after(function() { log.call(this, 'a', prop );  });
        this.beforeEach(function() { log.call(this, 'be', prop); });
        this.afterEach(function() { log.call(this, 'ae', prop); });
        this.it('i1', function() { log.call(this, 'i1', prop); });
      })
      .set('done', function() {
        results.should.deep.equal([
          'b:string',
          'd:string',
          'be:string',
          'i1:undefined',
          'ae:string',
          'a:string'
        ]);
        testDone();
      })
      .run();
  });

  it('should omit context props from hooks', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) { results.push(loc + ':' + typeof this[propName]); }

    var prop = 'hooks-cant-see-me';

    this.flow
      .addContextProp(prop, 'foo')
      .hideContextProp('hook', new RegExp('^' + prop + '$'))
      .addRootDescribe('subject', function() {
        this.before(function() { log.call(this, 'b', prop); });
        this.describe('d', function() { log.call(this, 'd', prop); });
        this.after(function() { log.call(this, 'a', prop );  });
        this.beforeEach(function() { log.call(this, 'be', prop); });
        this.afterEach(function() { log.call(this, 'ae', prop); });
        this.it('i1', function() { log.call(this, 'i1', prop); });
      })
      .set('done', function() {
        results.should.deep.equal([
          'b:undefined',
          'd:string',
          'be:undefined',
          'i1:string',
          'ae:undefined',
          'a:undefined'
        ]);
        testDone();
      })
      .run();
  });

  it('should omit context prop by exact string', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) { results.push(loc + ':' + typeof this[propName]); }

    var prop = 'it-cant-see-me';

    this.flow
      .addContextProp(prop, 'foo')
      .hideContextProp('it', prop)
      .addRootDescribe('subject', function() {
        this.it('i1', function() { log.call(this, 'i1', prop); });
      })
      .set('done', function() {
        results.should.deep.equal(['i1:undefined']);
        testDone();
      })
      .run();
  });

  it('should optionally wrap #it callbacks', function(testDone) {
    var wrapperContext = {fromWrap: 'wrapProp'};
    var actualMergedContext = {
      topLevel: undefined,
      nested: undefined
    };

    function itWrap(name, cb) {
      cb.call(wrapperContext);
    }

    this.flow
      .set('itWrap', itWrap)
      .addContextProp('fromIt', 'itProp')
      .addRootDescribe('subject', function() {
        this.it('expectation', function() {
          actualMergedContext.topLevel = this;
        });

        this.describe('nested subject', function() {
          this.it('expectation', function() {
            actualMergedContext.nested = this;
          });
        });
      })
      .set('done', function() {
        actualMergedContext.topLevel.fromIt.should.equal('itProp');
        actualMergedContext.topLevel.fromWrap.should.equal('wrapProp');
        actualMergedContext.nested.fromIt.should.equal('itProp');
        actualMergedContext.nested.fromWrap.should.equal('wrapProp');
        testDone();
      })
      .run();
  });

  it('should optionally wrap #describe callbacks', function(testDone) {
    var wrapperContext = {fromWrap: 'wrapProp'};
    var actualMergedContext = {
      topLevel: undefined,
      nested: undefined
    };

    function describeWrap(name, cb) { cb.call(wrapperContext); }

    this.flow
      .set('describeWrap', describeWrap)
      .addContextProp('fromDescribe', 'describeProp')
      .addRootDescribe('subject', function() {
        actualMergedContext.topLevel = this;
        this.describe('nested subject', function() {
          actualMergedContext.nested = this;
        });
      })
      .set('done', function() {
        actualMergedContext.topLevel.fromDescribe.should.equal('describeProp');
        actualMergedContext.topLevel.fromWrap.should.equal('wrapProp');
        actualMergedContext.nested.fromDescribe.should.equal('describeProp');
        actualMergedContext.nested.fromWrap.should.equal('wrapProp');
        testDone();
      })
      .run();
  });

  it('should store #describe and #it names', function(testDone) {
    var self = this;
    var results = [];

    function log() { results.push(this.__conjure__name); }

    this.flow
      .addRootDescribe('r', function() {
        log.call(this);
        this.describe('d', function() {
          log.call(this);
          this.it('i2', function() { log.call(this); });
        });
        this.it('i1', function() { log.call(this); });
      })
      .set('done', function() {
        results.should.deep.equal(['r', 'd', 'i2', 'i1']);
        testDone();
      })
      .run();
  });

  it('should track BDD path', function(testDone) {
    var self = this;
    var results = [];

    function log(loc) { results.push(this.__conjure__path); }

    this.flow
      .addRootDescribe('r1', function() {
        this.describe('d', function() {
          this.it('i2', function() { log.call(this, 'i2'); });
          this.describe('d2', function() {
            this.it('i3', function() { log.call(this, 'i3'); });
          });
        });
        this.it('i1', function() { log.call(this, 'i1'); });
      })
      .addRootDescribe('r2', function() {
        this.describe('d', function() {
          this.it('i2', function() { log.call(this, 'i2'); });
          this.describe('d2', function() {
            this.it('i3', function() { log.call(this, 'i3'); });
          });
        });
        this.it('i1', function() { log.call(this, 'i1'); });
      })
      .set('done', function() {
        results.should.deep.equal([
          ['r1', 'd', 'i2'],
          ['r1', 'd', 'd2', 'i3'],
          ['r1', 'i1'],
          ['r2', 'd', 'i2'],
          ['r2', 'd', 'd2', 'i3'],
          ['r2', 'i1']
        ]);
        testDone();
      })
      .run();
  });

  it('should optionally filter #it execution by BDD path regex', function(testDone) {
    var self = this;
    var results;

    function log(loc) { results.push(loc); }

    function rootDescribe() {
      this.describe('d', function() {
        this.it('i2', function() { log.call(this, 'i2'); });
        this.describe('d2', function() {
          this.it('i3', function() { log.call(this, 'i3'); });
        });
      });
      this.it('i1', function() { log.call(this, 'i1'); });
    }

    var batch = new Batch();

    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grep', /i1/)
        .set('done', function done() {
          results.should.deep.equal(['i1']);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grep', /i2/)
        .set('done', function done() {
          results.should.deep.equal(['i2']);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grep', /d2/)
        .set('done', function done() {
          results.should.deep.equal(['i3']);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grep', /d/)
        .set('done', function done() {
          results.should.deep.equal(['i2', 'i3']);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grep', /r/)
        .set('done', function done() {
          results.should.deep.equal(['i2', 'i3', 'i1']);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.end(testDone);
  });

  it('should optionally omit #it execution by BDD path regex', function(testDone) {
    var self = this;
    var results;

    function log(loc) { results.push(loc); }

    function rootDescribe() {
      this.describe('d', function() {
        this.it('i2', function() { log.call(this, 'i2'); });
        this.describe('d2', function() {
          this.it('i3', function() { log.call(this, 'i3'); });
        });
      });
      this.it('i1', function() { log.call(this, 'i1'); });
    }

    var batch = new Batch();

    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grepv', /i1/)
        .set('done', function done() {
          results.should.deep.equal(['i2', 'i3']);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grepv', /i2/)
        .set('done', function done() {
          results.should.deep.equal(['i3', 'i1']);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grepv', /d2/)
        .set('done', function done() {
          results.should.deep.equal(['i2', 'i1']);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grepv', /d/)
        .set('done', function done() {
          results.should.deep.equal(['i1']);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.push(function(taskDone) {
      results = [];
      var flow = bddflow.create();
      flow
        .set('grepv', /r/)
        .set('done', function done() {
          results.should.deep.equal([]);
          taskDone();
        })
        .addRootDescribe('r', rootDescribe)
        .run();
    });
    batch.end(testDone);
  });

  it('should follow correct execution order w/ multiple roots', function(testDone) {
    var self = this;
    var actualOrder = [];

    function log(loc) { actualOrder.push(loc); }

    this.flow
      .addRootDescribe('r1', function() {
        self.defaultDescribe.call(this, log);
      })
      .addRootDescribe('r2', function() {
        self.defaultDescribe.call(this, log);
      })
      .set('done', function() {
        actualOrder.should.deep.equal(self.expectedOrder.concat(self.expectedOrder));
        testDone();
      })
      .run();
  });

  it('should track stack depth', function(testDone) {
    var self = this;
    var actualStats = [];

    var expectedStats = [
      {loc: 'b', depth: 1},
      {loc: 'be', depth: 1},
      {loc: 'i1', depth: 1},
      {loc: 'ae', depth: 1},
      {loc: 'be', depth: 1},
      {loc: 'i2', depth: 1},
      {loc: 'ae', depth: 1},
      {loc: 'd1b', depth: 2},
      {loc: 'd1be', depth: 2},
      {loc: 'd1i1', depth: 2},
      {loc: 'd1ae', depth: 2},
      {loc: 'd1be', depth: 2},
      {loc: 'd1i2', depth: 2},
      {loc: 'd1ae', depth: 2},
      {loc: 'd1ai1', depth: 3},
      {loc: 'd1a', depth: 2},
      {loc: 'a', depth: 1}
    ];

    function log(loc) { actualStats.push({loc: loc, depth: self.flow.currentDepth()}); }

    this.flow
      .addRootDescribe('r1', function() {
        self.defaultDescribe.call(this, log);
      })
      .addRootDescribe('r2', function() {
        self.defaultDescribe.call(this, log);
      })
      .set('done', function() {
        actualStats.should.deep.equal(expectedStats.concat(expectedStats));
        testDone();
      })
      .run();
  });

  it('should emit describe-step events', function(testDone) {
    var self = this;
    var actualEvents = [];

    var expectedEvents = [
      {event: 'push', name: 'r1'},
      {event: 'push', name: 'd1'},
      {event: 'push', name: 'd1a'},
      {event: 'pop', name: 'd1a'},
      {event: 'pop', name: 'd1'},
      {event: 'pop', name: 'r1'},
      {event: 'push', name: 'r2'},
      {event: 'push', name: 'd1'},
      {event: 'push', name: 'd1a'},
      {event: 'pop', name: 'd1a'},
      {event: 'pop', name: 'd1'},
      {event: 'pop', name: 'r2'}
    ];

    this.flow.on('describePush', function(name) {
      actualEvents.push({event: 'push', name: name});
    });

    this.flow.on('describePop', function(name) {
      actualEvents.push({event: 'pop', name: name});
    });

    function noOp() {}

    this.flow
      .addRootDescribe('r1', function() {
        self.defaultDescribe.call(this, noOp);
      })
      .addRootDescribe('r2', function() {
        self.defaultDescribe.call(this, noOp);
      })
      .set('done', function() {
        actualEvents.should.deep.equal(expectedEvents);
        testDone();
      })
      .run();
  });

  it('should emit it-step events', function(testDone) {
    var self = this;
    var actualEvents = [];

    var expectedEvents = [
      {event: 'push', name: 'i1'},
      {event: 'pop', name: 'i1'},
      {event: 'push', name: 'i2'},
      {event: 'pop', name: 'i2'},
      {event: 'push', name: 'd1i1'},
      {event: 'pop', name: 'd1i1'},
      {event: 'push', name: 'd1i2'},
      {event: 'pop', name: 'd1i2'},
      {event: 'push', name: 'd1ai1'},
      {event: 'pop', name: 'd1ai1'},
      {event: 'push', name: 'i1'},
      {event: 'pop', name: 'i1'},
      {event: 'push', name: 'i2'},
      {event: 'pop', name: 'i2'},
      {event: 'push', name: 'd1i1'},
      {event: 'pop', name: 'd1i1'},
      {event: 'push', name: 'd1i2'},
      {event: 'pop', name: 'd1i2'},
      {event: 'push', name: 'd1ai1'},
      {event: 'pop', name: 'd1ai1'}
    ];

    this.flow.on('itPush', function(name) {
      actualEvents.push({event: 'push', name: name});
    });

    this.flow.on('itPop', function(name) {
      actualEvents.push({event: 'pop', name: name});
    });

    function noOp() {}

    this.flow
      .addRootDescribe('r1', function() {
        self.defaultDescribe.call(this, noOp);
      })
      .addRootDescribe('r2', function() {
        self.defaultDescribe.call(this, noOp);
      })
      .set('done', function() {
        actualEvents.should.deep.equal(expectedEvents);
        testDone();
      })
      .run();
  });
});
