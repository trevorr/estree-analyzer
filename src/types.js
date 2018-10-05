'use strict';

/**
 * Type definition module.
 * @module types
 */

/**
 * Types can take the following forms:
 * 
 * - `string`: shorthand for simple types, corresponding to {@link TypeKind}
 * - `Type[]`: shorthand for a union of types
 * - {@link TypeObject}: canonical type representation object
 * 
 * Restrictions:
 * 
 * - A type must not contain circular references (e.g. an array of itself)
 * - A union type must not directly contain another union type. Indirectly
 *     containing a union, such as a union including an array with union
 *     elements, is valid.
 * 
 * @typedef {(string|TypeObject|Type[])} Type
 * @alias Type
 */

/**
 * Kinds of built-in, fundamental types.
 * 
 * @readonly
 * @enum {string}
 * @alias TypeKind
 */
const TypeKind = {
  // built-in types
  'undefined': 'undefined',
  'null': 'null',
  'boolean': 'boolean',
  'number': 'number',
  'string': 'string',
  'symbol': 'symbol',
  'object': 'object',
  'function': 'function',
  // meta-types
  'array': 'array',
  'union': 'union',
  'any': 'any'
};
Object.freeze(TypeKind);

/**
 * Canonical representation for a JavaScript type.
 * 
 * @typedef TypeObject
 * @type {Object}
 * @property {TypeKind} kind the fundamental type
 * @property {Type} [returns] for `function` types, the return type of the function (optional)
 * @property {Parameter[]} [params] for `function` types, the parameters of the function (optional)
 * @property {Type} [elements] for `array` types, the type of the elements (optional)
 * @property {Type[]} [anyOf] for `union` types, the types of the alternatives (required)
 * @alias TypeObject
 */

/**
 * Represents a function parameter.
 * At least one of `name` or `type` must be specified.
 * 
 * @typedef Parameter
 * @type {Object}
 * @property {string} [name] the name of the parameter, if known
 * @property {Type} [type] the type of the parameter, if known
 * @alias Parameter
 */

/**
 * Returns a type representing an array of the given optional element type.
 * 
 * @param {?Type} [elements] an optional element type
 */
function arrayOf(elements) {
  return !elements ? 'array' : {
    kind: 'array',
    elements
  }
}

/**
 * Returns the type kind of the given value.
 * 
 * @param {*} v the value for which to obtain the type kind
 * @returns {TypeKind} the kind of value
 */
function kindOf(v) {
  return v !== null ? (Array.isArray(v) ? 'array' : typeof v) : 'null';
}

/**
 * Returns the kind of the given type.
 * 
 * @param {(Type|undefined)} type a type
 * @returns {(string|undefined)} the kind of type
 */
function getKind(type) {
  return typeof type === 'object' ? (Array.isArray(type) ? 'union' : type.kind) : type;
}

/**
 * Returns whether the given type is of the given kind or is a union with an
 * alternative of the given kind.
 * 
 * @param {(Type|undefined)} type a type
 * @param {string} kind the kind of type
 * @returns {boolean} true if an only if the type has the given kind
 */
function hasKind(type, kind) {
  return Array.isArray(type) && type !== 'union' ?
    type.some(t => getKind(t) === kind) : getKind(type) === kind;
}

/**
 * Returns whether the given type is always falsy (`undefined` or `null`).
 * 
 * @param {(Type|undefined)} type a type
 * @returns {boolean} true if and only if the given type is always falsy
 */
function isFalsy(type) {
  return Array.isArray(type) ?
    type.length > 0 && type.every(isFalsy) : ['undefined', 'null'].includes(getKind(type));
}

/**
 * Returns whether the given type is always truthy (`symbol`, `object`,
 * `function`, or `array`).
 * 
 * @param {(Type|undefined)} type a type
 * @returns {boolean} true if and only if the given type is always truthy
 */
function isTruthy(type) {
  return Array.isArray(type) ?
    type.length > 0 && type.every(isTruthy) : ['symbol', 'object', 'function', 'array'].includes(getKind(type));
}

/**
 * Returns whether the given type is a union type.
 * 
 * @param {(Type|undefined)} type a type
 * @returns {boolean} true if and only if the given type is a union
 */
function isUnion(type) {
  return Array.isArray(type) || (!!type && type.kind === 'union');
}

/**
 * Returns an array containing the alternative types of the given type.
 * If `type` is a union, its type array is returned (and can be modified).
 * If `type` is defined but not a union, a single element array containing
 * that type is returned. If `type` is undefined (or falsy), an empty array
 * is returned.
 * 
 * @param {(Type|undefined)} type a type
 * @returns {Type[]} an array of alternative types
 */
