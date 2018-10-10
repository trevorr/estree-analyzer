import assert from 'assert';
import { ThisMode } from './function.mjs';

export class LexicalEnvironment {
  constructor(record, outer = null) {
    this.record = record;
    this.outer = outer;
  }
}

export class EnvironmentRecord {}

export class DeclarativeEnvironmentRecord extends EnvironmentRecord {
  constructor() {
    super();
    this.bindings = {};
  }
  getBoundNames() {
    return Object.keys(this.bindings);
  }
  hasBinding(name) {
    return name in this.bindings;
  }
  createMutableBinding(name, deletable) {
    assert(!this.hasBinding(name));
    this.bindings[name] = {
      mutable: true,
      initialized: false,
      deletable
    }
  }
  createImmutableBinding(name, strict) {
    assert(!this.hasBinding(name));
    this.bindings[name] = {
      mutable: false,
      initialized: false,
      strict
    }
  }
  initializeBinding(name, value) {
    const binding = this.bindings[name];
    assert(binding && !binding.initialized);
    binding.value = value;
    binding.initialized = true;
  }
  setMutableBinding(name, value, strict) {
    const binding = this.bindings[name];
    if (!binding) {
      if (strict) {
        throw new ReferenceError(`${name} is not defined`);
      }
      this.createMutableBinding(name, true);
      this.initializeBinding(name, value);
      return;
    }
    if (binding.strict) {
      strict = true;
    }
    if (!binding.initialized) {
      throw new ReferenceError(`${name} is not initialized`);
    }
    if (binding.mutable) {
      binding.value = value;
    } else {
      throw new TypeError(`${name} is immutable`);
    }
  }
  getBindingValue(name) {
    const binding = this.bindings[name];
    // assert(binding);
    if (!binding.initialized) {
      throw new ReferenceError(`${name} is not initialized`);
    }
    return binding.value;
  }
  deleteBinding(name) {
    const binding = this.bindings[name];
    // assert(binding);
    if (!binding.deletable) {
      return false;
    }
    delete this.bindings[name];
    return true;
  }
  hasThisBinding() {
    return false;
  }
  hasSuperBinding() {
    return false;
  }
  withBaseObject() {
    // undefined
  }
}

export class ObjectEnvironmentRecord extends EnvironmentRecord {
  constructor(object, withEnvironment) {
    super();
    this.object = object;
    this.withEnvironment = withEnvironment;
  }
  getBoundNames() {
    const names = [];
    for (const name in this.object) {
      if (!this.withEnvironment || !this._isUnscopable(name)) {
        names.push(name);
      }
    }
    return names;
  }
  hasBinding(name) {
    return name in this.object && (!this.withEnvironment || !this._isUnscopable(name));
  }
  _isUnscopable(name) {
    const unscopables = this.object[Symbol.unscopables];
    if (unscopables && typeof unscopables === 'object') {
      return !!unscopables[name];
    }
    return false;
  }
  createMutableBinding(name, deletable) {
    return Object.defineProperty(this.object, name, {
      value: undefined,
      writable: true,
      enumerable: true,
      configurable: deletable
    });
  }
  createImmutableBinding() {
    assert.fail('ObjectEnvironmentRecord.createImmutableBinding is never used');
  }
  initializeBinding(name, value) {
    return this.setMutableBinding(name, value, false)
  }
  setMutableBinding(name, value, strict) {
    if (strict && !(name in this.object)) {
      throw new ReferenceError(`${name} is not defined`);
    }
    try {
      this.object[name] = value;
      return true;
    } catch (e) {
      if (strict) {
        throw e;
      }
      return false;
    }
  }
  getBindingValue(name, strict) {
    if (strict && !(name in this.object)) {
      throw new ReferenceError(`${name} is not defined`);
    }
    return this.object[name];
  }
  deleteBinding(name) {
    return delete this.object[name];
  }
  hasThisBinding() {
    return false;
  }
  hasSuperBinding() {
    return false;
  }
  withBaseObject() {
    if (this.withEnvironment) {
      return this.object;
    }
  }
}

