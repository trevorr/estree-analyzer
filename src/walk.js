'use strict';

/**
 * AST walker module.
 * @module walk
 * @private
 */

function walk(ast, state, visitors) {
  // track ancestors if caller provides an array in state
  const ancestors = state && state.ancestors;

  function visit(node, state, group) {
    const type = group || node.type;

    // due to groups, we may visit the same node repeatedly
    const newNode = ancestors && node !== ancestors[ancestors.length - 1];
    if (newNode) {
      ancestors.push(node);
    }

    let descend = true;
    const beforeVisitor = visitors[type + 'Before'];
    if (beforeVisitor) {
      // before-visitors may skip subtrees or apply their own walker
      descend = beforeVisitor(node, state, visit);
    }

    if (descend !== false) {
      const walker = walkers[type];
      if (!walker) {
        throw new Error(`Unhandled AST node type '${type}'`);
      }
      walker(node, state, visit);

      const afterVisitor = visitors[type];
      if (afterVisitor) {
        afterVisitor(node, state);
      }
    }

    if (newNode) {
      ancestors.pop();
    }
  }

  visit(ast, state);
}

const walkers = {};

walkers.Program = walkExecutionContextBody;

const DirectiveGroup = 'Directive';
walkers[DirectiveGroup] = (node, state, visit) =>
  visit(node, state, StatementGroup);

// imports

walkers.ImportDeclaration = (node, state, visit) => {
  for (const spec of node.specifiers) {
    visit(spec, state);
  }
  visit(node.source, state, ExpressionGroup);
};
walkers.ImportSpecifier = (node, state, visit) => {
  visit(node.local, state, PatternGroup);
  visit(node.imported, state, PatternGroup);
};
walkers.ImportDefaultSpecifier =
  walkers.ImportNamespaceSpecifier = (node, state, visit) =>
  visit(node.local, state, PatternGroup);

// exports

walkers.ExportNamedDeclaration = (node, state, visit) => {
  if (node.declaration) {
    visit(node.declaration, state, DeclarationGroup);
  }
  for (const spec of node.specifiers) {
    visit(spec, state);
  }
  if (node.source) {
    visit(node.source, state, ExpressionGroup);
  }
};
walkers.ExportSpecifier = (node, state, visit) => {
  visit(node.local, state, PatternGroup);
  visit(node.exported, state, PatternGroup);
};
walkers.ExportDefaultDeclaration = (node, state, visit) =>
  visit(node.declaration, state, isDeclaration(node.declaration) ? DeclarationGroup : ExpressionGroup);
walkers.ExportAllDeclaration = (node, state, visit) =>
  visit(node.source, state, ExpressionGroup);

// declarations:

const DeclarationGroup = 'Declaration';
walkers[DeclarationGroup] = revisit;

// variables

walkers.VariableDeclaration = (node, state, visit) => {
  for (const decl of node.declarations) {
    visit(decl, state);
  }
};
walkers.VariableDeclarator = (node, state, visit) => {
  visit(node.id, state, PatternGroup);
  if (node.init) {
    visit(node.init, state, ExpressionGroup);
  }
};

// functions

const FunctionGroup = 'Function';
walkers[FunctionGroup] = (node, state, visit) => {
  if (node.id) {
    visit(node.id, state, PatternGroup);
  }
  for (const param of node.params) {
    visit(param, state, PatternGroup);
  }
  if (node.expression) {
    visit(node.body, state, ExpressionGroup);
  } else {
    walkExecutionContextBody(node.body, state, visit);
  }
};
walkers.FunctionDeclaration =
  walkers.FunctionExpression =
  walkers.ArrowFunctionExpression = (node, state, visit) =>
  visit(node, state, FunctionGroup);

// classes

const ClassGroup = 'Class';
walkers[ClassGroup] = (node, state, visit) => {
  if (node.id) {
    visit(node.id, state, PatternGroup);
  }
  if (node.superClass) {
    visit(node.superClass, state, ExpressionGroup);
  }
  visit(node.body, state);
};
walkers.ClassDeclaration =
  walkers.ClassExpression = (node, state, visit) =>
  visit(node, state, ClassGroup);
walkers.ClassBody = (node, state, visit) => {
  for (const def of node.body) {
    visit(def, state);
  }
};
walkers.MethodDefinition =
  walkers.Property = (node, state, visit) => {
    visit(node.key, state, node.computed ? ExpressionGroup : PatternGroup);
    visit(node.value, state, ExpressionGroup);
  }

// statements

const StatementGroup = 'Statement';
walkers[StatementGroup] = (node, state, visit) => {
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'VariableDeclaration':
    case 'ClassDeclaration':
      return visit(node, state, DeclarationGroup);
  }
  visit(node, state);
};
walkers.EmptyStatement =
  walkers.DebuggerStatement =
  walkers.BreakStatement =
  walkers.ContinueStatement = ignore;
walkers.ExpressionStatement =
  walkers.ParenthesizedExpression = (node, state, visit) =>
  visit(node.expression, state, ExpressionGroup);
walkers.BlockStatement = (node, state, visit) => {
  for (const stmt of node.body) {
    visit(stmt, state, StatementGroup);
  }
};
walkers.WithStatement = () => {
  visit(node.object, state, ExpressionGroup);
  visit(node.body, state, StatementGroup);
};
walkers.ReturnStatement =
  walkers.YieldExpression =
  walkers.AwaitExpression = (node, state, visit) => {
    if (node.argument) {
      visit(node.argument, state, ExpressionGroup);
    }
  };
walkers.LabeledStatement = (node, state, visit) =>
  visit(node.body, state, StatementGroup);