function getUnionTypes(type) {
  return Array.isArray(type) ? type : type ? type.anyOf || [type] : [];
}

/**
 * Returns whether the source type is assignable to the target type.
 * 
 * @param {(Type|undefined)} target the target type
 * @param {(Type|undefined)} source the source type
 * @returns {boolean} true if and only if source is assignable to target
 */
function isAssignable(target, source) {
  // unions are handled recursively, with source unions followed by target unions:
  // [a, b, c] <- [b, c]
  //   [a, b, c] <- b
  //     a <- b
  //     OR b <- b
  //     OR c <- b
  //   AND [a, b, c] <- c
  //     a <- c
  //     OR b <- c
  //     OR c <- c

  // if source is union, every source type must be assignable to the target type
  if (isUnion(source)) {
    return getUnionTypes(source).every(t => isAssignable(target, t));
  }
  // if target is union, source type must be assignable to some member type
  if (isUnion(target)) {
    return getUnionTypes(target).some(t => isAssignable(t, source));
  }

  const targetKind = getKind(target);
  const sourceKind = getKind(source);
  switch (targetKind) {
    case undefined: // unknown type
      return false;
    case 'undefined':
    case 'null':
    case 'boolean':
    case 'number':
    case 'string':
    case 'symbol':
      return sourceKind === targetKind;
    case 'object':
      return sourceKind === targetKind || sourceKind === 'array';
    case 'function':
      return sourceKind === targetKind &&
        isAssignable(target.returns, source.returns) &&
        !!target.params && !!source.params &&
        target.params.length === source.params.length &&
        source.params.every((p, i) => isAssignable(p.type, target.params[i].type));
    case 'array':
      return sourceKind === targetKind && isAssignable(target.elements, source.elements);
    case 'any':
      return true;
  }
}

/**
 * Returns whether the source type is not assignable to the target type.
 * 
 * @param {(Type|undefined)} target the target type
 * @param {(Type|undefined)} source the source type
 * @returns {boolean} true if and only if source is not assignable to target
 */
function isNotAssignable(target, source) {
  return !!target && !isAssignable(target, source);
}

/**
 * Returns a reduced union type `a | b` for the types `a` and `b`.
 * If either type is undefined, the result is undefined.
 * 
 * @param {(Type|undefined)} a a type
 * @param {(Type|undefined)} b another type
 * @returns {(Type|undefined)} the reduced union type `a | b`
 */
function union(a, b) {
  if (a && b) {
    if (isAssignable(a, b)) {
      return a;
    }
    if (isAssignable(b, a)) {
      return b;
    }

    if (isUnion(a)) {
      if (isUnion(b)) {
        // start with all elements of `a`, adding unrelated elements of `b` and
        // replacing elements of `a` with elements of `b` when the former are
        // subtypes of the latter
        const aTypes = getUnionTypes(a);
        const members = new Set(aTypes);
        // compare pairwise assignability of elements of `a` and `b`
        for (const be of getUnionTypes(b)) {
          for (const ae of aTypes) {
            if (isAssignable(be, ae)) {
              if (isAssignable(ae, be)) {
                // equivalent: ignore `be`
              } else {
                // `be` is supertype of `ae`: replace `ae` with `be`
                members.delete(ae);
                members.add(be);
              }
            } else if (isAssignable(ae, be)) {
              // `ae` is supertype of `be`: ignore `be`
            } else {
              // unrelated types: add `be`
              members.add(be);
            }
          }
        }
        return members.size !== 1 ? Array.from(members) : members.values().next();
      } else {
        return [...getUnionTypes(a), b];
      }
    } else if (isUnion(b)) {
      return [a, ...getUnionTypes(b)];
    }

    return [a, b];
  }
}

// precedence levels:
// - 0: top-level
// - 1: union
// - 2: function return
// - 3: array

/**
 * Formats the given type as a string. The following operators are used with
 * the associated precedence levels. When a lower-precedence operator is nested
 * in a higher precedence context, the lower-precedence expression is surrounded
 * by parentheses.
 * 
 * - Function parameters (precedence 0): infix operator `,`, surrounded by parentheses
 * - Function parameter type (precedence 0): prefix operator `:`
 * - Unions (precedence 1): infix operator `|`
 * - Function return type (precedence 2): prefix operator `:`
 * - Arrays (with element type, precedence 3): postfix operator `[]`
 * 
 * For example, `(function(:string | null): (number | string))[]` denotes an array
 * of functions accepting a string or null argument and returning a number or string.
 * On the other hand, `function(:string | null): number | string[]` denotes either
 * 1) a function accepting a string or null argument and returning a number or
 * 2) a string array.
 * 
 * @param {(Type|undefined)} type a type
 * @returns {string} a string representation the type
 */
