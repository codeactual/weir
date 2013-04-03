var sinon = require('sinon');
var chai = require('chai');

var should = chai.should();
chai.Assertion.includeStack = true;
chai.use(require('sinon-chai'));

var bddflow = require('./dist/bdd-flow');
var Bddflow = bddflow.Bddflow;

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
      this.before(function(done) { log.call(this, 'fb'); done(); });
      this.after(function(done) { log.call(this, 'fa');  done(); });
      this.beforeEach(function(done) { log.call(this, 'fbe'); done(); });
      this.afterEach(function(done) { log.call(this, 'fae'); done(); });
      this.it('fi1', function(testDone) { log.call(this, 'fi1'); testDone(); });
      this.it('fi2', function(testDone) { log.call(this, 'fi2'); testDone(); });
      this.describe('d1', function() {
        this.before(function(done) { log.call(this, 'd1b'); done(); });
        this.after(function(done) { log.call(this, 'd1a'); done(); });
        this.beforeEach(function(done) { log.call(this, 'd1be'); done(); });
        this.afterEach(function(done) { log.call(this, 'd1ae'); done(); });
        this.it('d1i1', function(testDone) { log.call(this, 'd1i1'); testDone(); });
        this.it('d1i2', function(testDone) { log.call(this, 'd1i2'); testDone(); });
        this.describe('d1a', function() {
          this.it('d1ai1', function(testDone) { log.call(this, 'd1ai1'); testDone(); });
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

  it('should let client seed context properties', function(testDone) {
    function done() {
      prop.should.deep.equal(['first'].concat(this.expectedOrder));
      testDone();
    }

    function log(loc) {
      this.prop.push(loc);
      prop = this.prop;
    }

    var self = this;
    var prop = ['first'];

    var flow = new Bddflow();
    flow
      .set('done', done.bind(this))
      .addRootDescribe(this.test.name, function() {
        self.initDescribe.call(this, log);
      })
      .addContextProp('prop', prop)
      .run();
  });
});

describe('bdd-flow', function() {
  describe('#create()', function() {
    it('should return new instance', function() {
      bddflow.create().should.be.instanceOf(Bddflow);
    });
  });
});
