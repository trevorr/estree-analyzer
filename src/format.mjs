import { Formatter } from './Formatter';
import { walk } from './walk';

export function format(ast, options = {}) {
  const fmt = new Formatter(options);

  function emitGuard(token, node, state, visit) {
    fmt.emit(token);
    fmt.emitSpace();
    fmt.emitLeading('(');
    visit(node, state);
    fmt.emitTrailing(')');
  }

  function emitNested(node, state, visit) {
    if (node.type !== 'BlockStatement') {
      fmt.emitNewline();
      fmt.incIndent();
      visit(node, state);
      fmt.decIndent();
    } else {
      fmt.emitSpace();
      visit(node, state);
    }
  }

  function emitList(nodes, state, visit) {
    state = { ...state,
      precedence: Precedence.Sequence - 1,
      inList: true
    };
    let first = true;
    for (const node of nodes) {
      if (!first) {
        fmt.emitTrailing(',');
        fmt.emitSpace();
      } else {
        first = false;
      }
      visit(node, state);
    }
  }

  function arrayVisitor(node, state, visit) {
    state = { ...state,
      precedence: Precedence.Sequence - 1,
      inList: true
    };
    delete state.leadingExpression;
    fmt.emitLeading('[');
    let first = true;
    for (const element of node.elements) {
      if (!first) {
        fmt.emitTrailing(',');
        fmt.emitSpace();
      } else {
        first = false;
      }
      if (element) {
        visit(element, state);
      }
    }
    fmt.emitTrailing(']');
    return false;
  }

  function objectVisitor(node, state, visit) {
    const needParens = node.type === 'ObjectExpression' && state.leadingExpression;
    delete state.leadingExpression;
    if (needParens) {
      fmt.emitLeading('(');
    }
    fmt.emitLeading('{');
    if (node.properties.length > 0) {
      fmt.emitSpace();
      emitList(node.properties, state, visit);
      fmt.emitSpace();
    }
    fmt.emitTrailing('}');
    if (needParens) {
      fmt.emitTrailing(')');
    }
    return false;
  }

  function unaryVisitor(node, state, visit) {
    const precedence = node.prefix ? Precedence.Prefix : Precedence.Postfix;
    const needParens = precedence > state.precedence;
    if (needParens) {
      delete state.leadingExpression;
      fmt.emitLeading('(');
    }
    if (node.prefix) {
      delete state.leadingExpression;
      fmt.emitLeading(node.operator);
      visit(node.argument, { ...state,
        precedence
      });
    } else {
      visit(node.argument, { ...state,
        precedence
      });
      fmt.emitTrailing(node.operator);
    }
    if (needParens) {
      fmt.emitTrailing(')');
    }
    return false;
  }

  function binaryVisitor(node, state, visit) {
    const precedence = binaryOpPrecedence[node.operator];
    const rightAssoc = precedence == Precedence.Exponent || precedence == Precedence.Assignment;
    const needParens = precedence > state.precedence || node.left.type === 'ObjectPattern';
    if (needParens) {
      delete state.leadingExpression;
      fmt.emitLeading('(');
    }
    visit(node.left, { ...state,
      precedence: precedence - (rightAssoc ? 1 : 0)
    });
    delete state.leadingExpression;
    fmt.emitBinaryOp(node.operator);
    visit(node.right, { ...state,
      precedence: precedence - (rightAssoc ? 0 : 1)
    });
    if (needParens) {
      fmt.emitTrailing(')');
    }
    return false;
  }

  walk(ast, {}, {

    // imports

    ImportDeclarationBefore(node, state, visit) {
      fmt.emitLeading('import');
      fmt.emitSpace();
      if (node.specifiers.length > 0) {
        let first = true;
        let gotNamed = false;
        for (const spec of node.specifiers) {
          if (!first) {
            fmt.emitTrailing(',');
            fmt.emitSpace();
          } else {
            first = false;
          }
          if (spec.type === 'ImportSpecifier' && !gotNamed) {
            gotNamed = true;
            fmt.emitLeading('{');
            fmt.emitSpace();
          }
          visit(spec, state);
        }
        if (gotNamed) {
          fmt.emitSpace();
          fmt.emitTrailing('}');
        }
        fmt.emitSpace();
        fmt.emitLeading('from');
        fmt.emitSpace();
      }
      visit(node.source, state);
      fmt.emitSemi();
      fmt.emitNewline();
      return false;
    },
    ImportSpecifierBefore(node) {
      fmt.emit(node.imported.name);
      if (node.local.name !== node.imported.name) {
        fmt.emitSpace();
        fmt.emitLeading('as');
        fmt.emitSpace();
        fmt.emit(node.local.name);
      }
      return false;
    },
    ImportDefaultSpecifierBefore(node) {
      fmt.emit(node.local.name);
      return false;
    },
    ImportNamespaceSpecifierBefore(node) {
      fmt.emitLeading('*');
      fmt.emitSpace();
      fmt.emitLeading('as');
      fmt.emitSpace();
      fmt.emit(node.local.name);
      return false;
    },

    // exports

    ExportNamedDeclarationBefore(node, state, visit) {
      fmt.emitLeading('export');
      fmt.emitSpace();
      if (node.declaration) {
        visit(node.declaration, state);
      } else {
        fmt.emitLeading('{');
        fmt.emitSpace();
        emitList(node.specifiers, state, visit);
        fmt.emitSpace();
        fmt.emitTrailing('}');
        if (node.source) {
          fmt.emitSpace();
          fmt.emitLeading('from');
          fmt.emitSpace();
          visit(node.source, state);
        }
        fmt.emitSemi();
        fmt.emitNewline();
      }
      return false;
    },
    ExportSpecifierBefore(node) {
      fmt.emit(node.local.name);
      if (node.exported.name !== node.local.name) {
        fmt.emitSpace();
        fmt.emitLeading('as');
        fmt.emitSpace();
        fmt.emit(node.exported.name);
      }
      return false;
    },
    ExportDefaultDeclarationBefore(node, state, visit) {
      fmt.emitLeading('export');
      fmt.emitSpace();
      fmt.emitLeading('default');
      fmt.emitSpace();
      visit(node.declaration, state);
      if (!node.declaration.type.endsWith('Declaration')) {
        fmt.emitSemi();
        fmt.emitNewline();
      }
      return false;
    },
    ExportAllDeclarationBefore(node, state, visit) {
      fmt.emitLeading('export');
      fmt.emitSpace();
      fmt.emit('*');
      fmt.emitSpace();
      fmt.emitLeading('from');
      fmt.emitSpace();
      visit(node.source, state);
      fmt.emitSemi();
      fmt.emitNewline();
      return false;
    },

    // variables

    VariableDeclarationBefore(node, state, visit) {
      state = { ...state,
        precedence: Precedence.Sequence - 1,
        inList: true
      };
      fmt.emitLeading(node.kind);
      fmt.emitSpace();
      let first = true;
      for (const decl of node.declarations) {
        if (!first) {
          fmt.emitTrailing(',');
          fmt.emitSpace();
        } else {
          first = false;
        }
        visit(decl.id, state);
        if (decl.init) {
          fmt.emitBinaryOp('=');
          visit(decl.init, state);
        }
      }
      fmt.emitSemi();
      fmt.emitNewline();
      return false;
    },

    // functions

    FunctionBefore(node, state, visit) {
      const arrow = node.type === 'ArrowFunctionExpression';
      const needParens = !arrow || node.params.length !== 1 || node.params[0].type !== 'Identifier';
      if (node.async) {
        fmt.emitLeading('async');
        fmt.emitSpace();
      }
      if (!arrow) {
        fmt.emitLeading('function');
        if (node.generator) {
          fmt.emitLeading('*');
        }
        if (node.id) {
          fmt.emitSpace();
          visit(node.id, state);
        }
        fmt.emitTrailing('(');
      } else if (needParens) {
        fmt.emitLeading('(');
      }
      emitList(node.params, state, visit);
      if (needParens) {
        fmt.emitTrailing(')');
      }
      fmt.emitSpace();
      if (arrow) {
        fmt.emitTrailing('=>');
        fmt.emitSpace();
      }
      visit(node.body, state);
      return false;
    },

    // classes

    ClassBefore(node, state, visit) {
      fmt.emit('class');
      if (node.id) {
        fmt.emitSpace();
        visit(node.id, state);
      }
      if (node.superClass) {
        fmt.emitSpace();
        fmt.emitLeading('extends')
        fmt.emitSpace();
        visit(node.superClass, { ...state,
          precedence: Precedence.NoArgNew
        });
      }
      fmt.emitSpace();
      fmt.emitTrailing('{');
      fmt.emitNewline();
      fmt.incIndent();
      for (const def of node.body.body) {
        visit(def, state);
      }
      fmt.decIndent();
      fmt.emitTrailing('}');
      fmt.emitNewline();
      return false;
    },
    MethodDefinitionBefore(node, state, visit) {
      if (node.static) {
        fmt.emitLeading('static');
        fmt.emitSpace();
      }
      if (node.value.async) {
        fmt.emitLeading('async');
        fmt.emitSpace();
      }
      switch (node.kind) {
        case 'get':
        case 'set':
          fmt.emitLeading(node.kind);
          fmt.emitSpace();
      }
      if (node.computed) {
        fmt.emitLeading('[');
        visit(node.key, state);
        fmt.emitTrailing(']');
      } else {
        visit(node.key, state);
      }
      fmt.emitTrailing('(');
      emitList(node.value.params, state, visit);
      fmt.emitTrailing(')');
      fmt.emitSpace();
      visit(node.value.body, state);
      return false;
    },
    PropertyBefore(node, state, visit) {
      switch (node.kind) {
        case 'get':
        case 'set':
          fmt.emitLeading(node.kind);
          fmt.emitSpace();
      }
      if (node.computed) {
        fmt.emitLeading('[');
        visit(node.key, state);
        fmt.emitTrailing(']');
      } else {
        visit(node.key, state);
      }
      if (node.value.type === 'FunctionExpression') {
        fmt.emitTrailing('(');
        emitList(node.value.params, state, visit);
        fmt.emitTrailing(')');
        fmt.emitSpace();
        visit(node.value.body, state);
      } else if (!node.shorthand) {
        fmt.emitTrailing(':');
        fmt.emitSpace();
        visit(node.value, state);
      }
      return false;
    },

    // statements

    EmptyStatement() {
      fmt.emitSemi();
      fmt.emitNewline();
    },
    DebuggerStatement() {
      fmt.emit('debugger');
      fmt.emitSemi();
      fmt.emitNewline();
    },
    BreakStatementBefore(node, state, visit) {
      fmt.emit('break');
      if (node.label) {
        fmt.emitSpace();
        visit(node.label, state);
      }
      fmt.emitSemi();
      fmt.emitNewline();
      return false;
    },
    ContinueStatementBefore(node, state, visit) {
      fmt.emit('continue');
      if (node.label) {
        fmt.emitSpace();
        visit(node.label, state);
      }
      fmt.emitSemi();
      fmt.emitNewline();
      return false;
    },
    ExpressionStatementBefore(node, state, visit) {
      // if first expression to emit a token is an object literal, it needs parentheses
      visit(node.expression, { ...state,
        leadingExpression: true
      });
      fmt.emitSemi();
      fmt.emitNewline();
      return false;
    },
    BlockStatementBefore(node, state, visit) {
      fmt.emitTrailing('{');
      if (node.body.length > 0) {
        fmt.emitNewline();
        fmt.incIndent();
        for (const stmt of node.body) {
          visit(stmt, state);
        }
        fmt.decIndent();
      }
      fmt.emitTrailing('}');
      if (!state.inList) {
        fmt.emitNewline();
      }
      return false;
    },
    WithStatementBefore(node, state, visit) {
      emitGuard('with', node.object, state, visit);
      fmt.emitSpace();
      visit(node.body, state);
      return false;
    },
    ReturnStatementBefore(node, state, visit) {
      fmt.emit('return');
      if (node.argument) {
        fmt.emitSpace();
        visit(node.argument, state);
      }
      fmt.emitSemi();
      fmt.emitNewline();
      return false;
    },
    LabeledStatementBefore(node, state, visit) {
      visit(node.label, state);
      fmt.emitTrailing(':');
      fmt.emitSpace();
      visit(node.body, state);
      return false;
    },
    IfStatementBefore(node, state, visit) {
      emitGuard('if', node.test, state, visit);
      if (!node.alternate && isSameLineStatement(node.consequent)) {
        fmt.emitSpace();
        visit(node.consequent, state);
      } else {
        emitNested(node.consequent, state, visit);
      }
      if (node.alternate) {
        fmt.emit('else');
        if (node.alternate.type === 'IfStatement') {
          fmt.emitSpace();
          visit(node.alternate, state);
        } else {
          emitNested(node.alternate, state, visit);
        }
      }
      return false;
    },
    SwitchStatementBefore(node, state, visit) {
      emitGuard('switch', node.discriminant, state, visit);
      fmt.emitSpace();
      fmt.emitTrailing('{');
      fmt.emitNewline();
      fmt.incIndent();
      for (const c of node.cases) {
        visit(c, state);
      }
      fmt.decIndent();
      fmt.emitTrailing('}');
      fmt.emitNewline();
      return false;
    },
    SwitchCaseBefore(node, state, visit) {
      if (node.test) {
        fmt.emit('case');
        fmt.emitSpace();
        visit(node.test, state);
      } else {
        fmt.emit('default');
      }
      fmt.emitTrailing(':');
      if (node.consequent.length === 1 && node.consequent[0].type === 'BlockStatement') {
        fmt.emitSpace();
        visit(node.consequent[0], state);
      } else {
        fmt.emitNewline();
        fmt.incIndent();
        for (const stmt of node.consequent) {
          visit(stmt, state);
        }
        fmt.decIndent();
      }
      return false;
    },
    ThrowStatementBefore(node, state, visit) {
      fmt.emit('throw');
      fmt.emitSpace();
      visit(node.argument, state);
      fmt.emitSemi();
      fmt.emitNewline();
      return false;
    },
    TryStatementBefore(node, state, visit) {
      fmt.emit('try');
      fmt.emitSpace();
      visit(node.block, state);
      if (node.handler) {
        fmt.emit('catch');
        fmt.emitSpace();
        if (node.handler.param) {
          fmt.emitLeading('(');
          visit(node.handler.param, state);
          fmt.emitTrailing(')');
          fmt.emitSpace();
        }
        visit(node.handler.body, state);
      }
      if (node.finalizer) {
        fmt.emit('finally');
        fmt.emitSpace();
        visit(node.finalizer, state);
      }
      return false;
    },
    WhileStatementBefore(node, state, visit) {
      emitGuard('while', node.test, state, visit);
      emitNested(node.body, state, visit);
      return false;
    },
    DoWhileStatementBefore(node, state, visit) {
      fmt.emit('do');
      emitNested(node.body, state, visit);
      emitGuard('while', node.test, state, visit);
      fmt.emitSemi();
      fmt.emitNewline();
      return false;
    },
    ForStatementBefore(node, state, visit) {
      fmt.emit('for');
      fmt.emitSpace();
      if (node.await) {
        fmt.emit('await');
        fmt.emitSpace();
      }
      fmt.emitLeading('(');
      if (node.init) {
        visit(node.init, state);
      }
      fmt.emitSemi();
      fmt.emitSpace();
      if (node.test) {
        visit(node.test, state);
      }
      fmt.emitSemi();
      fmt.emitSpace();
      if (node.update) {
        visit(node.update, state);
      }
      fmt.emitTrailing(')');
      emitNested(node.body, state, visit);
      return false;
    },
    ForInStatementBefore(node, state, visit) {
      fmt.emit('for');
      fmt.emitSpace();
      fmt.emitLeading('(');
      visit(node.left, state);
      fmt.emitBinaryOp('in');
      visit(node.right, state);
      fmt.emitTrailing(')');
      emitNested(node.body, state, visit);
      return false;
    },
    ForOfStatementBefore(node, state, visit) {
      fmt.emit('for');
      fmt.emitSpace();
      fmt.emitLeading('(');
      visit(node.left, state);
      fmt.emitBinaryOp('of');
      visit(node.right, state);
      fmt.emitTrailing(')');
      emitNested(node.body, state, visit);
      return false;
    },

    // expressions

    ThisExpression(_node, state) {
      delete state.leadingExpression;
      fmt.emit('this');
    },
    Super(_node, state) {
      delete state.leadingExpression;
      fmt.emit('super');
    },
    MetaProperty(node) {
      fmt.emit(node.meta.name);
      fmt.emitLeading('.');
      fmt.emit(node.property.name);
    },
    ArrayExpressionBefore: arrayVisitor,
    ObjectExpressionBefore: objectVisitor,
    UnaryExpressionBefore: unaryVisitor,
    UpdateExpressionBefore: unaryVisitor,
    BinaryExpressionBefore: binaryVisitor,
    LogicalExpressionBefore: binaryVisitor,
    AssignmentExpressionBefore: binaryVisitor,
    AssignmentPatternBefore(node, state, visit) {
      visit(node.left, state);
      delete state.leadingExpression;
      fmt.emitBinaryOp('=');
      visit(node.right, state);
      return false;
    },
    MemberExpressionBefore(node, state, visit) {
      const precedence = Precedence.MemberCall;
      visit(node.object, { ...state,
        precedence
      });
      delete state.leadingExpression;
      if (node.computed) {
        fmt.emitLeading('[');
        visit(node.property, state, clearPrecedence(state)); // expression
        fmt.emitTrailing(']');
      } else {
        fmt.emitLeading('.');
        visit(node.property, state); // identifier
      }
      return false;
    },
    ConditionalExpressionBefore(node, state, visit) {
      const precedence = Precedence.Conditional;
      const needParens = precedence > state.precedence;
      if (needParens) {
        delete state.leadingExpression;
        fmt.emitLeading('(');
      }
      visit(node.test, { ...state,
        precedence: precedence - 1
      });
      delete state.leadingExpression;
      fmt.emitBinaryOp('?');
      const altState = { ...state,
        precedence
      };
      visit(node.consequent, altState);
      fmt.emitBinaryOp(':');
      visit(node.alternate, altState);
      if (needParens) {
        fmt.emitTrailing(')');
      }
      return false;
    },
    CallExpressionBefore(node, state, visit) {
      const precedence = Precedence.MemberCall;
      visit(node.callee, { ...state,
        precedence
      });
      delete state.leadingExpression;
      fmt.emitTrailing('(');
      emitList(node.arguments, state, visit);
      fmt.emitTrailing(')');
      return false;
    },
    NewExpressionBefore(node, state, visit) {
      const precedence = Precedence.MemberCall;
      fmt.emit('new');
      fmt.emitSpace();
      visit(node.callee, { ...state,
        precedence
      });
      fmt.emitTrailing('(');
      emitList(node.arguments, state, visit);
      fmt.emitTrailing(')');
      return false;
    },
    SpreadElement() {
      fmt.emit('...');
    },
    SequenceExpressionBefore(node, state, visit) {
      const precedence = Precedence.Sequence;
      const needParens = precedence > state.precedence;
      if (needParens) {
        delete state.leadingExpression;
        fmt.emitLeading('(');
      }
      emitList(node.expressions, state, visit);
      if (needParens) {
        fmt.emitTrailing(')');
      }
      return false;
    },
    YieldExpressionBefore(node, state, visit) {
      const precedence = Precedence.Yield;
      const needParens = precedence > state.precedence;
      delete state.leadingExpression;
      if (needParens) {
        fmt.emitLeading('(');
      }
      fmt.emit('yield');
      if (node.delegate) {
        fmt.emitTrailing('*');
      }
      if (node.argument) {
        fmt.emitSpace();
        visit(node.argument, { ...state,
          precedence
        });
      }
      if (needParens) {
        fmt.emitTrailing(')');
      }
      return false;
    },
    AwaitExpressionBefore(node, state, visit) {
      const precedence = Precedence.Prefix;
      const needParens = precedence > state.precedence;
      delete state.leadingExpression;
      if (needParens) {
        fmt.emitLeading('(');
      }
      fmt.emit('await');
      fmt.emitSpace();
      visit(node.argument, { ...state,
        precedence
      });
      if (needParens) {
        fmt.emitTrailing(')');
      }
      return false;
    },
    ParenthesizedExpressionBefore(node, state, visit) {
      delete state.leadingExpression;
      fmt.emitLeading('(');
      visit(node.expression, clearPrecedence(state));
      fmt.emitLeading(')');
      return false;
    },

    // template literals

    TemplateLiteralBefore(node, state, visit) {
      let token = '`';
      for (let i = 0, l = node.expressions.length; i < l; ++i) {
        token += node.quasis[i].value.raw + '${';
        fmt.emit(token);
        visit(node.expressions[i], state);
        token = '}';
      }
      token += node.quasis[node.quasis.length - 1].value.raw + '`';
      fmt.emit(token);
      return false;
    },
    // nothing to do for TaggedTemplateExpression

    // patterns

    Identifier(node, state) {
      delete state.leadingExpression;
      fmt.emit(node.name);
    },
    Literal(node, state) {
      delete state.leadingExpression;
      if (node.raw) {
        fmt.emit(node.raw);
      } else if (node.regex) {
        fmt.emit(`/${node.regex.pattern}/${node.regex.flags}`)
      } else {
        fmt.emit(JSON.stringify(node.value));
      }
    },
    ArrayPatternBefore: arrayVisitor,
    ObjectPatternBefore: objectVisitor,
    RestElementBefore() {
      fmt.emit('...');
    }
  });
  fmt.flush();
}

