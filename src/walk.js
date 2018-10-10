'use strict';

/**
 * AST walker module.
 * @module walk
 * @private
 */

function walk(ast, state, visitors) {
  // track ancestors if caller provides an array in state
  const ancestors = state && state.ancestors;

  function visit(node, state, override) {
    const type = node.type;
    const visitorTypes = [];
    if (override) {
      visitorTypes.push(override);
    } else if (type in groups) {
      visitorTypes.push(...groups[type]);
    }
    visitorTypes.push(type);

    if (ancestors) {
      ancestors.push(node);
    }

    // invoke before-visitors from least specific to most
    let beforeResult;
    for (const vtype of visitorTypes) {
      const beforeVisitor = visitors[vtype + 'Before'];
      if (beforeVisitor) {
        // before-visitors may skip subtrees or apply their own walker
        beforeResult = beforeVisitor(node, state, visit);
        if (beforeResult === false) break;
        if (beforeResult) state = beforeResult;
      }
    }

    if (beforeResult !== false) {
      // sometimes overrides have their own walker, sometimes not
      const walker = (override && walkers[override]) || walkers[type];
      if (!walker) {
        throw new Error(`Unhandled AST node type '${type}'`);
      }
      walker(node, state, visit);

      // invoke after-visitors from most specific to least
      visitorTypes.reverse();
      for (const vtype of visitorTypes) {
        const afterVisitor = visitors[vtype];
        if (afterVisitor) {
          const afterResult = afterVisitor(node, state);
          if (afterResult) state = afterResult;
        }
      }
    }

    if (ancestors) {
      ancestors.pop();
    }
  }

  visit(ast, state);
}

// visitor groups
const ModuleDeclaration = 'ModuleDeclaration';
const Declaration = 'Declaration';
const Function = 'Function';
const Class = 'Class';
const Statement = 'Statement';
const Expression = 'Expression';

// context-dependent node type overrides
const Directive = 'Directive';
const FunctionBody = 'FunctionBody';
const Pattern = 'Pattern';
const AssignmentProperty = 'AssignmentProperty';

// maps node types to visitor group names in order of increasing specificity
const groups = {};

// maps node types to walker functions
const walkers = {};

walkers.Program =
  walkers.FunctionBody = (node, state, visit) => {
    for (const stmt of node.body) {
      visit(stmt, state, stmt.directive ? Directive : undefined);
    }
  };

// imports

groups.ImportDeclaration =
  groups.ExportNamedDeclaration =
  groups.ExportDefaultDeclaration =
  groups.ExportAllDeclaration = [ModuleDeclaration];

walkers.ImportDeclaration = (node, state, visit) => {
  for (const spec of node.specifiers) {
    visit(spec, state);
  }
  visit(node.source, state);
};
walkers.ImportSpecifier = (node, state, visit) => {
  visit(node.local, state);
  visit(node.imported, state);
};
walkers.ImportDefaultSpecifier =
  walkers.ImportNamespaceSpecifier = (node, state, visit) =>
  visit(node.local, state);

// exports

walkers.ExportNamedDeclaration = (node, state, visit) => {
  if (node.declaration) {
    visit(node.declaration, state);
  }
  for (const spec of node.specifiers) {
    visit(spec, state);
  }
  if (node.source) {
    visit(node.source, state);
  }
};
walkers.ExportSpecifier = (node, state, visit) => {
  visit(node.local, state);
  visit(node.exported, state);
};
walkers.ExportDefaultDeclaration = (node, state, visit) =>
  visit(node.declaration, state);
walkers.ExportAllDeclaration = (node, state, visit) =>
  visit(node.source, state);

// variables

groups.VariableDeclaration = [Statement, Declaration];

walkers.VariableDeclaration = (node, state, visit) => {
  for (const decl of node.declarations) {
    visit(decl, state);
  }
};
walkers.VariableDeclarator = (node, state, visit) => {
  visit(node.id, state, Pattern);
  if (node.init) {
    visit(node.init, state);
  }
};

