var sinon = require('sinon');
var chai = require('chai');

var should = chai.should();
chai.Assertion.includeStack = true;
chai.use(require('sinon-chai'));

var bddflow = require('./dist/bdd-flow');
var Bddflow = bddflow.Bddflow;
var requireComponent = bddflow.require;

requireComponent('sinon-doublist')(sinon, 'mocha');

describe('bddflow', function() {
  describe('Bddflow', function() {
    beforeEach(function() {
      this.bddflow = new Bddflow();
      this.bddflow
        .set('nativeRequire', require)
        .init();

      this.resOK = {code: 0};
    });

    it('should do something', function() {
      console.log('\x1B[33m<---------- INCOMPLETE');
    });
  });
});
