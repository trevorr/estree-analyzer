/**
 * Scope class module.
 * @module scope
 * @private
 */

/**
 * Represents a JavaScript variable scope.
 * @alias Scope
 */
export class Scope {
  /**
   * Constructs a new Scope.
   * 
   * @param {*} [thisRef] static `this` reference for this scope
   * @param {boolean} [strict] whether strict mode is enabled
   * @param {?Scope} [parent] the containing scope or `null` if none
   * @param {boolean} [topLevel] whether this is a global or function scope
   * @param {Object} [members] mapping of member names to associated data
   */
  constructor(thisRef, strict = false, parent = null, topLevel = parent === null, members = {}) {
    this.parent = parent;
    this.strict = strict;
    this.thisRef = thisRef;
    this.topLevel = topLevel;
    this.members = members;
  }

  /**
   * Creates a non-strict, non-top level root scope that wraps the given object
   * mapping member names to associated data. The static `this` reference is undefined.
   * 
   * @param {Object} members an object mapping member names to data
   * @returns {Scope} a new scope
   */
  static withMembers(members) {
    return new Scope(undefined, false, null, false, members);
  }

  /**
   * Creates a nested scope that inherits the static `this` reference and strict mode
   * of this scope. The nested scope is initially not marked as top-level.
   * 
   * @returns {Scope} the nested scope
   */
  createNested() {
    return new Scope(this.thisRef, this.strict, this, false);
  }

  /**
   * Returns the containing scope of this scope, or `null` for the root scope.
   * 
   * @returns {?Scope} the parent scope or `null`
   */
  getParent() {
    return this.parent;
  }

  /**
   * Returns the root scope.
   * 
   * @returns {Scope} the root scope
   */
  getRoot() {
    let scope = this;
    while (scope.parent) {
      scope = scope.parent;
    }
    return scope;
  }

  /**
   * Returns whether this scope is in strict mode. The only effect strict mode
   * has on the operation of this class is that it suppresses the static `this`
   * reference for non-root scopes in strict mode.
   * 
   * @returns {boolean}
   */
  isStrict() {
    return this.strict;
  }

  /**
   * Marks this scope as being in strict mode. If this scope is not the root
   * scope, the static `this` reference becomes null.
   * 
   * @returns {Scope} `this`
   */
  useStrict() {
    this.strict = true;
    return this;
  }

  /**
   * Returns whether this is a top-level scope, which indicates the root/global
   * scope or a function scope.
   * 
   * @returns {boolean}
   */
  isTopLevel() {
    return this.topLevel;
  }

  /**
   * Returns the nearest containing top-level scope (including this one)
   * or the root scope if none are marked top-level.
   * 
   * @returns {Scope}
   */
  getTopLevel() {
    let scope = this;
    while (!scope.topLevel && scope.parent) {
      scope = scope.parent;
    }
    return scope;
  }

  /**
   * Marks this scope as a top-level scope, which indicates the root/global
   * scope or a function scope.
   * 
   * @returns {Scope} `this`
   */
  setTopLevel() {
    this.topLevel = true;
    return this;
  }

  /**
   * Returns the static `this` reference supplied when this scope was created,
   * as long as this scope is the root scope or is not in strict mode;
   * otherwise, `undefined` is returned.
   * 
   * @returns {*} the static `this` reference or `undefined` if this scope is
   *     strict and non-root
   */
  getThis() {
    if (this.parent === null || !this.strict) {
      return this.thisRef;
    }
  }

  /**
   * Returns the member of this scope with the given name or `undefined` if no
   * such member exists.
   * 
   * @param {string} name the name of the member
   * @returns {*} the member data or `undefined` if none
   */
  getOwnMember(name) {
    return this.members[name];
  }

  /**
   * Returns an array of the names of all members of this scope.
   * 
   * @returns {string[]} an array of member names
   */
  getOwnMembers() {
    return Object.keys(this.members);
  }

  /**
   * Adds a new member to this scope. Throws an error if the name already exists.
   * 
   * @param {string} name the name of the member
   * @param {*} [value] the data associated with the member, defaults to an empty object
   * @returns {*} `value`
   */
  addOwnMember(name, value = {}) {
    if (name in this.members) {
      throw new Error(`'${name}' already defined`);
    }
    return this.members[name] = value;
  }

  /**
   * Returns the member with the given name in the nearest containing scope
   * (including this one) or `undefined` if no such member exists.
   * 
   * @param {string} name the name of the member
   * @returns {*} the member data or `undefined` if none
   */
  findMember(name) {
    let scope = this;
    while (scope) {
      const member = scope.getOwnMember(name);
      if (member) {
        return member;
      }
      scope = scope.parent;
    }
  }

  /**
   * Resolves the given qualified name against this scope and its containing scopes.
   * The member data for each part of the qualified name except the last is expected
   * to contain a property called `members`, which is an object mapping member names
   * to associated data. The initial part is resolved using the nearest containing
   * scope (as performed by `findMember`) and each subsequent part is expected to be
   * found in the `members` object of the previous part. If any part is not found,
   * `undefined` is returned.
   * 
   * @param {string|string[]} qname a dot-separated qualified name or an array of identifiers
   * @returns {*} the member data or `undefined` if none
   */
  resolve(qname) {
    const parts = Array.isArray(qname) ? qname : qname.split('.');
    if (parts.length > 0) {
      let member = this.findMember(parts.shift());
      while (member !== undefined && parts.length > 0) {
        member = member.members && member.members[parts.shift()];
      }
      return member;
    }
  }

  toString() {
    return `Scope[${this.getOwnMembers().join(', ')}]`
  }
}