walkers.IfStatement = (node, state, visit) => {
  visit(node.test, state, ExpressionGroup);
  visit(node.consequent, state, StatementGroup);
  if (node.alternate) {
    visit(node.alternate, state, StatementGroup);
  }
};
walkers.SwitchStatement = (node, state, visit) => {
  visit(node.discriminant, state, ExpressionGroup);
  for (const c of node.cases) {
    visit(c, state);
  }
};
walkers.SwitchCase = (node, state, visit) => {
  if (node.test) {
    visit(node.test, state, ExpressionGroup);
  }
  for (const stmt of node.consequent) {
    visit(stmt, state, StatementGroup);
  }
};
walkers.ThrowStatement = (node, state, visit) => {
  visit(node.argument, state, ExpressionGroup);
};
walkers.TryStatement = (node, state, visit) => {
  visit(node.block, state, StatementGroup);
  if (node.handler) {
    visit(node.handler, state);
  }
  if (node.finalizer) {
    visit(node.finalizer, state, StatementGroup);
  }
};
walkers.CatchClause = (node, state, visit) => {
  if (node.param) {
    visit(node.param, state, PatternGroup);
  }
  visit(node.body, state, StatementGroup);
};
walkers.WhileStatement =
  walkers.DoWhileStatement = (node, state, visit) => {
    visit(node.test, state, ExpressionGroup);
    visit(node.body, state, StatementGroup);
  };
walkers.ForStatement = (node, state, visit) => {
  if (node.init) {
    visit(node.init, state, ForInitGroup);
  }
  if (node.test) {
    visit(node.test, state, ExpressionGroup);
  }
  if (node.update) {
    visit(node.update, state, ExpressionGroup);
  }
  visit(node.body, state, StatementGroup);
};
walkers.ForInStatement =
  walkers.ForOfStatement = (node, state, visit) => {
    visit(node.left, state, ForInitGroup);
    visit(node.right, state, ExpressionGroup);
    visit(node.body, state, StatementGroup);
  };
const ForInitGroup = 'ForInit';
walkers[ForInitGroup] = (node, state, visit) => {
  visit(node, state, node.type === 'VariableDeclaration' ? DeclarationGroup : ExpressionGroup);
};

// expressions

const ExpressionGroup = 'Expression';
walkers[ExpressionGroup] = revisit;
walkers.ThisExpression =
  walkers.Super =
  walkers.MetaProperty = ignore;
walkers.ArrayExpression = (node, state, visit) => {
  for (const element of node.elements) {
    if (element) {
      visit(element, state, ExpressionGroup);
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
    visit(node.argument, state, ExpressionGroup);
  };
walkers.BinaryExpression =
  walkers.LogicalExpression = (node, state, visit) => {
    visit(node.left, state, ExpressionGroup);
    visit(node.right, state, ExpressionGroup);
  };
walkers.AssignmentExpression =
  walkers.AssignmentPattern = (node, state, visit) => {
    visit(node.left, state, PatternGroup);
    visit(node.right, state, ExpressionGroup);
  };
walkers.MemberExpression = (node, state, visit) => {
  visit(node.object, state, ExpressionGroup);
  visit(node.property, state, node.computed ? ExpressionGroup : PatternGroup);
};
walkers.ConditionalExpression = (node, state, visit) => {
  visit(node.test, state, ExpressionGroup);
  visit(node.consequent, state, ExpressionGroup);
  visit(node.alternate, state, ExpressionGroup);
};
walkers.CallExpression =
  walkers.NewExpression = (node, state, visit) => {
    visit(node.callee, state, ExpressionGroup);
    if (node.arguments) {
      for (const arg of node.arguments) {
        visit(arg, state, ExpressionGroup);
      }
    }
  };
walkers.SequenceExpression = (node, state, visit) => {
  for (const expr of node.expressions) {
    visit(expr, state, ExpressionGroup);
  }
};

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
  visit(node.tag, state, ExpressionGroup);
  visit(node.quasi, state, ExpressionGroup);
};

// patterns

const PatternGroup = 'Pattern';
walkers[PatternGroup] = (node, state, visit) => {
  switch (node.type) {
    case 'Identifier':
      return visit(node, state, VariablePatternGroup);
    case 'MemberExpression':
      return visit(node, state, MemberPatternGroup);
  }
  visit(node, state);
};
const VariablePatternGroup = 'VariablePattern';
walkers[VariablePatternGroup] = revisit;
const MemberPatternGroup = 'MemberPattern';
walkers[MemberPatternGroup] = revisit;
walkers.Identifier =
  walkers.Literal = ignore;
walkers.ArrayPattern = (node, state, visit) => {
  for (const element of node.elements) {
    if (element) {
      visit(element, state, PatternGroup);
    }
  }
};
walkers.ObjectPattern = (node, state, visit) => {
  for (const prop of node.properties) {
    switch (prop.type) {
      case 'Property':
        visit(prop.key, state, prop.computed ? ExpressionGroup : PatternGroup);
        visit(prop.value, state, PatternGroup);
        break;
      case 'RestElement':
        visit(prop.argument, state, PatternGroup);
    }
  }
};
walkers.RestElement = (node, state, visit) =>
  visit(node.argument, state, PatternGroup);

// helpers

function walkExecutionContextBody(node, state, visit) {
  let checkDirective = true;
  for (const stmt of node.body) {
    visit(stmt, state,
      checkDirective && (checkDirective = isDirective(stmt)) ?
      DirectiveGroup : StatementGroup);
  }
}

function isDeclaration(node) {
  return node.id || node.type === 'VariableDeclaration';
}

function isDirective(stmt) {
  return stmt.type === 'ExpressionStatement' &&
    stmt.expression.type === 'Literal' &&
    typeof stmt.expression.value === 'string';
}

// visit specific type rather than group
function revisit(node, state, visit) {
  visit(node, state);
}

function ignore() {}

module.exports = walk;