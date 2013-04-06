var sinon = require('sinon');
var chai = require('chai');

var should = chai.should();
chai.Assertion.includeStack = true;
chai.use(require('sinon-chai'));

var bddflow = require('./dist/bdd-flow');
var Bddflow = bddflow.Bddflow;

var requireComponent = bddflow.require;
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
      actualOrder = this.shared;
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

    function log(loc) {
      this.prop.push(loc);
      prop = this.prop;
    }

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

  it('should apply default context property omission regex', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) {
      results.push(loc + ':' + typeof this[propName]);
    }

    this.flow
      .addContextProp('__prop', 'foo')
      .addRootDescribe('subject', function() {
        this.before(function() { log.call(this, 'b', 'it'); });
        this.describe('d', function() { log.call(this, 'd', '__prop'); });
        this.after(function() { log.call(this, 'a', 'it' );  });
        this.beforeEach(function() { log.call(this, 'be', 'it'); });
        this.afterEach(function() { log.call(this, 'ae', 'it'); });
        this.it('i1', function() { log.call(this, 'i1', 'it'); });
      })
      .set('done', function() { // No flow function should see '__prop' due to /^__/
        results.should.deep.equal([
          'b:undefined',
          'd:undefined',
          'be:undefined',
          'i1:undefined',
          'ae:undefined',
          'a:undefined'
        ]);
        testDone();
      })
      .run();
  });

  it('should omit context props from it()', function(testDone) {
    var self = this;
    var results = [];

    function log(loc, propName) {
      results.push(loc + ':' + typeof this[propName]);
    }

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

    function log(loc, propName) {
      results.push(loc + ':' + typeof this[propName]);
    }

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

  it('should optionally wrap it() callbacks', function(testDone) {
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
        this.it('expectation', function(testDone) {
          actualMergedContext.topLevel = this;
          testDone();
        });

        this.describe('nested subject', function() {
          this.it('expectation', function(testDone) {
            actualMergedContext.nested = this;
            testDone();
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

  it('should store describe() and it() names', function(testDone) {
    var self = this;
    var results = [];

    function log() {
      results.push(this.__name);
    }

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

    function log(loc) {
      results.push(this.__path);
    }

    this.flow
      .addRootDescribe('r', function() {
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
          ['r', 'd', 'i2'],
          ['r', 'd', 'd2', 'i3'],
          ['r', 'i1']
        ]);
        testDone();
      })
      .run();
  });

  it('should optionally filter it() execution by BDD path regex', function(testDone) {
    var self = this;
    var results;

    function log(loc) {
      results.push(loc);
    }

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

  it('should optionally omit it() execution by BDD path regex', function(testDone) {
    var self = this;
    var results;

    function log(loc) {
      results.push(loc);
    }

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

  it('should support multiple root describes', function(testDone) {
    var self = this;
    var actualOrder = [];

    function log(loc) {
      actualOrder.push(loc);
    }

    this.flow
      .addRootDescribe('subject 1', function() {
        self.defaultDescribe.call(this, log);
      })
      .addRootDescribe('subject 2', function() {
        self.defaultDescribe.call(this, log);
      })
      .set('done', function() {
        actualOrder.should.deep.equal(self.expectedOrder.concat(self.expectedOrder));
        testDone();
      })
      .run();
  });

  it('should track running state', function(testDone) {
    var self = this;

    this.flow
      .addRootDescribe('subject 2', function() {})
      .set('done', function() {
        self.flow.isRunning().should.equal(true);
        testDone();
      });

    this.flow.isRunning().should.equal(false);
    this.flow.run();
  });
});