const Precedence = {
  MemberCall: 1, // `x.y` `x[y]` `x(...)` `new x(...)`
  NoArgNew: 2, // `new x` (right associative)
  Postfix: 3, // `x++` `x--`
  Prefix: 4, // `!x` `~x` `+x` `-x` `++x` `--x` `typeof x` `void x` `delete x` `await x` (right associative)
  Exponent: 5, // `x ** y` (right associative)
  Multiply: 6, // `x * y` `x / y` `x % y`
  Add: 7, // `x + y` `x - y`
  Shift: 8, // `x << y` `x >> y` `x >>> y`
  Compare: 9, // `x < y` `x <= y` `x > y` `x >= y` `x in y` `x instanceof y`
  Equal: 10, // `x == y` `x != y` `x === y` `x !== y`
  BitAnd: 11, // `x & y`
  BitXor: 12, // `x ^ y`
  BitOr: 13, // `x | y`
  LogicalAnd: 14, // `x && y`
  LogicalOr: 15, // `x || y`
  Conditional: 16, // `x ? y : z` (right associative)
  Assignment: 17, // `x = y` `x += y` `x -= y` `x **= y` `x *= y` `x /= y` `x %= y` `x <<= y` `x >>= y` `x >>>= y` `x &= y` `x ^= y` `x |= y` (right associative)
  Yield: 18, // `yield x` `yield* x` (right associative)
  Sequence: 19, // `x, y`
};

