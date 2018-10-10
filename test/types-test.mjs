import { expect } from 'chai';

import * as types from '../src/types.mjs';

describe('types', function () {
  describe('arrayOf', function () {
    it('handles no element type', function () {
      expect(types.arrayOf()).to.equal('array');
      expect(types.arrayOf(null)).to.equal('array');
    });
    it('handles a simple element type', function () {
      expect(types.arrayOf('number')).to.eql({
        kind: 'array',
        elements: 'number'
      });
    });
    it('handles a complex element type', function () {
      expect(types.arrayOf(types.arrayOf('number'))).to.eql({
        kind: 'array',
        elements: {
          kind: 'array',
          elements: 'number'
        }
      });
    });
  });
  describe('kindOf', function () {
    it('handles undefined', function () {
      expect(types.kindOf(undefined)).to.equal('undefined');
    });
    it('handles null', function () {
      expect(types.kindOf(null)).to.equal('null');
    });
    it('handles arrays', function () {
      expect(types.kindOf([])).to.equal('array');
    });
    it('handles symbols', function () {
      expect(types.kindOf(Symbol())).to.equal('symbol');
    });
  });
  describe('getKind', function () {
    it('handles undefined', function () {
      expect(types.getKind()).to.be.undefined;
    });
    it('handles simple types', function () {
      expect(types.getKind('array')).to.equal('array');
    });
    it('handles complex types', function () {
      expect(types.getKind({
        kind: 'array',
        elements: 'number'
      })).to.equal('array');
    });
    it('handles union types', function () {
      expect(types.getKind(['string', 'number'])).to.equal('union');
    });
  });
  describe('hasKind', function () {
    it('handles undefined', function () {
      expect(types.hasKind(undefined, 'any')).to.be.false;
    });
    it('handles simple types', function () {
      const type = 'number';
      expect(types.hasKind(type, 'number')).to.be.true;
      expect(types.hasKind(type, 'array')).to.be.false;
    });
    it('handles complex types', function () {
      const type = {
        kind: 'array',
        elements: 'number'
      };
      expect(types.hasKind(type, 'array')).to.be.true;
      expect(types.hasKind(type, 'number')).to.be.false;
    });
    it('handles union types', function () {
      const type = ['string', 'number'];
      expect(types.hasKind(type, 'string')).to.be.true;
      expect(types.hasKind(type, 'number')).to.be.true;
      expect(types.hasKind(type, 'array')).to.be.false;
    });
    it('handles empty union', function () {
      expect(types.hasKind([], 'any')).to.be.false;
    });
  });
  describe('isFalsy', function () {
    it('handles undefined', function () {
      expect(types.isFalsy(undefined)).to.be.false;
    });
    it('handles `undefined` type', function () {
      expect(types.isFalsy('undefined')).to.be.true;
    });
    it('handles `null` type', function () {
      expect(types.isFalsy('undefined')).to.be.true;
    });
    it('handles `symbol` type', function () {
      expect(types.isFalsy('symbol')).to.be.false;
    });
    it('handles `object` type', function () {
      expect(types.isFalsy('object')).to.be.false;
    });
    it('handles `function` type', function () {
      expect(types.isFalsy('function')).to.be.false;
    });
    it('handles `array` type', function () {
      expect(types.isFalsy('array')).to.be.false;
    });
    it('handles `any` type', function () {
      expect(types.isFalsy('any')).to.be.false;
    });
    it('handles other simple types', function () {
      expect(types.isFalsy('boolean')).to.be.false;
      expect(types.isFalsy('number')).to.be.false;
      expect(types.isFalsy('string')).to.be.false;
    });
    it('handles complex types', function () {
      const type = {
        kind: 'array',
        elements: 'number'
      };
      expect(types.isFalsy(type)).to.be.false;
    });
    it('handles union types', function () {
      expect(types.isFalsy(['undefined', 'null'])).to.be.true;
      expect(types.isFalsy(['string', 'null'])).to.be.false;
      expect(types.isFalsy(['string', 'number'])).to.be.false;
    });
    it('handles empty union', function () {
      expect(types.isFalsy([])).to.be.false;
    });
  });
  describe('isTruthy', function () {
    it('handles undefined', function () {
      expect(types.isTruthy(undefined)).to.be.false;
    });
    it('handles `undefined` type', function () {
      expect(types.isTruthy('undefined')).to.be.false;
    });
    it('handles `null` type', function () {
      expect(types.isTruthy('undefined')).to.be.false;
    });
    it('handles `symbol` type', function () {
      expect(types.isTruthy('symbol')).to.be.true;
    });
    it('handles `object` type', function () {
      expect(types.isTruthy('object')).to.be.true;
    });
    it('handles `function` type', function () {
      expect(types.isTruthy('function')).to.be.true;
    });
    it('handles `array` type', function () {
      expect(types.isTruthy('array')).to.be.true;
    });
    it('handles `any` type', function () {
      expect(types.isTruthy('any')).to.be.false;
    });
    it('handles other simple types', function () {
      expect(types.isTruthy('boolean')).to.be.false;
      expect(types.isTruthy('number')).to.be.false;
      expect(types.isTruthy('string')).to.be.false;
    });
    it('handles complex types', function () {
      const type = {
        kind: 'array',
        elements: 'number'
      };
      expect(types.isTruthy(type)).to.be.true;
    });
    it('handles union types', function () {
      expect(types.isTruthy(['undefined', 'null'])).to.be.false;
      expect(types.isTruthy(['string', 'null'])).to.be.false;
      expect(types.isTruthy(['string', 'object'])).to.be.false;
      expect(types.isTruthy(['array', 'object'])).to.be.true;
    });
    it('handles empty union', function () {
      expect(types.isTruthy([])).to.be.false;
    });
  });
  describe('isAssignable', function () {
    it('handles undefined target', function () {
      expect(types.isAssignable(undefined, 'any')).to.be.false;
    });
    it('handles `any` target', function () {
      expect(types.isAssignable('any', undefined)).to.be.true;
    });
    it('handles canonical types', function () {
      const type = {
        kind: 'object'
      };
      expect(types.isAssignable(type, type)).to.be.true;
    });
    it('handles unions', function () {
      const a = ['string', 'number', 'null'];
      const b = ['string', 'number'];
      expect(types.isAssignable(a, b)).to.be.true;
      expect(types.isAssignable(b, a)).to.be.false;
    });
    it('handles arrays', function () {
      const a = {
        kind: 'array',
        elements: 'any'
      };
      const b = {
        kind: 'array',
        elements: 'number'
      };
      const c = 'array';
      expect(types.isAssignable(a, b)).to.be.true;
      expect(types.isAssignable(b, a)).to.be.false;
      expect(types.isAssignable(a, c)).to.be.true;
      expect(types.isAssignable(c, a)).to.be.false;
    });
    it('handles functions', function () {
      const a = {
        kind: 'function',
        returns: 'any',
        params: [{
          type: 'any'
        }]
      };
      const b = {
        kind: 'function',
        returns: 'string',
        params: [{
          type: 'any'
        }]
      };
      const c = {
        kind: 'function',
        returns: 'string',
        params: [{
          type: 'string'
        }]
      };
      const d = 'function';
      expect(types.isAssignable(a, b)).to.be.true;
      expect(types.isAssignable(b, a)).to.be.false;
      expect(types.isAssignable(a, c)).to.be.false;
      expect(types.isAssignable(c, a)).to.be.false;
      expect(types.isAssignable(b, c)).to.be.false;
      expect(types.isAssignable(c, b)).to.be.true;
      expect(types.isAssignable(a, d)).to.be.false;
      expect(types.isAssignable(d, a)).to.be.false;
    });
    it('allows arrays assigned to objects', function () {
      expect(types.isAssignable('object', 'array')).to.be.true;
      expect(types.isAssignable('array', 'object')).to.be.false;
    });
  });
  describe('isNotAssignable', function () {
    it('handles undefined', function () {
      expect(types.isNotAssignable(undefined, 'any')).to.be.false;
      expect(types.isNotAssignable('any', undefined)).to.be.false;
    });
  });
  describe('union', function () {
    it('handles undefined', function () {
      expect(types.union(undefined, 'any')).to.be.undefined;
      expect(types.union('any', undefined)).to.be.undefined;
    });
    it('handles non-unions', function () {
      expect(types.union('number', 'number')).to.be.equal('number');
      expect(types.union('object', 'array')).to.be.equal('object');
      expect(types.union('array', 'object')).to.be.equal('object');
      expect(types.union('number', 'string')).to.be.eql(['number', 'string']);
      expect(types.union('string', 'number')).to.be.eql(['string', 'number']);
    });
    it('handles unions', function () {
      expect(types.union(
        ['number', 'string'],
        ['string', 'number'])).to.be.eql(
        ['number', 'string']);
      expect(types.union(
        ['string', 'number'],
        ['number', 'string'])).to.be.eql(
        ['string', 'number']);
      expect(types.union(
        ['string', 'array', 'number'],
        ['number', 'object', 'boolean'])).to.be.eql(
        ['string', 'number', 'object', 'boolean']);
    });
  });
  describe('formatType', function () {
    it('handles undefined', function () {
      expect(types.formatType()).to.be.equal('unknown');
    });
    it('handles simple types', function () {
      expect(types.formatType('string')).to.be.equal('string');
      expect(types.formatType('object')).to.be.equal('object');
      expect(types.formatType('function')).to.be.equal('function');
      expect(types.formatType('array')).to.be.equal('array');
      expect(types.formatType('any')).to.be.equal('any');
    });
    it('handles arrays', function () {
      expect(types.formatType({
        kind: 'array',
        elements: 'number'
      })).to.be.equal('number[]');
    });
    it('handles functions with unspecified parameters', function () {
      expect(types.formatType({
        kind: 'function',
        returns: 'number'
      })).to.be.equal('function: number');
    });
    it('handles nullary functions', function () {
      expect(types.formatType({
        kind: 'function',
        returns: 'number',
        params: []
      })).to.be.equal('function(): number');
    });
    it('handles functions with complex parameters', function () {
      expect(types.formatType({
        kind: 'function',
        returns: {
          kind: 'array',
          elements: 'number'
        },
        params: [{
          type: {
            kind: 'array',
            elements: 'number'
          }
        }, {
          name: 'foo'
        }, {
          name: 'bar',
          type: [{
            kind: 'array',
            elements: 'string'
          }, 'null']
        }]
      })).to.be.equal('function(:number[], foo, bar: string[] | null): number[]');
    });
    it('handles precedence', function () {
      expect(types.formatType({
        kind: 'array',
        elements: {
          kind: 'function',
          returns: ['number', 'string'],
          params: [{
            type: ['string', 'null']
          }]
        }
      })).to.be.equal('(function(:string | null): (number | string))[]');
    });
  });
  describe('toCanonical', function () {
    it('handles undefined', function () {
      expect(types.toCanonical()).to.be.undefined;
    });
    it('handles simple types', function () {
      expect(types.toCanonical('array')).to.eql({
        kind: 'array'
      });
    });
    it('handles nested types', function () {
      expect(types.toCanonical({
        kind: 'array',
        elements: 'number'
      })).to.eql({
        kind: 'array',
        elements: {
          kind: 'number'
        }
      });
    });
    it('handles union types', function () {
      expect(types.toCanonical(['string', 'number'])).to.eql({
        kind: 'union',
        anyOf: [{
            kind: 'string'
          },
          {
            kind: 'number'
          }
        ]
      });
    });
  });
  describe('toShorthand', function () {
    it('handles undefined', function () {
      expect(types.toShorthand()).to.be.undefined;
    });
    it('handles simple types', function () {
      expect(types.toShorthand({
        kind: 'array'
      })).to.eql('array');
    });
    it('handles nested types', function () {
      expect(types.toShorthand({
        kind: 'array',
        elements: {
          kind: 'number'
        }
      })).to.eql({
        kind: 'array',
        elements: 'number'
      });
    });
    it('handles union types', function () {
      expect(types.toShorthand({
        kind: 'union',
        anyOf: [{
            kind: 'string'
          },
          {
            kind: 'number'
          }
        ]
      })).to.eql(['string', 'number']);
    });
  });
});