'use strict';

const chai = require('chai');
const expect = chai.expect;
const acorn = require('acorn');
const bindFunctionDeclarations = require('../../src/analyses/bindFunctionDeclarations');
const contextModel = require('../../src/model/context');
const environmentModel = require('../../src/model/environment');
const functionModel = require('../../src/model/function');
const realmModel = require('../../src/model/realm');

describe('bindFunctionDeclarations', function () {
  it('seems to work', function () {
    const funcSource = `(
function f(x) {
  function g(y) {
    return y * 2;
  }
  var p = g(x);
  if (p > 0) {
    var q = p + 1;
    let r = q * 10;
    return r;
  } else {
    var q = p - 1;
    let r = q * 10;
    return r;
  }
  return p;
})`;
    const funcAst = acorn.parseExpressionAt(funcSource);
    const callSource = `f(1)`;
    const callAst = acorn.parseExpressionAt(callSource);
    const realm = realmModel.newRealm({});
    const context = contextModel.newExecutionContext(realm);
    const func = functionModel.newFunction(realm, context.variableEnvironment, funcAst, context.strict);
    context.setEnvironment(environmentModel.newFunctionEnvironment(func));
    bindFunctionDeclarations(func, callAst.arguments, context);
    expect(context.variableEnvironment.record.getBoundNames()).to.have.members([
      'arguments',
      'g',
      'p',
      'q',
      'x'
    ]);
  });
});