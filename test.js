var sinon = require('sinon');
var chai = require('chai');

var should = chai.should();
chai.Assertion.includeStack = true;
chai.use(require('sinon-chai'));

var bddflow = require('./dist/bdd-flow');
var Bddflow = bddflow.Bddflow;

describe('Bddflow', function() {
  it('should follow correct execution order', function(testDone) {
    function initDescribe() {
      this.before(function(done) { log.call(this, 'fb'); done(); });
      this.after(function(done) { log.call(this, 'fa'); actualOrder = this.shared; done(); });
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
    }

    function done() {
      actualOrder.should.deep.equal(expectedOrder);
      testDone();
    }

    function log(loc) {
      // Also verify shared/inherited contexts between hooks/describe/it by using it
      // to track execution order.
      this.shared = this.shared || [];
      this.shared.push(loc);
    }

    var expectedOrder = [
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
    var actualOrder;

    var flow = new Bddflow();
    flow
      .set('name', 'f')
      .set('done', done)
      .set('initDescribe', initDescribe)
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

