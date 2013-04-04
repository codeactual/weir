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
      'fb',
      'fbe',
      'fi1',
      'fae',
      'fbe',
      'fi2',
      'fae',
      'd1b',
      'd1be',
      'd1i1',
      'd1ae',
      'd1be',
      'd1i2',
      'd1ae',
      'd1ai1',
      'd1a',
      'fa'
    ];

    this.initDescribe = function(log) {
      this.before(function() { log.call(this, 'fb'); });
      this.after(function() { log.call(this, 'fa');  });
      this.beforeEach(function() { log.call(this, 'fbe'); });
      this.afterEach(function() { log.call(this, 'fae'); });
      this.it('fi1', function() { log.call(this, 'fi1'); });
      this.it('fi2', function() { log.call(this, 'fi2'); });
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
  });

  it('should follow correct execution order', function(testDone) {
    function done() {
      actualOrder.should.deep.equal(this.expectedOrder);
      testDone();
    }

    function log(loc) {
      // Also verify shared/inherited contexts between hooks/describe/it by using it
      // to track execution order.
      this.shared = this.shared || [];
      this.shared.push(loc);
      actualOrder = this.shared;
    }

    var self = this;
    var actualOrder;

    var flow = new Bddflow();
    flow
      .set('done', done.bind(this))
      .addRootDescribe(this.test.name, function() {
        self.initDescribe.call(this, log);
      })
      .run();
  });

  it('should seed context properties', function(testDone) {
    function done() {
      prop.should.deep.equal(['first'].concat(this.expectedOrder));
      testDone();
    }

    function log(loc) {
      this.prop.push(loc);
      prop = this.prop;
    }

    function rootDescribe() {
      self.initDescribe.call(this, log);
    }

    var self = this;
    var prop = ['first'];

    var flow = new Bddflow();
    flow
      .set('done', done.bind(this))
      .addRootDescribe('subject', rootDescribe)
      .addContextProp('prop', prop)
      .run();
  });

  it('should omit default context props from all', function(testDone) {
    function done() {
      results.should.deep.equal([
        'fb:undefined',
        'd:undefined',
        'fbe:undefined',
        'fi1:undefined',
        'fae:undefined',
        'fa:undefined'
      ]);
      testDone();
    }

    function log(loc, propName) {
      results.push(loc + ':' + typeof this[propName]);
    }

    function rootDescribe() {
      this.before(function() { log.call(this, 'fb', 'it'); });
      this.describe('d', function() { log.call(this, 'd', '__prop'); });
      this.after(function() { log.call(this, 'fa', 'it' );  });
      this.beforeEach(function() { log.call(this, 'fbe', 'it'); });
      this.afterEach(function() { log.call(this, 'fae', 'it'); });
      this.it('fi1', function() { log.call(this, 'fi1', 'it'); });
    }

    var self = this;
    var results = [];

    var flow = new Bddflow();
    flow
      .set('done', done.bind(this))
      .addContextProp('__prop', 'foo')
      .addRootDescribe('subject', rootDescribe)
      .run();
  });

  it('should omit context props from it()', function(testDone) {
    function done() {
      results.should.deep.equal([
        'fb:string',
        'd:string',
        'fbe:string',
        'fi1:undefined',
        'fae:string',
        'fa:string'
      ]);
      testDone();
    }

    function log(loc, propName) {
      results.push(loc + ':' + typeof this[propName]);
    }

    function rootDescribe() {
      this.before(function() { log.call(this, 'fb', 'omitted'); });
      this.describe('d', function() { log.call(this, 'd', 'omitted'); });
      this.after(function() { log.call(this, 'fa', 'omitted' );  });
      this.beforeEach(function() { log.call(this, 'fbe', 'omitted'); });
      this.afterEach(function() { log.call(this, 'fae', 'omitted'); });
      this.it('fi1', function() { log.call(this, 'fi1', 'omitted'); });
    }

    var self = this;
    var results = [];

    var flow = new Bddflow();
    flow
      .set('done', done)
      .addContextProp('omitted', 'foo')
      .omitContextByRegex('it', /^omitted$/)
      .addRootDescribe('subject', rootDescribe)
      .run();
  });

  it('should omit context props from hooks', function(testDone) {
    function done() {
      results.should.deep.equal([
        'fb:undefined',
        'd:string',
        'fbe:undefined',
        'fi1:string',
        'fae:undefined',
        'fa:undefined'
      ]);
      testDone();
    }

    function log(loc, propName) {
      results.push(loc + ':' + typeof this[propName]);
    }

    function rootDescribe() {
      this.before(function() { log.call(this, 'fb', 'omitted'); });
      this.describe('d', function() { log.call(this, 'd', 'omitted'); });
      this.after(function() { log.call(this, 'fa', 'omitted' );  });
      this.beforeEach(function() { log.call(this, 'fbe', 'omitted'); });
      this.afterEach(function() { log.call(this, 'fae', 'omitted'); });
      this.it('fi1', function() { log.call(this, 'fi1', 'omitted'); });
    }

    var self = this;
    var results = [];

    var flow = new Bddflow();
    flow
      .set('done', done)
      .addContextProp('omitted', 'foo')
      .omitContextByRegex('hook', /^omitted$/)
      .addRootDescribe('subject', rootDescribe)
      .run();
  });

  it('should optionally wrap it() callbacks', function(testDone) {
    function done() {
      actualMergedContext.topLevel.fromIt.should.equal('itProp');
      actualMergedContext.topLevel.fromWrap.should.equal('wrapProp');
      actualMergedContext.nested.fromIt.should.equal('itProp');
      actualMergedContext.nested.fromWrap.should.equal('wrapProp');
      testDone();
    }

    function itWrap(name, cb) {
      cb.call(wrapperContext);
    }

    function rootDescribe() {
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
    }

    var wrapperContext = {fromWrap: 'wrapProp'};
    var actualMergedContext = {
      topLevel: undefined,
      nested: undefined
    };

    var flow = new Bddflow();
    flow
      .set('done', done)
      .set('itWrap', itWrap)
      .addContextProp('fromIt', 'itProp')
      .addRootDescribe('subject', rootDescribe)
      .run();
  });

  it('should store describe() and it() names', function(testDone) {
    function done() {
      results.should.deep.equal(['r', 'd', 'i2', 'i1']);
      testDone();
    }

    function log() {
      results.push(this.__name);
    }

    function rootDescribe() {
      log.call(this);
      this.describe('d', function() {
        log.call(this);
        this.it('i2', function() { log.call(this); });
      });
      this.it('i1', function() { log.call(this); });
    }

    var self = this;
    var results = [];

    var flow = new Bddflow();
    flow
      .set('done', done)
      .addRootDescribe('r', rootDescribe)
      .run();
  });

  it('should track BDD path', function(testDone) {
    function done() {
      results.should.deep.equal([
        ['r', 'd', 'i2'],
        ['r', 'd', 'd2', 'i3'],
        ['r', 'i1']
      ]);
      testDone();
    }

    function log(loc) {
      results.push(this.__path);
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

    var self = this;
    var results = [];

    var flow = new Bddflow();
    flow
      .set('done', done)
      .addRootDescribe('r', rootDescribe)
      .run();
  });

  it('should optionally filter it() execution by BDD path', function(testDone) {
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

    var self = this;
    var results;

    var batch = new Batch();

    batch.push(function(taskDone) {
      results = [];
      var flow = new Bddflow();
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
      var flow = new Bddflow();
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
      var flow = new Bddflow();
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
      var flow = new Bddflow();
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
      var flow = new Bddflow();
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
});

describe('bdd-flow', function() {
  describe('#create()', function() {
    it('should return new instance', function() {
      bddflow.create().should.be.instanceOf(Bddflow);
    });
  });
});
