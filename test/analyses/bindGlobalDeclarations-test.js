'use strict';

const chai = require('chai');
const expect = chai.expect;
const acorn = require('acorn');
const bindGlobalDeclarations = require('../../src/analyses/bindGlobalDeclarations');
const contextModel = require('../../src/model/context');
const realmModel = require('../../src/model/realm');

describe('bindGlobalDeclarations', function () {
  it('seems to work', function () {
    const input = `var v1 = 1, v2 = {};
var { v3, ...v4 } = v2;
const c1 = 42;
function f() { v1; var vf1; }
let l1;
let [ l2, , l3 ] = [1, 2, 3];
if (true) {
  var v5, v6;
  let l4, l5;
} else {
  var v5, v7;
  let l4, l6;
}
class C {
  method() {
    var v8;
    let l7;
  }
}
function f() { v2; var vf2; }
var f;
`;
    const ast = acorn.parse(input);
    const realm = realmModel.newRealm({});
    const context = contextModel.newExecutionContext(realm);
    bindGlobalDeclarations(ast, context);
    expect(context.variableEnvironment.record.getBoundNames()).to.have.members([
      'C',
      'c1',
      'f',
      'l1',
      'l2',
      'l3',
      'v1',
      'v2',
      'v3',
      'v4',
      'v5',
      'v6',
      'v7'
    ]);
  });
});