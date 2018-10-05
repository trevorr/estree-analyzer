# estree-analyzer

Performs basic static analysis of JavaScript ASTs in [ESTree](https://github.com/estree/estree) format.

## Installation

```sh
npm install estree-analyzer
```

## Usage

```js
const acorn = require('acorn');
const analyzer = require('estree-analyzer');

let expr = acorn.parseExpressionAt(`'1 + 2 * 3 = ' + (1 + 2 * 3)`);
let analysis = analyzer.analyze(expr);
console.log(JSON.stringify(analysis, null, 2));

expr = acorn.parseExpressionAt(`obj && obj.nested && obj.nested.prop`);
let scope = new analyzer.Scope();
analysis = analyzer.analyze(expr, scope);
console.log(JSON.stringify(scope.members, null, 2));
```

The code above outputs the following:

```json
{
  "type": "string",
  "value": "1 + 2 * 3 = 7"
}
{
  "obj": {
    "name": "obj",
    "type": "object",
    "members": {
      "nested": {
        "name": "nested",
        "type": "object",
        "members": {
          "prop": {
            "name": "prop"
          }
        }
      }
    }
  }
}
```

## API Reference

### Modules

<dl>
<dt><a href="#module_types">types</a></dt>
<dd><p>Type definition module.</p>
</dd>
</dl>

### Classes

<dl>
<dt><a href="#Scope">Scope</a></dt>
<dd><p>Represents a JavaScript variable scope.</p>
</dd>
</dl>

### Functions

<dl>
<dt><a href="#analyze">analyze(ast, [rootScope])</a> ⇒ <code>Object</code></dt>
<dd><p>Analyze the given ESTree Abstract Syntax Tree. The returned object may contain
the following properties:</p>
<ul>
<li><code>type</code> (<a href="module:type~Type">module:type~Type</a>): result type of the expression, if known</li>
<li><code>value</code> (any): result value of the expression, if known</li>
<li><code>thrown</code>: analysis of the thrown expression</li>
<li><code>async</code>: true if the expression is an async function</li>
<li><code>generator</code>: true if the expression is a generator function</li>
<li><code>members</code>: object mapping member names to analyses</li>
</ul>
</dd>
</dl>

<a name="module_types"></a>

### types
Type definition module.


* [types](#module_types)
    * [~arrayOf([elements])](#module_types..arrayOf)
    * [~kindOf(v)](#module_types..kindOf) ⇒ [<code>TypeKind</code>](#TypeKind)
    * [~getKind(type)](#module_types..getKind) ⇒ <code>string</code> \| <code>undefined</code>
    * [~hasKind(type, kind)](#module_types..hasKind) ⇒ <code>boolean</code>
    * [~isFalsy(type)](#module_types..isFalsy) ⇒ <code>boolean</code>
    * [~isTruthy(type)](#module_types..isTruthy) ⇒ <code>boolean</code>
    * [~isUnion(type)](#module_types..isUnion) ⇒ <code>boolean</code>
    * [~getUnionTypes(type)](#module_types..getUnionTypes) ⇒ <code>Array.&lt;Type&gt;</code>
    * [~isAssignable(target, source)](#module_types..isAssignable) ⇒ <code>boolean</code>
    * [~isNotAssignable(target, source)](#module_types..isNotAssignable) ⇒ <code>boolean</code>
    * [~union(a, b)](#module_types..union) ⇒ <code>Type</code> \| <code>undefined</code>
    * [~formatType(type)](#module_types..formatType) ⇒ <code>string</code>
    * [~toCanonical(type)](#module_types..toCanonical) ⇒ <code>TypeObject</code> \| <code>undefined</code>
    * [~toShorthand(type)](#module_types..toShorthand) ⇒ <code>TypeObject</code> \| <code>Array.&lt;Type&gt;</code> \| <code>undefined</code>
    * [~Type](#module_types..Type) : <code>string</code> \| <code>TypeObject</code> \| <code>Array.&lt;Type&gt;</code>
    * [~TypeObject](#module_types..TypeObject) : <code>Object</code>
    * [~Parameter](#module_types..Parameter) : <code>Object</code>

<a name="module_types..arrayOf"></a>

#### types~arrayOf([elements])
Returns a type representing an array of the given optional element type.

**Kind**: inner method of [<code>types</code>](#module_types)  

| Param | Type | Description |
| --- | --- | --- |
| [elements] | <code>Type</code> | an optional element type |

<a name="module_types..kindOf"></a>

#### types~kindOf(v) ⇒ [<code>TypeKind</code>](#TypeKind)
Returns the type kind of the given value.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: [<code>TypeKind</code>](#TypeKind) - the kind of value  

| Param | Type | Description |
| --- | --- | --- |
| v | <code>\*</code> | the value for which to obtain the type kind |

<a name="module_types..getKind"></a>

#### types~getKind(type) ⇒ <code>string</code> \| <code>undefined</code>
Returns the kind of the given type.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>string</code> \| <code>undefined</code> - the kind of type  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Type</code> \| <code>undefined</code> | a type |

<a name="module_types..hasKind"></a>

#### types~hasKind(type, kind) ⇒ <code>boolean</code>
Returns whether the given type is of the given kind or is a union with an
alternative of the given kind.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>boolean</code> - true if an only if the type has the given kind  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Type</code> \| <code>undefined</code> | a type |
| kind | <code>string</code> | the kind of type |

<a name="module_types..isFalsy"></a>

#### types~isFalsy(type) ⇒ <code>boolean</code>
Returns whether the given type is always falsy (`undefined` or `null`).

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>boolean</code> - true if and only if the given type is always falsy  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Type</code> \| <code>undefined</code> | a type |

<a name="module_types..isTruthy"></a>

#### types~isTruthy(type) ⇒ <code>boolean</code>
Returns whether the given type is always truthy (`symbol`, `object`,
`function`, or `array`).

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>boolean</code> - true if and only if the given type is always truthy  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Type</code> \| <code>undefined</code> | a type |

<a name="module_types..isUnion"></a>

#### types~isUnion(type) ⇒ <code>boolean</code>
Returns whether the given type is a union type.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>boolean</code> - true if and only if the given type is a union  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Type</code> \| <code>undefined</code> | a type |

<a name="module_types..getUnionTypes"></a>

#### types~getUnionTypes(type) ⇒ <code>Array.&lt;Type&gt;</code>
Returns an array containing the alternative types of the given type.
If `type` is a union, its type array is returned (and can be modified).
If `type` is defined but not a union, a single element array containing
that type is returned. If `type` is undefined (or falsy), an empty array
is returned.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>Array.&lt;Type&gt;</code> - an array of alternative types  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Type</code> \| <code>undefined</code> | a type |

<a name="module_types..isAssignable"></a>

#### types~isAssignable(target, source) ⇒ <code>boolean</code>
Returns whether the source type is assignable to the target type.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>boolean</code> - true if and only if source is assignable to target  

| Param | Type | Description |
| --- | --- | --- |
| target | <code>Type</code> \| <code>undefined</code> | the target type |
| source | <code>Type</code> \| <code>undefined</code> | the source type |

<a name="module_types..isNotAssignable"></a>

#### types~isNotAssignable(target, source) ⇒ <code>boolean</code>
Returns whether the source type is not assignable to the target type.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>boolean</code> - true if and only if source is not assignable to target  

| Param | Type | Description |
| --- | --- | --- |
| target | <code>Type</code> \| <code>undefined</code> | the target type |
| source | <code>Type</code> \| <code>undefined</code> | the source type |

<a name="module_types..union"></a>

#### types~union(a, b) ⇒ <code>Type</code> \| <code>undefined</code>
Returns a reduced union type `a | b` for the types `a` and `b`.
If either type is undefined, the result is undefined.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>Type</code> \| <code>undefined</code> - the reduced union type `a | b`  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>Type</code> \| <code>undefined</code> | a type |
| b | <code>Type</code> \| <code>undefined</code> | another type |

<a name="module_types..formatType"></a>

#### types~formatType(type) ⇒ <code>string</code>
Formats the given type as a string. The following operators are used with
the associated precedence levels. When a lower-precedence operator is nested
in a higher precedence context, the lower-precedence expression is surrounded
by parentheses.

- Function parameters (precedence 0): infix operator `,`, surrounded by parentheses
- Function parameter type (precedence 0): prefix operator `:`
- Unions (precedence 1): infix operator `|`
- Function return type (precedence 2): prefix operator `:`
- Arrays (with element type, precedence 3): postfix operator `[]`

For example, `(function(:string | null): (number | string))[]` denotes an array
of functions accepting a string or null argument and returning a number or string.
On the other hand, `function(:string | null): number | string[]` denotes either
1) a function accepting a string or null argument and returning a number or
2) a string array.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>string</code> - a string representation the type  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Type</code> \| <code>undefined</code> | a type |

<a name="module_types..toCanonical"></a>

#### types~toCanonical(type) ⇒ <code>TypeObject</code> \| <code>undefined</code>
Returns the given type in canonical form.

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>TypeObject</code> \| <code>undefined</code> - a canonical type  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Type</code> \| <code>undefined</code> | a type |

<a name="module_types..toShorthand"></a>

#### types~toShorthand(type) ⇒ <code>TypeObject</code> \| <code>Array.&lt;Type&gt;</code> \| <code>undefined</code>
Returns the given type in shorthand form, if possible.
Any nested types are recursively converted to shorthand form.
If the type (or a subcomponent) is already in shorthand form,
the type (or subcomponent) is returned unchanged. When a type
object must be changed, it is first cloned, preserving any
additional properties it may have.

The following type objects have a shorthand form:

- `function` with no `returns` or `params` becomes the string `function`
- `array` with no `elements` becomes the string `array`
- `union` becomes an array of types

**Kind**: inner method of [<code>types</code>](#module_types)  
**Returns**: <code>TypeObject</code> \| <code>Array.&lt;Type&gt;</code> \| <code>undefined</code> - a shorthand type  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Type</code> \| <code>undefined</code> | a type |

<a name="module_types..Type"></a>

#### types~Type : <code>string</code> \| <code>TypeObject</code> \| <code>Array.&lt;Type&gt;</code>
Types can take the following forms:

- `string`: shorthand for simple types, corresponding to [TypeKind](#TypeKind)
- `Type[]`: shorthand for a union of types
- [TypeObject](TypeObject): canonical type representation object

Restrictions:

- A type must not contain circular references (e.g. an array of itself)
- A union type must not directly contain another union type. Indirectly
    containing a union, such as a union including an array with union
    elements, is valid.

**Kind**: inner typedef of [<code>types</code>](#module_types)  
<a name="module_types..TypeObject"></a>

#### types~TypeObject : <code>Object</code>
Canonical representation for a JavaScript type.

**Kind**: inner typedef of [<code>types</code>](#module_types)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| kind | [<code>TypeKind</code>](#TypeKind) | the fundamental type |
| [returns] | <code>Type</code> | for `function` types, the return type of the function (optional) |
| [params] | <code>Array.&lt;Parameter&gt;</code> | for `function` types, the parameters of the function (optional) |
| [elements] | <code>Type</code> | for `array` types, the type of the elements (optional) |
| [anyOf] | <code>Array.&lt;Type&gt;</code> | for `union` types, the types of the alternatives (required) |

<a name="module_types..Parameter"></a>

#### types~Parameter : <code>Object</code>
Represents a function parameter.
At least one of `name` or `type` must be specified.

**Kind**: inner typedef of [<code>types</code>](#module_types)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [name] | <code>string</code> | the name of the parameter, if known |
| [type] | <code>Type</code> | the type of the parameter, if known |

<a name="Scope"></a>

### Scope
Represents a JavaScript variable scope.

**Kind**: global class  

* [Scope](#Scope)
    * [new Scope([thisRef], [strict], [parent], [topLevel], [members])](#new_Scope_new)
    * _instance_
        * [.createNested()](#Scope+createNested) ⇒ [<code>Scope</code>](#Scope)
        * [.getParent()](#Scope+getParent) ⇒ [<code>Scope</code>](#Scope)
        * [.getRoot()](#Scope+getRoot) ⇒ [<code>Scope</code>](#Scope)
        * [.isStrict()](#Scope+isStrict) ⇒ <code>boolean</code>
        * [.useStrict()](#Scope+useStrict) ⇒ [<code>Scope</code>](#Scope)
        * [.isTopLevel()](#Scope+isTopLevel) ⇒ <code>boolean</code>
        * [.getTopLevel()](#Scope+getTopLevel) ⇒ [<code>Scope</code>](#Scope)
        * [.setTopLevel()](#Scope+setTopLevel) ⇒ [<code>Scope</code>](#Scope)
        * [.getThis()](#Scope+getThis) ⇒ <code>\*</code>
        * [.getOwnMember(name)](#Scope+getOwnMember) ⇒ <code>\*</code>
        * [.getOwnMembers()](#Scope+getOwnMembers) ⇒ <code>Array.&lt;string&gt;</code>
        * [.addOwnMember(name, [value])](#Scope+addOwnMember) ⇒ <code>\*</code>
        * [.findMember(name)](#Scope+findMember) ⇒ <code>\*</code>
        * [.resolve(qname)](#Scope+resolve) ⇒ <code>\*</code>
    * _static_
        * [.withMembers(members)](#Scope.withMembers) ⇒ [<code>Scope</code>](#Scope)

<a name="new_Scope_new"></a>

#### new Scope([thisRef], [strict], [parent], [topLevel], [members])
Constructs a new Scope.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [thisRef] | <code>\*</code> |  | static `this` reference for this scope |
| [strict] | <code>boolean</code> | <code>false</code> | whether strict mode is enabled |
| [parent] | [<code>Scope</code>](#Scope) | <code></code> | the containing scope or `null` if none |
| [topLevel] | <code>boolean</code> |  | whether this is a global or function scope |
| [members] | <code>Object</code> |  | mapping of member names to associated data |

<a name="Scope+createNested"></a>

#### scope.createNested() ⇒ [<code>Scope</code>](#Scope)
Creates a nested scope that inherits the static `this` reference and strict mode
of this scope. The nested scope is initially not marked as top-level.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: [<code>Scope</code>](#Scope) - the nested scope  
<a name="Scope+getParent"></a>

#### scope.getParent() ⇒ [<code>Scope</code>](#Scope)
Returns the containing scope of this scope, or `null` for the root scope.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: [<code>Scope</code>](#Scope) - the parent scope or `null`  
<a name="Scope+getRoot"></a>

#### scope.getRoot() ⇒ [<code>Scope</code>](#Scope)
Returns the root scope.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: [<code>Scope</code>](#Scope) - the root scope  
<a name="Scope+isStrict"></a>

#### scope.isStrict() ⇒ <code>boolean</code>
Returns whether this scope is in strict mode. The only effect strict mode
has on the operation of this class is that it suppresses the static `this`
reference for non-root scopes in strict mode.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
<a name="Scope+useStrict"></a>

#### scope.useStrict() ⇒ [<code>Scope</code>](#Scope)
Marks this scope as being in strict mode. If this scope is not the root
scope, the static `this` reference becomes null.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: [<code>Scope</code>](#Scope) - `this`  
<a name="Scope+isTopLevel"></a>

#### scope.isTopLevel() ⇒ <code>boolean</code>
Returns whether this is a top-level scope, which indicates the root/global
scope or a function scope.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
<a name="Scope+getTopLevel"></a>

#### scope.getTopLevel() ⇒ [<code>Scope</code>](#Scope)
Returns the nearest containing top-level scope (including this one)
or the root scope if none are marked top-level.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
<a name="Scope+setTopLevel"></a>

#### scope.setTopLevel() ⇒ [<code>Scope</code>](#Scope)
Marks this scope as a top-level scope, which indicates the root/global
scope or a function scope.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: [<code>Scope</code>](#Scope) - `this`  
<a name="Scope+getThis"></a>

#### scope.getThis() ⇒ <code>\*</code>
Returns the static `this` reference supplied when this scope was created,
as long as this scope is the root scope or is not in strict mode;
otherwise, `undefined` is returned.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: <code>\*</code> - the static `this` reference or `undefined` if this scope is
    strict and non-root  
<a name="Scope+getOwnMember"></a>

#### scope.getOwnMember(name) ⇒ <code>\*</code>
Returns the member of this scope with the given name or `undefined` if no
such member exists.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: <code>\*</code> - the member data or `undefined` if none  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | the name of the member |

<a name="Scope+getOwnMembers"></a>

#### scope.getOwnMembers() ⇒ <code>Array.&lt;string&gt;</code>
Returns an array of the names of all members of this scope.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: <code>Array.&lt;string&gt;</code> - an array of member names  
<a name="Scope+addOwnMember"></a>

#### scope.addOwnMember(name, [value]) ⇒ <code>\*</code>
Adds a new member to this scope. Throws an error if the name already exists.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: <code>\*</code> - `value`  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | the name of the member |
| [value] | <code>\*</code> | the data associated with the member, defaults to an empty object |

<a name="Scope+findMember"></a>

#### scope.findMember(name) ⇒ <code>\*</code>
Returns the member with the given name in the nearest containing scope
(including this one) or `undefined` if no such member exists.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: <code>\*</code> - the member data or `undefined` if none  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | the name of the member |

<a name="Scope+resolve"></a>

#### scope.resolve(qname) ⇒ <code>\*</code>
Resolves the given qualified name against this scope and its containing scopes.
The member data for each part of the qualified name except the last is expected
to contain a property called `members`, which is an object mapping member names
to associated data. The initial part is resolved using the nearest containing
scope (as performed by `findMember`) and each subsequent part is expected to be
found in the `members` object of the previous part. If any part is not found,
`undefined` is returned.

**Kind**: instance method of [<code>Scope</code>](#Scope)  
**Returns**: <code>\*</code> - the member data or `undefined` if none  

| Param | Type | Description |
| --- | --- | --- |
| qname | <code>string</code> \| <code>Array.&lt;string&gt;</code> | a dot-separated qualified name or an array of identifiers |

<a name="Scope.withMembers"></a>

#### Scope.withMembers(members) ⇒ [<code>Scope</code>](#Scope)
Creates a non-strict, non-top level root scope that wraps the given object
mapping member names to associated data. The static `this` reference is undefined.

**Kind**: static method of [<code>Scope</code>](#Scope)  
**Returns**: [<code>Scope</code>](#Scope) - a new scope  

| Param | Type | Description |
| --- | --- | --- |
| members | <code>Object</code> | an object mapping member names to data |

<a name="TypeKind"></a>

### TypeKind : <code>enum</code>
Kinds of built-in, fundamental types.

**Kind**: global enum  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| undefined | <code>string</code> | <code>&quot;undefined&quot;</code> | 
| null | <code>string</code> | <code>&quot;null&quot;</code> | 
| boolean | <code>string</code> | <code>&quot;boolean&quot;</code> | 
| number | <code>string</code> | <code>&quot;number&quot;</code> | 
| string | <code>string</code> | <code>&quot;string&quot;</code> | 
| symbol | <code>string</code> | <code>&quot;symbol&quot;</code> | 
| object | <code>string</code> | <code>&quot;object&quot;</code> | 
| function | <code>string</code> | <code>&quot;function&quot;</code> | 
| array | <code>string</code> | <code>&quot;array&quot;</code> | 
| union | <code>string</code> | <code>&quot;union&quot;</code> | 
| any | <code>string</code> | <code>&quot;any&quot;</code> | 

<a name="analyze"></a>

### analyze(ast, [rootScope]) ⇒ <code>Object</code>
Analyze the given ESTree Abstract Syntax Tree. The returned object may contain
the following properties:

- `type` ([module:type~Type](module:type~Type)): result type of the expression, if known
- `value` (any): result value of the expression, if known
- `thrown`: analysis of the thrown expression
- `async`: true if the expression is an async function
- `generator`: true if the expression is a generator function
- `members`: object mapping member names to analyses

**Kind**: global function  
**Returns**: <code>Object</code> - the analysis result  

| Param | Type | Description |
| --- | --- | --- |
| ast | <code>Node</code> | an ESTree Abstract Syntax Tree |
| [rootScope] | [<code>Scope</code>](#Scope) | the root naming scope for the analysis (usually representing the global scope) |


## License

`estree-analyzer` is available under the [ISC license](LICENSE).