export class GlobalEnvironmentRecord extends EnvironmentRecord {
  constructor(objectRecord, globalThis) {
    super();
    this.objectRecord = objectRecord;
    this.globalThis = globalThis;
    this.declarativeRecord = new DeclarativeEnvironmentRecord();
    this.varNames = new Set();
  }
  getBoundNames() {
    return this.declarativeRecord.getBoundNames().concat(this.objectRecord.getBoundNames());
  }
  hasBinding(name) {
    return this.declarativeRecord.hasBinding(name) || this.objectRecord.hasBinding(name);
  }
  createMutableBinding(name, deletable) {
    if (this.declarativeRecord.hasBinding(name)) {
      throw new TypeError(`${name} is already defined`);
    }
    return this.declarativeRecord.createMutableBinding(name, deletable);
  }
  createImmutableBinding(name, strict) {
    if (this.declarativeRecord.hasBinding(name)) {
      throw new TypeError(`${name} is already defined`);
    }
    return this.declarativeRecord.createImmutableBinding(name, strict);
  }
  initializeBinding(name, value) {
    if (this.declarativeRecord.hasBinding(name)) {
      return this.declarativeRecord.initializeBinding(name, value);
    }
    return this.objectRecord.initializeBinding(name, value);
  }
  setMutableBinding(name, value, strict) {
    if (this.declarativeRecord.hasBinding(name)) {
      return this.declarativeRecord.setMutableBinding(name, value, strict);
    }
    return this.objectRecord.setMutableBinding(name, value, strict);
  }
  getBindingValue(name, strict) {
    if (this.declarativeRecord.hasBinding(name)) {
      return this.declarativeRecord.getBindingValue(name, strict);
    }
    return this.objectRecord.getBindingValue(name, strict);
  }
  deleteBinding(name) {
    if (this.declarativeRecord.hasBinding(name)) {
      return this.declarativeRecord.deleteBinding(name);
    }
    const globalObject = this.objectRecord.object;
    if (globalObject.hasOwnProperty(name)) {
      const status = this.objectRecord.deleteBinding(name);
      if (status) {
        this.varNames.delete(name);
      }
      return status;
    }
    return true;
  }
  hasThisBinding() {
    return true;
  }
  hasSuperBinding() {
    return false;
  }
  withBaseObject() {
    // undefined
  }
  getThisBinding() {
    return this.globalThis;
  }
  hasVarDeclaration(name) {
    return this.varNames.has(name);
  }
  hasLexicalDeclaration(name) {
    return this.declarativeRecord.hasBinding(name);
  }
  hasRestrictedGlobalProperty(name) {
    const globalObject = this.objectRecord.object;
    const existingProp = Object.getOwnPropertyDescriptor(globalObject, name);
    return !!existingProp && !existingProp.configurable;
  }
  canDeclareGlobalVar(name) {
    const globalObject = this.objectRecord.object;
    if (globalObject.hasOwnProperty(name)) {
      return true;
    }
    return Object.isExtensible(globalObject);
  }
  canDeclareGlobalFunction(name) {
    const globalObject = this.objectRecord.object;
    const existingProp = Object.getOwnPropertyDescriptor(globalObject, name);
    if (!existingProp) {
      return Object.isExtensible(globalObject);
    }
    return existingProp.configurable || (existingProp.writable && existingProp.enumerable);
  }
  createGlobalVarBinding(name, deletable) {
    const globalObject = this.objectRecord.object;
    if (!globalObject.hasOwnProperty(name) && Object.isExtensible(globalObject)) {
      this.objectRecord.createMutableBinding(name, deletable);
      this.objectRecord.initializeBinding(name);
    }
    this.varNames.add(name);
  }
  createGlobalFunctionBinding(name, value, deletable) {
    const globalObject = this.objectRecord.object;
    const existingProp = Object.getOwnPropertyDescriptor(globalObject, name);
    let desc;
    if (!existingProp || existingProp.configurable) {
      desc = {
        value,
        writable: true,
        enumerable: true,
        configurable: deletable
      };
    } else {
      desc = {
        value
      };
    }
    Object.defineProperty(globalObject, name, desc);
    globalObject[name] = value;
    this.varNames.add(name);
  }
}