// functions

groups.FunctionDeclaration = [Declaration, Function];
groups.FunctionExpression =
  groups.ArrowFunctionExpression = [Expression, Function];

walkers.FunctionDeclaration =
  walkers.FunctionExpression =
  walkers.ArrowFunctionExpression = (node, state, visit) => {
    if (node.id) {
      visit(node.id, state, Pattern);
    }
    for (const param of node.params) {
      visit(param, state, Pattern);
    }
    visit(node.body, state, !node.expression ? FunctionBody : undefined);
  };

// classes

groups.ClassDeclaration = [Declaration, Class];
groups.ClassExpression = [Expression, Class];

walkers.ClassDeclaration =
  walkers.ClassExpression = (node, state, visit) => {
    if (node.id) {
      visit(node.id, state, Pattern);
    }
    if (node.superClass) {
      visit(node.superClass, state);
    }
    visit(node.body, state);
  };
walkers.ClassBody = (node, state, visit) => {
  for (const def of node.body) {
    visit(def, state);
  }
};
walkers.MethodDefinition =
  walkers.Property = (node, state, visit) => {
    visit(node.key, state, !node.computed ? Pattern : undefined);
    visit(node.value, state);
  }

// statements

groups.EmptyStatement =
  groups.DebuggerStatement =
  groups.BreakStatement =
  groups.ContinueStatement =
  groups.ExpressionStatement =
  groups.BlockStatement =
  groups.WithStatement =
  groups.ReturnStatement =
  groups.LabeledStatement =
  groups.IfStatement =
  groups.SwitchStatement =
  groups.ThrowStatement =
  groups.TryStatement =
  groups.WhileStatement =
  groups.DoWhileStatement =
  groups.ForStatement =
  groups.ForInStatement =
  groups.ForOfStatement = [Statement];

walkers.EmptyStatement =
  walkers.DebuggerStatement =
  walkers.BreakStatement =
  walkers.ContinueStatement = ignore;
walkers.ExpressionStatement =
  walkers.ParenthesizedExpression = (node, state, visit) =>
  visit(node.expression, state);
walkers.BlockStatement = (node, state, visit) => {
  for (const stmt of node.body) {
    visit(stmt, state);
  }
};
walkers.WithStatement = (node, state, visit) => {
  visit(node.object, state);
  visit(node.body, state);
};
walkers.ReturnStatement =
  walkers.YieldExpression =
  walkers.AwaitExpression = (node, state, visit) => {
    if (node.argument) {
      visit(node.argument, state);
    }
  };
walkers.LabeledStatement = (node, state, visit) =>
  visit(node.body, state);
walkers.IfStatement = (node, state, visit) => {
  visit(node.test, state);
  visit(node.consequent, state);
  if (node.alternate) {
    visit(node.alternate, state);
  }
};
walkers.SwitchStatement = (node, state, visit) => {
  visit(node.discriminant, state);
  for (const c of node.cases) {
    visit(c, state);
  }
};
walkers.SwitchCase = (node, state, visit) => {
  if (node.test) {
    visit(node.test, state);
  }
  for (const stmt of node.consequent) {
    visit(stmt, state);
  }
};
walkers.ThrowStatement = (node, state, visit) => {
  visit(node.argument, state);
};
walkers.TryStatement = (node, state, visit) => {
  visit(node.block, state);
  if (node.handler) {
    visit(node.handler, state);
  }
  if (node.finalizer) {
    visit(node.finalizer, state);
  }
};
walkers.CatchClause = (node, state, visit) => {
  if (node.param) {
    visit(node.param, state, Pattern);
  }
  visit(node.body, state);
};
walkers.WhileStatement =
  walkers.DoWhileStatement = (node, state, visit) => {
    visit(node.test, state);
    visit(node.body, state);
  };
