/**
 * Main analysis module.
 * @module analyze
 * @private
 */

import { Scope } from './scope';
import { arrayOf, hasKind, isNotAssignable, isFalsy, isTruthy, kindOf, union } from './types';

/**
 * Analyze the given ESTree Abstract Syntax Tree. The returned object may contain
 * the following properties:
 * 
 * - `type` ({@link module:type~Type}): result type of the expression, if known
 * - `value` (any): result value of the expression, if known
 * - `thrown`: analysis of the thrown expression
 * - `async`: true if the expression is an async function
 * - `generator`: true if the expression is a generator function
 * - `members`: object mapping member names to analyses
 * 
 * @param {Node} ast an ESTree Abstract Syntax Tree
 * @param {Scope} [rootScope] the root naming scope for the analysis (usually representing the global scope)
 * @returns {Object} the analysis result
 * @alias analyze
 */
export function analyze(ast, rootScope = new Scope()) {
  return visit(ast, rootScope);
}

function visit(ast, ...args) {
  const func = visitors[ast.type];
  if (!func) {
    throw new Error(`Unhandled AST node type '${ast.type}'`);
  }
  return func(ast, ...args);
}

const visitors = {
  Identifier(ast, scope, declContext) {
    const name = ast.name;
    let ref;
    if (!declContext) {
      // a reference, not a declaration
      ref = scope.findMember(name);
    }
    if (!ref) {
      if (declContext === 'var') {
        // hoist vars
        scope = scope.getTopLevel();
      } else if (!declContext) {
        // undefined references in non-strict mode are defined globally
        scope = scope.getRoot();
      } else {
        // const, let, and function/catch parameters go in given scope
      }
      ref = scope.addOwnMember(name, {
        name
      });
    }
    return ref;
  },
  Literal(ast) {
    const value = ast.value;
    const type = kindOf(value); // null, string, boolean, number, object (RegExp)
    return {
      type,
      value
    };
  },
  TemplateLiteral(ast, scope) {
    let exprValues = [];
    for (const expr of ast.expressions) {
      const exprInfo = visit(expr, scope);
      if (exprInfo && 'value' in exprInfo && exprValues !== null) {
        exprValues.push(exprInfo.value);
      } else {
        exprValues = null;
      }
    }
    const result = {
      type: 'string'
    };
    if (exprValues !== null) {
      let value = ast.quasis[0].value.cooked;
      for (let i = 0; i < exprValues.length;) {
        value += exprValues[i];
        value += ast.quasis[++i].value.cooked;
      }
      result.value = value;
    }
    return result;
  },
  TaggedTemplateExpression(ast, scope) {
    visit(ast.tag, scope);
    visit(ast.quasi, scope);
  },
  Program(ast, scope) {
    analyzeBody(ast, scope);
  },
  ExpressionStatement(ast, scope) {
    return visit(ast.expression, scope);
  },
  BlockStatement(ast, scope) {
    scope = scope.createNested();
    analyzeBody(ast, scope);
  },
  EmptyStatement() {
    // ignored
  },
  DebuggerStatement() {
    // ignored
  },
  WithStatement() {
    throw new Error(`'with' statement not supported`);
  },
  ReturnStatement(ast, scope) {
    if (ast.argument) {
      return visit(ast.argument, scope);
    }
  },
  YieldExpression(ast, scope) {
    if (ast.argument) {
      return visit(ast.argument, scope);
    }
  },
  LabeledStatement(ast, scope) {
    return visit(ast.body, scope);
  },
  BreakStatement() {
    // ignored
  },
  ContinueStatement() {
    // ignored
  },
  IfStatement(ast, scope) {
    visit(ast.test, scope);
    visit(ast.consequent, scope);
    if (ast.alternate) {
      visit(ast.alternate, scope);
    }
  },
  SwitchStatement(ast, scope) {
    visit(ast.discriminant, scope);
    for (const c of ast.cases) {
      if (c.test) {
        visit(c.test, scope);
      }
      for (const stmt of c.consequent) {
        visit(stmt, scope);
      }
    }
  },
  ThrowStatement(ast, scope) {
    const thrown = visit(ast.argument, scope);
    return {
      thrown
    };
  },
  TryStatement(ast, scope) {
    visit(ast.block, scope);
    if (ast.handler) {
      const handlerScope = scope.createNested();
      if (ast.handler.param) {
        visit(ast.handler.param, handlerScope, 'catch');
      }
      analyzeBody(ast.handler.body, handlerScope);
    }
    if (ast.finalizer) {
      visit(ast.finalizer, scope);
    }
  },
  WhileStatement(ast, scope) {
    visit(ast.test, scope);
    visit(ast.body, scope);
  },
  DoWhileStatement(ast, scope) {
    visit(ast.test, scope);
    visit(ast.body, scope);
  },
  ForStatement(ast, scope) {
    scope = scope.createNested();
    if (ast.init) {
      visit(ast.init, scope);
    }
    if (ast.test) {
      visit(ast.test, scope);
    }
    if (ast.update) {
      visit(ast.update, scope);
    }
    visit(ast.body, scope);
  },
  ForInStatement(ast, scope) {
    scope = scope.createNested();
    visit(ast.left, scope);
    visit(ast.right, scope);
    visit(ast.body, scope);
  },
  ForOfStatement(ast, scope) {
    scope = scope.createNested();
    visit(ast.left, scope);
    visit(ast.right, scope);
    visit(ast.body, scope);
  },
  FunctionDeclaration(ast, scope) {
    const result = declare(ast, scope);
    result.type = 'function';
    if (ast.async) {
      result.async = true;
    }
    if (ast.generator) {
      result.generator = true;
    }
    scope = scope.createNested().setTopLevel();
    for (const param of ast.params) {
      visit(param, scope, 'param');
    }
    analyzeBody(ast.body, scope);
    return result;
  },
  VariableDeclaration(ast, scope) {
    const {
      kind = 'var'
    } = ast;
    for (const decl of ast.declarations) {
      const varInfo = visit(decl.id, scope, kind);
      if (kind === 'const') {
        varInfo.constant = true;
      }
      if (decl.init) {
        Object.assign(varInfo, visit(decl.init, scope));
      }
    }
  },
  ThisExpression(ast, scope) {
    return {
      type: 'object',
      members: scope.getThis()
    };
  },
  Super() {
    return {
      type: 'object'
    };
  },
  ArrayExpression(ast, scope) {
    let elemType;
    let elemValues = [];
    for (const element of ast.elements) {
      const elemInfo = visit(element, scope);
      if (elemInfo && 'type' in elemInfo && elemType !== null) {
        if (elemType === undefined) {
          elemType = elemInfo.type;
        } else {
          elemType = union(elemType, elemInfo.type);
        }
      } else {
        elemType = null;
      }
      if (elemInfo && 'value' in elemInfo && elemValues !== null) {
        elemValues.push(elemInfo.value);
      } else {
        elemValues = null;
      }
    }
    const result = {
      type: arrayOf(elemType)
    };
    if (elemValues) {
      result.value = elemValues;
    }
    return result;
  },
  ArrayPattern(ast, scope, declContext) {
    for (const element of ast.elements) {
      if (element) {
        visit(element, scope, declContext);
      }
    }
  },
  ObjectExpression(ast, scope) {
    let value = {};
    for (const prop of ast.properties) {
      const valueInfo = visit(prop.value, scope);
      if (prop.kind === 'init' && valueInfo && 'value' in valueInfo && value !== null) {
        const key = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value);
        value[key] = valueInfo.value;
      } else {
        value = null;
      }
    }
    const result = {
      type: 'object'
    };
    if (value) {
      result.value = value;
    }
    return result;
  },
  ObjectPattern(ast, scope, declContext) {
    for (const prop of ast.properties) {
      visit(prop.value, scope, declContext);
    }
  },
  SpreadElement(ast, scope) {
    visit(ast.argument, scope);
  },
  RestElement(ast, scope, declContext) {
    visit(ast.argument, scope, declContext);
  },
  AwaitExpression(ast, scope) {
    visit(ast.argument, scope);
  },
  FunctionExpression(ast, scope) {
    const result = {
      type: 'function'
    };
    if (ast.async) {
      result.async = true;
    }
    if (ast.generator) {
      result.generator = true;
    }
    scope = scope.createNested().setTopLevel();
    for (const param of ast.params) {
      visit(param, scope, 'param');
    }
    analyzeBody(ast.body, scope);
    return result;
  },
  ArrowFunctionExpression(ast, scope) {
    const result = {
      type: 'function'
    };
    scope = scope.createNested().setTopLevel();
    for (const param of ast.params) {
      visit(param, scope, 'param');
    }
    if (ast.expression) {
      visit(ast.body, scope);
    } else {
      analyzeBody(ast.body, scope);
    }
    return result;
  },
  UnaryExpression(ast, scope) {
    const valueInfo = visit(ast.argument, scope);
    const result = {};

    function evaluate(type, op) {
      result.type = type;
      if (op && valueInfo && 'value' in valueInfo) {
        result.value = op(valueInfo.value);
      }
    }
    switch (ast.operator) {
      case '-':
        evaluate('number', v => -v);
        break;
      case '+':
        evaluate('number', v => +v);
        break;
      case '~':
        evaluate('number', v => ~v);
        break;
      case '!':
        evaluate('boolean', v => !v);
        break;
      case 'delete':
        evaluate('boolean', _ => true);
        break;
      case 'typeof':
        evaluate('string', v => typeof v);
    }
    return result;
  },
  UpdateExpression(ast, scope) {
    const valueInfo = visit(ast.argument, scope);
    const result = {
      type: 'number'
    };

    function evaluate(op) {
      if (op && valueInfo && 'value' in valueInfo) {
        result.value = op(valueInfo.value);
      }
    }
    switch (ast.operator) {
      case '--':
        evaluate(ast.prefix ? v => --v : v => v--);
        break;
      case '++':
        evaluate(ast.prefix ? v => ++v : v => v++);
    }
    return result;
  },
  BinaryExpression(ast, scope) {
    const leftInfo = visit(ast.left, scope);
    const rightInfo = visit(ast.right, scope);
    let result;

    function evaluate(type, op) {
      if (type) {
        result = {
          type
        };
        if (op && leftInfo && 'value' in leftInfo && rightInfo && 'value' in rightInfo) {
          try {
            result.value = op(leftInfo.value, rightInfo.value);
          } catch (e) {
            // 'in' and 'instanceof' can throw TypeError
            result.thrown = {
              type: typeof e
            };
          }
        }
      }
    }
    switch (ast.operator) {
      case '==':
        evaluate('boolean', (l, r) => l == r);
        break;
      case '!=':
        evaluate('boolean', (l, r) => l != r);
        break;
      case '===':
        evaluate('boolean', (l, r) => l === r);
        break;
      case '!==':
        evaluate('boolean', (l, r) => l !== r);
        break;
      case '<':
        evaluate('boolean', (l, r) => l < r);
        break;
      case '<=':
        evaluate('boolean', (l, r) => l <= r);
        break;
      case '>':
        evaluate('boolean', (l, r) => l > r);
        break;
      case '>=':
        evaluate('boolean', (l, r) => l >= r);
        break;
      case 'in':
        evaluate('boolean', (l, r) => l in r);
        break;
      case 'instanceof':
        evaluate('boolean', (l, r) => l instanceof r);
        break;
      case '<<':
        evaluate('number', (l, r) => l << r);
        break;
      case '>>':
        evaluate('number', (l, r) => l >> r);
        break;
      case '>>>':
        evaluate('number', (l, r) => l >>> r);
        break;
      case '+':
        {
          const leftType = leftInfo && leftInfo.type;
          const rightType = rightInfo && rightInfo.type;
          const type = leftType === 'string' || rightType === 'string' ? 'string' :
            isNotAssignable(leftType, 'string') &&
            isNotAssignable(rightType, 'string') ? 'number' :
            undefined;
          evaluate(type, (l, r) => l + r);
          break;
        }
      case '-':
        evaluate('number', (l, r) => l - r);
        break;
      case '*':
        evaluate('number', (l, r) => l * r);
        break;
      case '**':
        evaluate('number', (l, r) => l ** r);
        break;
      case '/':
        evaluate('number', (l, r) => l / r);
        break;
      case '%':
        evaluate('number', (l, r) => l % r);
        break;
      case '|':
        evaluate('number', (l, r) => l | r);
        break;
      case '^':
        evaluate('number', (l, r) => l ^ r);
        break;
      case '&':
        evaluate('number', (l, r) => l & r);
    }
    return result;
  },
  AssignmentExpression(ast, scope) {
    const result = visit(ast.right, scope);
    visit(ast.left, scope);
    switch (ast.operator) {
      case '<<=':
      case '>>=':
      case '>>>=':
      case '+=':
      case '-=':
      case '*=':
      case '**=':
      case '/=':
      case '%=':
      case '|=':
      case '^=':
      case '&=':
        result.type = 'number';
    }
    return result;
  },
  AssignmentPattern(ast, scope, declContext) {
    visit(ast.right, scope);
    visit(ast.left, scope, declContext);
  },
  LogicalExpression(ast, scope) {
    const leftInfo = visit(ast.left, scope);
    const rightInfo = visit(ast.right, scope);
    let result;

    function evaluate(op, shortOp) {
      if (shortOp && leftInfo && shortOp(leftInfo)) {
        result = leftInfo;
      } else {
        result = unionInfo(leftInfo, rightInfo);
        if (op && leftInfo && 'value' in leftInfo && rightInfo && 'value' in rightInfo) {
          result.value = op(leftInfo.value, rightInfo.value);
        }
      }
    }
    switch (ast.operator) {
      case '||':
        evaluate((l, r) => l || r, l => 'value' in l ? !!l.value : isTruthy(l.type));
        break;
      case '&&':
        evaluate((l, r) => l && r, l => 'value' in l ? !l.value : isFalsy(l.type));
    }
    return result;
  },
  MemberExpression(ast, scope) {
    let memberInfo;
    const objInfo = visit(ast.object, scope) || {};

    // assume object is an 'object' unless we already know it is an 'array'
    const objType = 'object';
    if (!objInfo.type) {
      objInfo.type = objType;
    } else if (!hasKind(objInfo.type, 'array')) {
      objInfo.type = union(objInfo.type, objType);
    }

    let propValue;
    if (!ast.computed) {
      // 'a.b': ast.property is an Identifier
      propValue = ast.property.name;
      const members = objInfo.members || (objInfo.members = {});
      memberInfo = visit(ast.property, Scope.withMembers(members));
    } else {
      // 'a[b]': ast.property is an Expression
      const propInfo = visit(ast.property, scope);
      if (propInfo && 'value' in propInfo) {
        propValue = propInfo.value;
      }
    }

    // special case when object and property are constant
    if (propValue !== undefined && 'value' in objInfo) {
      const value = objInfo.value[propValue];
      memberInfo = {
        type: kindOf(value),
        value
      };
    }

    return memberInfo;
  },
  ConditionalExpression(ast, scope) {
    const testInfo = visit(ast.test, scope);
    const consequent = visit(ast.consequent, scope);
    const alternate = visit(ast.alternate, scope);
    if (testInfo && 'value' in testInfo) {
      return testInfo.value ? consequent : alternate;
    }
    return unionInfo(consequent, alternate);
  },
  CallExpression(ast, scope) {
    const funcInfo = visit(ast.callee, scope);
    if (funcInfo) {
      funcInfo.type = 'function';
    }
    // TODO: evaluate built-in and constant value functions
    for (const arg of ast.arguments) {
      visit(arg, scope);
    }
  },
  NewExpression(ast, scope) {
    const ctorInfo = visit(ast.callee, scope);
    if (ctorInfo) {
      ctorInfo.type = 'function';
    }
    for (const arg of ast.arguments) {
      visit(arg, scope);
    }
    return {
      type: 'object'
    };
  },
  SequenceExpression(ast, scope) {
    let lastInfo;
    for (const expr of ast.expressions) {
      lastInfo = visit(expr, scope);
    }
    return lastInfo;
  },
  ClassDeclaration(ast, scope) {
    declare(ast, scope);
    analyzeClass(ast, scope);
  },
  ClassExpression(ast, scope) {
    analyzeClass(ast, scope);
  },
  MetaProperty(ast) {
    if (ast.meta.name === 'new' && ast.property.name === 'target') {
      return {
        type: 'function'
      };
    }
  }
}
function declare(ast, scope) {
  const name = ast.id.name;
  return scope.addOwnMember(name, {
    name
  });
}

function analyzeBody(ast, scope) {
  let processDirectives = scope.isTopLevel();
  for (const stmt of ast.body) {
    if (processDirectives) {
      if (stmt.type === 'ExpressionStatement' &&
        stmt.expression.type === 'Literal' &&
        stmt.expression.value === 'use strict') {
        scope.useStrict();
        continue;
      }
      processDirectives = false;
    }
    visit(stmt, scope);
  }
}

function analyzeClass(ast, scope) {
  if (ast.superClass) {
    visit(ast.superClass, scope);
  }
  scope = scope.createNested();
  for (const def of ast.body.body) {
    visit(def.key, scope);
    visit(def.value, scope);
  }
}

function unionInfo(a, b) {
  if (a && b) {
    const result = {};
    if (a.type && b.type) {
      result.type = union(a.type, b.type);
    }
    return result;
  }
}
