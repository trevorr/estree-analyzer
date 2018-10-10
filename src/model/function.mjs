export const ThisMode = {
  Lexical: 'lexical',
  Strict: 'strict',
  Global: 'global'
};

export class Function {
  constructor(realm, environment, formalParameters, body, strict, arrow) {
    this.realm = realm;
    this.environment = environment;
    this.formalParameters = formalParameters;
    this.body = body;
    this.strict = strict;
    this.thisMode = arrow ? ThisMode.Lexical : strict ? ThisMode.Strict : ThisMode.Global;
    this.homeObject = undefined;
  }
}

export function newFunction(realm, environment, ast, withinStrict = false) {
  const body = ast.body.body;
  const strict = withinStrict ||
    (body.length >= 1 && !!body[0].expression && body[0].expression.value === 'use strict');
  const arrow = ast.type === 'ArrowFunctionExpression';
  const result = new Function(realm, environment, ast.params, ast.body, strict, arrow);
  if (ast.id && ast.id.name) {
    result.name = ast.id.name;
  }
  return result;
}