function formatType(type, contextPrecedence = 0) {
  let result;
  let precedence;
  if (isUnion(type)) {
    result = getUnionTypes(type).map(alt => formatType(alt, precedence = 1)).join(' | ');
  } else {
    const kind = getKind(type);
    result = kind;
    switch (kind) {
      case undefined:
        result = 'unknown';
        break;
      case 'function':
        if (type.params) {
          result += `(${type.params.map(formatParam).join(', ')})`;
        }
        if (type.returns) {
          result += ': ' + formatType(type.returns, precedence = 2);
        }
        break;
      case 'array':
        if (type.elements) {
          return formatType(type.elements, precedence = 3) + '[]';
        }
    }
  }
  if (precedence < contextPrecedence) {
    result = `(${result})`;
  }
  return result;
}

function formatParam(param) {
  const paramType = formatType(param.type);
  return (param.name && param.type) ? (param.name + ': ' + paramType) :
    param.type ? (':' + paramType) : (param.name || '_');
}

/**
 * Returns the given type in canonical form.
 * 
 * @param {(Type|undefined)} type a type
 * @returns {(TypeObject|undefined)} a canonical type
 */
function toCanonical(type) {
  return Array.isArray(type) ? {
      kind: 'union',
      anyOf: type.map(toCanonical)
    } :
    typeof type === 'string' ? {
      kind: type
    } : type ? transformNested(type, toCanonical) : type;
}

/**
 * Returns the given type in shorthand form, if possible.
 * Any nested types are recursively converted to shorthand form.
 * If the type (or a subcomponent) is already in shorthand form,
 * the type (or subcomponent) is returned unchanged. When a type
 * object must be changed, it is first cloned, preserving any
 * additional properties it may have.
 * 
 * The following type objects have a shorthand form:
 * 
 * - `function` with no `returns` or `params` becomes the string `function`
 * - `array` with no `elements` becomes the string `array`
 * - `union` becomes an array of types
 * 
 * @param {(Type|undefined)} type a type
 * @returns {(TypeObject|Type[]|undefined)} a shorthand type
 */
function toShorthand(type) {
  if (type && type.kind) {
    switch (type.kind) {
      case 'function':
        if (!type.returns && !type.params) {
          return type.kind;
        }
        return transformFunction(type, toShorthand);
      case 'array':
        if (!type.elements) {
          return type.kind;
        }
        return transformArray(type, toShorthand);
      case 'union':
        return mapIfChanged(type.anyOf, toShorthand);
      default:
        return type.kind;
    }
  }
  if (Array.isArray(type)) {
    return mapIfChanged(type, toShorthand);
  }
  return type;
}

function transformNested(type, fn) {
  switch (type.kind) {
    case 'function':
      return transformFunction(type, fn);
    case 'array':
      return transformArray(type, fn);
    case 'union':
      return transformUnion(type, fn);
    default:
      return type;
  }
}

function transformFunction(type, fn) {
  const returns = type.returns && fn(type.returns);
  const params = type.params && mapIfChanged(type.params, fn);
  if (returns !== type.returns || params !== type.params) {
    const result = { ...type
    };
    if (returns !== type.returns) {
      result.returns = returns;
    }
    if (params !== type.params) {
      results.params = params;
    }
    return result;
  }
  return type;
}

function transformArray(type, fn) {
  if (type.elements) {
    const elements = fn(type.elements);
    if (elements !== type.elements) {
      return { ...type,
        elements
      };
    }
  }
  return type;
}

function transformUnion(type, fn) {
  if (type.anyOf) {
    const anyOf = mapIfChanged(type.anyOf, fn);
    if (anyOf !== type.anyOf) {
      return { ...type,
        anyOf
      };
    }
  }
  return type;
}

function mapIfChanged(arr, fn) {
  const newArr = arr.map(fn);
  return arrayElementsEqual(arr, newArr) ? arr : newArr;
}

function arrayElementsEqual(a, b) {
  // assumes same length
  return a.every((v, i) => v === b[i]);
}

module.exports = {
  TypeKind,
  arrayOf,
  kindOf,
  getKind,
  hasKind,
  isFalsy,
  isTruthy,
  isUnion,
  getUnionTypes,
  isAssignable,
  isNotAssignable,
  union,
  formatType,
  toCanonical,
  toShorthand
};