walkers.ForStatement = (node, state, visit) => {
  if (node.init) {
    visit(node.init, state);
  }
  if (node.test) {
    visit(node.test, state);
  }
  if (node.update) {
    visit(node.update, state);
  }
  visit(node.body, state);
};
walkers.ForInStatement =
  walkers.ForOfStatement = (node, state, visit) => {
    visit(node.left, state, node.type !== 'VariableDeclaration' ? Pattern : undefined);
    visit(node.right, state);
    visit(node.body, state);
  };

// expressions

groups.ArrayExpression =
  groups.ObjectExpression =
  groups.UnaryExpression =
  groups.UpdateExpression =
  groups.BinaryExpression =
  groups.LogicalExpression =
  groups.AssignmentExpression =
  groups.MemberExpression =
  groups.ConditionalExpression =
  groups.CallExpression =
  groups.NewExpression =
  groups.SequenceExpression =
  groups.YieldExpression =
  groups.AwaitExpression =
  groups.Identifier =
  groups.Literal =
  groups.ThisExpression =
  groups.MetaProperty =
  groups.TemplateLiteral =
  groups.TaggedTemplateExpression =
  groups.ParenthesizedExpression = [Expression];

walkers.ArrayExpression = (node, state, visit) => {
  for (const element of node.elements) {
    if (element) {
      visit(element, state);
    }
  }
};
walkers.ObjectExpression = (node, state, visit) => {
  for (const prop of node.properties) {
    visit(prop, state);
  }
};
walkers.UnaryExpression =
  walkers.UpdateExpression =
  walkers.SpreadElement = (node, state, visit) => {
    visit(node.argument, state);
  };
walkers.BinaryExpression =
  walkers.LogicalExpression = (node, state, visit) => {
    visit(node.left, state);
    visit(node.right, state);
  };
walkers.AssignmentExpression =
  walkers.AssignmentPattern = (node, state, visit) => {
    visit(node.left, state, Pattern);
    visit(node.right, state);
  };
walkers.MemberExpression = (node, state, visit) => {
  visit(node.object, state);
  visit(node.property, state, !node.computed ? Pattern : undefined);
};
walkers.ConditionalExpression = (node, state, visit) => {
  visit(node.test, state);
  visit(node.consequent, state);
  visit(node.alternate, state);
};
walkers.CallExpression =
  walkers.NewExpression = (node, state, visit) => {
    visit(node.callee, state);
    if (node.arguments) {
      for (const arg of node.arguments) {
        visit(arg, state);
      }
    }
  };
walkers.SequenceExpression = (node, state, visit) => {
  for (const expr of node.expressions) {
    visit(expr, state);
  }
};
walkers.Identifier =
  walkers.Literal =
  walkers.ThisExpression =
  walkers.Super =
  walkers.MetaProperty = ignore;

// template literals

walkers.TemplateLiteral = (node, state, visit) => {
  for (const quasi of node.quasis) {
    visit(quasi, state);
  }
  for (const expr of node.expressions) {
    visit(expr, state);
  }
};
walkers.TemplateElement = ignore;
walkers.TaggedTemplateExpression = (node, state, visit) => {
  visit(node.tag, state);
  visit(node.quasi, state);
};

// patterns

walkers.ArrayPattern = (node, state, visit) => {
  for (const element of node.elements) {
    if (element) {
      visit(element, state, Pattern);
    }
  }
};
walkers.ObjectPattern = (node, state, visit) => {
  for (const prop of node.properties) {
    visit(prop, state, node.type === 'Property' ? AssignmentProperty : undefined);
  }
};
walkers.AssignmentProperty = (node, state, visit) => {
  visit(node.key, state, !node.computed ? Pattern : undefined);
  visit(node.value, state, Pattern);
};
walkers.RestElement = (node, state, visit) =>
  visit(node.argument, state, Pattern);

function ignore() {}

module.exports = walk;