export const BindingStatus = {
  Lexical: 'lexical',
  Initialized: 'initialized',
  Uninitialized: 'uninitialized'
}

export class FunctionEnvironmentRecord extends DeclarativeEnvironmentRecord {
  constructor(functionObject, newTarget) {
    super();
    this.functionObject = functionObject;
    this.thisBindingStatus = functionObject.thisMode === ThisMode.Lexical ?
      BindingStatus.Lexical : BindingStatus.Uninitialized;
    this.thisValue = undefined;
    this.homeObject = functionObject.homeObject;
    this.newTarget = newTarget;
  }
  bindThisValue(value) {
    assert(this.thisBindingStatus !== BindingStatus.Lexical);
    if (this.thisBindingStatus === BindingStatus.Initialized) {
      throw new ReferenceError('this is already bound');
    }
    this.thisValue = value;
    this.thisBindingStatus = BindingStatus.Initialized;
  }
  hasThisBinding() {
    return this.thisBindingStatus !== BindingStatus.Lexical;
  }
  hasSuperBinding() {
    return this.thisBindingStatus !== BindingStatus.Lexical && this.homeObject !== undefined;
  }
  getThisBinding() {
    assert(this.thisBindingStatus !== BindingStatus.Lexical);
    if (this.thisBindingStatus === BindingStatus.Uninitialized) {
      throw new ReferenceError('this is not bound');
    }
    return this.thisValue;
  }
  getSuperBase() {
    if (this.homeObject !== undefined) {
      return Object.getPrototypeOf(this.homeObject);
    }
  }
}

export class ModuleEnvironmentRecord extends DeclarativeEnvironmentRecord {
  getBindingValue(name) {
    const binding = this.bindings[name];
    // assert(binding);
    if ('module' in binding) {
      const {
        module,
        nameInModule
      } = binding;
      const targetEnv = module.environment;
      if (!targetEnv) {
        throw new ReferenceError(`No module environment for ${name}`);
      }
      return targetEnv.record.getBindingValue(nameInModule, true);
    }
    if (!binding.initialized) {
      throw new ReferenceError(`${name} is not initialized`);
    }
    return binding.value;
  }
  deleteBinding() {
    // never used
    return false;
  }
  hasThisBinding() {
    return true;
  }
  getThisBinding() {
    // undefined
  }
  createImportBinding(name, module, nameInModule) {
    assert(!this.hasBinding(name));
    assert(module.environment);
    assert(module.environment.record.hasBinding(nameInModule));
    this.bindings[name] = {
      mutable: false,
      initialized: true,
      strict: true,
      module,
      nameInModule
    }
  }
}

export function newDeclarativeEnvironment(outer) {
  const record = new DeclarativeEnvironmentRecord();
  return new LexicalEnvironment(record, outer);
}

export function newObjectEnvironment(object, outer) {
  const record = new ObjectEnvironmentRecord(object, true);
  return new LexicalEnvironment(record, outer);
}

export function newGlobalEnvironment(globalObject, thisValue) {
  const objectRecord = new ObjectEnvironmentRecord(globalObject, false);
  const record = new GlobalEnvironmentRecord(objectRecord, thisValue);
  return new LexicalEnvironment(record);
}

export function newFunctionEnvironment(functionObject, newTarget) {
  const record = new FunctionEnvironmentRecord(functionObject, newTarget);
  return new LexicalEnvironment(record, functionObject.environment);
}

export function newModuleEnvironment(outer) {
  const record = new ModuleEnvironmentRecord();
  return new LexicalEnvironment(record, outer);
}
