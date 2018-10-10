'use strict';

const environmentModel = require('./environment');

class Realm {
  constructor(globalObject, globalEnv) {
    this.globalObject = globalObject;
    this.globalEnv = globalEnv;
  }
}

function newRealm(globalObject, thisValue = globalObject) {
  const globalEnv = environmentModel.newGlobalEnvironment(globalObject, thisValue);
  return new Realm(globalObject, globalEnv);
}

module.exports = {
  Realm,
  newRealm
};
