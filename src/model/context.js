'use strict';

class ExecutionContext {
  constructor(realm, variableEnvironment, lexicalEnvironment) {
    this.realm = realm;
    this.variableEnvironment = variableEnvironment;
    this.lexicalEnvironment = lexicalEnvironment;
    this.strict = false;
  }
  setEnvironment(env) {
    this.variableEnvironment = env;
    this.lexicalEnvironment = env;
  }
}

function newExecutionContext(realm) {
  return new ExecutionContext(realm, realm.globalEnv, realm.globalEnv);
}

module.exports = {
  ExecutionContext,
  newExecutionContext
};
