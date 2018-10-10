import { expect } from 'chai';

import { analyze, Scope } from '../src/index.mjs';

const acorn = require('acorn');

describe('analyze', function () {
  it('produces demo results', function () {
    let expr = acorn.parseExpressionAt(`'1 + 2 * 3 = ' + (1 + 2 * 3)`);
    let analysis = analyze(expr);
    expect(analysis).to.eql({
      "type": "string",
      "value": "1 + 2 * 3 = 7"
    });

    expr = acorn.parseExpressionAt(`obj && obj.nested && obj.nested.prop`);
    let scope = new Scope();
    analysis = analyze(expr, scope);
    expect(scope.members).to.eql({
      "obj": {
        "name": "obj",
        "type": "object",
        "members": {
          "nested": {
            "name": "nested",
            "type": "object",
            "members": {
              "prop": {
                "name": "prop"
              }
            }
          }
        }
      }
    });
  });
  it('evaluates constant expressions', function () {
    const expr = acorn.parseExpressionAt(`({ a: 1 + 2 * 3 - 'hello'.length })["a"] ^ [1, 2, 3][2] + 'yes'`);
    const analysis = analyze(expr);
    expect(analysis.type).to.equal('number');
    expect(analysis.value).to.equal(2);
  });
  it('evaluates template literals', function () {
    const expr = acorn.parseExpressionAt('`a${1 + 2}b${"c" || "d"}${null && "e"}f${1 ? 2 : 3}`');
    const analysis = analyze(expr);
    expect(analysis.type).to.equal('string');
    expect(analysis.value).to.equal('a3bcnullf2');
  });
  it('adds names to scope', function () {
    const expr = acorn.parseExpressionAt("it.stuff && `${it.stuff.things.join()}` || 'nothing'");
    const scope = new Scope();
    analyze(expr, scope);
    expect(scope.resolve('it')).to.have.property('type', 'object');
    expect(scope.resolve('it.stuff')).to.have.property('type', 'object');
    expect(scope.resolve('it.stuff.things')).to.have.property('type', 'object');
    expect(scope.resolve('it.stuff.things.join')).to.not.be.null;
  });
  it('returns union type for array expression element type', function () {
    const expr = acorn.parseExpressionAt('[1, "b", true]');
    const analysis = analyze(expr);
    expect(analysis.type.kind).to.equal('array');
    expect(analysis.type.elements).to.have.members(['number', 'string', 'boolean']);
    expect(analysis.value).to.eql([1, 'b', true]);
  });
  it('short circuits ||', function () {
    const expr = acorn.parseExpressionAt('(x => 42) || []');
    const analysis = analyze(expr);
    expect(analysis.type).to.equal('function');
  });
  it('short circuits &&', function () {
    const expr = acorn.parseExpressionAt('null && x');
    const analysis = analyze(expr);
    expect(analysis.type).to.equal('null');
  });
  it('returns union type for logical expression', function () {
    const expr = acorn.parseExpressionAt('!x || []');
    const analysis = analyze(expr);
    expect(analysis.type).to.have.members(['array', 'boolean']);
  });
  it('returns union type for conditional expression', function () {
    const expr = acorn.parseExpressionAt('x > 100 ? x - 100 : "too small"');
    const analysis = analyze(expr);
    expect(analysis.type).to.have.members(['number', 'string']);
  });
  it('supports array unions', function () {
    const expr = acorn.parseExpressionAt('x ? [1, 2, null] : [3, "four"]');
    const analysis = analyze(expr);
    expect(analysis.type).to.eql([{
        "kind": "array",
        "elements": [
          "number",
          "null"
        ]
      },
      {
        "kind": "array",
        "elements": [
          "number",
          "string"
        ]
      }
    ]);
  });
  it('supports array destructuring', function () {
    const expr = acorn.parseExpressionAt('([a, b, c] = [1, 2, 3])');
    const scope = new Scope();
    const analysis = analyze(expr, scope);
    expect(analysis.type).to.eql({
      kind: 'array',
      elements: 'number'
    });
    expect(analysis.value).to.eql([1, 2, 3]);
    expect(scope.members).to.have.keys('a', 'b', 'c');
  });
  it('supports object destructuring', function () {
    const expr = acorn.parseExpressionAt('({ a, b, c } = { a: 1, b: 2, c: 3 })');
    const scope = new Scope();
    const analysis = analyze(expr, scope);
    expect(analysis.type).to.equal('object');
    expect(analysis.value).to.eql({
      a: 1,
      b: 2,
      c: 3
    });
    expect(scope.members).to.have.keys('a', 'b', 'c');
  });
});