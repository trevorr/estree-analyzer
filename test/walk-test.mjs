import { expect } from 'chai';

import { walk } from '../src/walk.mjs';

const acorn = require('acorn');

const ast = acorn.parse(`var x = 1
function f(a) { var q = x + a; return q }
class C {
  constructor() { this.y = 2 }
  method() { return this.y }
}
f(3)`);

describe('walk', function () {
  it('walks declarations', function () {
    const items = [];
    walk(ast, undefined, {
      Declaration(node) {
        items.push(node);
      }
    });
    expect(items[0].type).to.equal('VariableDeclaration');
    expect(items[0].declarations[0].id.name).to.equal('x');
    expect(items[1].type).to.equal('VariableDeclaration');
    expect(items[1].declarations[0].id.name).to.equal('q');
    expect(items[2].type).to.equal('FunctionDeclaration');
    expect(items[2].id.name).to.equal('f');
    expect(items[3].type).to.equal('ClassDeclaration');
    expect(items[3].id.name).to.equal('C');
  });
  it('walks statements that are not declarations', function () {
    const items = [];
    walk(ast, undefined, {
      Statement(node) {
        if (node.type !== 'VariableDeclaration') {
          items.push(node);
        }
      }
    });
    expect(items[0].type).to.equal('ReturnStatement');
    expect(items[0].argument.name).to.equal('q');
    expect(items[1].type).to.equal('ExpressionStatement');
    expect(items[1].expression.type).to.equal('AssignmentExpression');
    expect(items[2].type).to.equal('ReturnStatement');
    expect(items[2].argument.type).to.equal('MemberExpression');
    expect(items[3].type).to.equal('ExpressionStatement');
    expect(items[3].expression.type).to.equal('CallExpression');
  });
  it('walks expressions', function () {
    const items = [];
    walk(ast, undefined, {
      Expression(node) {
        items.push(node.name || node.value || node.operator || node.type);
      }
    });
    expect(items).to.eql([
      1,
      'x',
      'a',
      '+',
      'q',
      'ThisExpression',
      2,
      '=',
      'FunctionExpression',
      'ThisExpression',
      'MemberExpression',
      'FunctionExpression',
      'f',
      3,
      'CallExpression'
    ]);
  });
  it('walks top-level expressions', function () {
    const items = [];
    walk(ast, undefined, {
      ExpressionBefore(node) {
        items.push(node.name || node.value || node.operator || node.type);
        return false;
      }
    });
    expect(items).to.eql([
      1,
      '+',
      'q',
      'FunctionExpression',
      'FunctionExpression',
      'CallExpression'
    ]);
  });
  it('walks patterns', function () {
    const items = [];
    walk(ast, undefined, {
      Pattern(node) {
        items.push(node.name || node.value || node.type);
      }
    });
    expect(items).to.eql([
      'x',
      'f',
      'a',
      'q',
      'C',
      'constructor',
      'y',
      'MemberExpression',
      'method',
      'y'
    ]);
  });
  it('tracks ancestors', function () {
    const state = {
      ancestors: []
    };
    const items = [];
    walk(ast, state, {
      Identifier(node, state) {
        if (node.name === 'q') {
          items.push(state.ancestors.map(a => a.type));
        }
      }
    });
    expect(items).to.eql([
      [
        'Program',
        'FunctionDeclaration',
        'BlockStatement',
        'VariableDeclaration',
        'VariableDeclarator',
        'Identifier'
      ],
      [
        'Program',
        'FunctionDeclaration',
        'BlockStatement',
        'ReturnStatement',
        'Identifier'
      ]
    ]);
  });
});