const binaryOpPrecedence = {
  '**': Precedence.Exponent,
  '*': Precedence.Multiply,
  '/': Precedence.Multiply,
  '%': Precedence.Multiply,
  '+': Precedence.Add,
  '-': Precedence.Add,
  '<<': Precedence.Shift,
  '>>': Precedence.Shift,
  '>>>': Precedence.Shift,
  '<': Precedence.Compare,
  '<=': Precedence.Compare,
  '>': Precedence.Compare,
  '>=': Precedence.Compare,
  'in': Precedence.Compare,
  'instanceof': Precedence.Compare,
  '==': Precedence.Equal,
  '!=': Precedence.Equal,
  '===': Precedence.Equal,
  '!==': Precedence.Equal,
  '&': Precedence.BitAnd,
  '^': Precedence.BitXor,
  '|': Precedence.BitOr,
  '&&': Precedence.LogicalAnd,
  '||': Precedence.LogicalOr,
  '=': Precedence.Assignment,
  '+=': Precedence.Assignment,
  '-=': Precedence.Assignment,
  '**=': Precedence.Assignment,
  '*=': Precedence.Assignment,
  '/=': Precedence.Assignment,
  '%=': Precedence.Assignment,
  '<<=': Precedence.Assignment,
  '>>=': Precedence.Assignment,
  '>>>=': Precedence.Assignment,
  '&=': Precedence.Assignment,
  '^=': Precedence.Assignment,
  '|=': Precedence.Assignment
};

function clearPrecedence(state) {
  const {
    precedence,
    ...newState
  } = state;
  return newState;
}

function isSameLineStatement(stmt) {
  switch (stmt.type) {
    case 'BreakStatement':
    case 'ContinueStatement':
    case 'ReturnStatement':
    case 'ThrowStatement':
      return true;
  }
  return false;
}
