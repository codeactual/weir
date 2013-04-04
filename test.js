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
      this.before(function(hookDone) { log.call(this, 'fb'); hookDone(); });
      this.after(function(hookDone) { log.call(this, 'fa');  hookDone(); });
      this.beforeEach(function(hookDone) { log.call(this, 'fbe'); hookDone(); });
      this.afterEach(function(hookDone) { log.call(this, 'fae'); hookDone(); });
      this.it('fi1', function(testDone) { log.call(this, 'fi1'); testDone(); });
      this.it('fi2', function(testDone) { log.call(this, 'fi2'); testDone(); });
      this.describe('d1', function() {
        this.before(function(hookDone) { log.call(this, 'd1b'); hookDone(); });
        this.after(function(hookDone) { log.call(this, 'd1a'); hookDone(); });
        this.beforeEach(function(hookDone) { log.call(this, 'd1be'); hookDone(); });
        this.afterEach(function(hookDone) { log.call(this, 'd1ae'); hookDone(); });
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

  it('should seed context properties', function(testDone) {
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

  it('should omit default context props from all', function(testDone) {
    // describe
    // it
    // before
    // beforeEach
    // after
    // afterEach
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

    var self = this;
    var results = [];

    var flow = new Bddflow();
    flow
      .set('done', done.bind(this))
      .addContextProp('__prop', 'foo')
      .addRootDescribe(this.test.name, function() {
        this.before(function(hookDone) { log.call(this, 'fb', 'it'); hookDone(); });
        this.describe('d', function() { log.call(this, 'd', '__prop'); });
        this.after(function(hookDone) { log.call(this, 'fa', 'it' );  hookDone(); });
        this.beforeEach(function(hookDone) { log.call(this, 'fbe', 'it'); hookDone(); });
        this.afterEach(function(hookDone) { log.call(this, 'fae', 'it'); hookDone(); });
        this.it('fi1', function(testDone) { log.call(this, 'fi1', 'it'); testDone(); });
      })
      .run();
  });

  it('should omit context props from describe()', function(testDone) {
    console.log('\x1B[33m<---------- INCOMPLETE'); testDone();
  });

  it('should omit context props from it()', function(testDone) {
    console.log('\x1B[33m<---------- INCOMPLETE'); testDone();
  });

  it('should omit context props from hooks', function(testDone) {
    // before
    // beforeEach
    // after
    // afterEach
    console.log('\x1B[33m<---------- INCOMPLETE'); testDone();
  });
});

describe('bdd-flow', function() {
  describe('#create()', function() {
    it('should return new instance', function() {
      bddflow.create().should.be.instanceOf(Bddflow);
    });
  });
});
