import { newGlobalEnvironment } from '../model/environment.mjs';

export class Realm {
  constructor(globalObject, globalEnv) {
    this.globalObject = globalObject;
    this.globalEnv = globalEnv;
  }
}

export function newRealm(globalObject, thisValue = globalObject) {
  const globalEnv = newGlobalEnvironment(globalObject, thisValue);
  return new Realm(globalObject, globalEnv);
}
