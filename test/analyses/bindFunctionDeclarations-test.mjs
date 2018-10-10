import { expect } from 'chai';

import { bindFunctionDeclarations } from '../../src/analyses/bindFunctionDeclarations.mjs';
import { newExecutionContext } from '../../src/model/context.mjs';
import { newFunctionEnvironment } from '../../src/model/environment.mjs';
import { newFunction } from '../../src/model/function.mjs';
import { newRealm } from '../../src/model/realm.mjs';

const acorn = require('acorn');

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
    const realm = newRealm({});
    const context = newExecutionContext(realm);
    const func = newFunction(realm, context.variableEnvironment, funcAst, context.strict);
    context.setEnvironment(newFunctionEnvironment(func));
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