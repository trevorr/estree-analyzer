import { walk } from '../walk.mjs';
import { newDeclarativeEnvironment } from '../model/environment.mjs';
import { newFunction, ThisMode } from '../model/function.mjs';

export function bindFunctionDeclarations(func, args, execContext) {

  const parameterNames = new Set();
  let hasDuplicates = false;
  let simpleParameterList = true;
  let hasParameterExpressions = false;

  for (const paramNode of func.formalParameters) {
    walk(paramNode, undefined, {
      Pattern(node) {
        if (node.type === 'Identifier') {
          const name = node.name;
          if (parameterNames.has(name)) {
            hasDuplicates = true;
          } else {
            parameterNames.add(name);
          }
        } else {
          simpleParameterList = false;
        }
      },
      ExpressionBefore() {
        hasParameterExpressions = true;
        return false;
      }
    }, 'Pattern');
  }

  const env = execContext.variableEnvironment;
  const envRec = env.record;
  const declaredNames = new Set();
  const funcDecls = [];
  const varNames = new Set();
  const lexDeclNames = [];

  walk(func.body, {
    inLexicalRoot: true
  }, {
    VariableDeclarationBefore(node, state, visit) {
      for (const decl of node.declarations) {
        visit(decl.id, { ...state,
          decl: node
        }, 'Pattern');
      }
      // ignore initializer
      return false;
    },
    FunctionDeclarationBefore(node, state, visit) {
      if (node.id) {
        visit(node.id, { ...state,
          decl: node
        }, 'Pattern');
      }
      // ignore arguments and body
      return false;
    },
    ClassDeclarationBefore(node, state, visit) {
      if (node.id) {
        visit(node.id, { ...state,
          decl: node
        }, 'Pattern');
      }
      // ignore superclass and body
      return false;
    },
    ExpressionBefore() {
      // ignore all expressions
      return false;
    },
    StatementBefore(node, state) {
      if (state.inLexicalRoot && node.type !== 'VariableDeclaration') {
        return { ...state,
          inLexicalRoot: false
        };
      }
    },
    Pattern(node, state) {
      const {
        decl,
        inLexicalRoot
      } = state;
      if (node.type === 'Identifier' && decl != null) {
        const name = node.name;
        const lexical = isLexicalDeclaration(decl);
        if (lexical && !inLexicalRoot) {
          return;
        }
        const newName = !declaredNames.has(name);
        if (lexical && !newName) {
          throw new SyntaxError(`Identifier '${name}' has already been declared`);
        }
        if (newName) {
          declaredNames.add(name);
        }
        if (decl.type === 'FunctionDeclaration') {
          funcDecls.push(decl);
        } else if (!lexical) {
          varNames.add(name);
        } else {
          lexDeclNames.push([decl, name]);
        }
      }
    }
  });

  // check functions declarations in reverse order,
  // keeping only the last with a given name
  const funcsToInit = [];
  const funcNames = new Set();
  let funcDecl;
  while ((funcDecl = funcDecls.pop())) {
    const name = funcDecl.id.name;
    if (!funcNames.has(name)) {
      funcNames.add(name);
      funcsToInit.unshift(funcDecl);
    }
  }

  // determine whether an `arguments` object is needed
  const argumentsName = 'arguments';
  const argumentsObjectNeeded =
    func.thisMode !== ThisMode.Lexical &&
    !parameterNames.has(argumentsName) &&
    !hasParameterExpressions &&
    !declaredNames.has(argumentsName);

  // bind parameters
  for (const paramName of parameterNames.values()) {
    if (!envRec.hasBinding(paramName)) {
      envRec.createMutableBinding(paramName, false);
      if (hasDuplicates) {
        envRec.initializeBinding(paramName, undefined);
      }
    }
  }

  // construct and bind `arguments` if needed
  const strict = func.strict;
  if (argumentsObjectNeeded) {
    let argumentsObject;
    if (strict || !simpleParameterList) {
      argumentsObject = createUnmappedArgumentsObject(args);
    } else {
      argumentsObject = createMappedArgumentsObject(args, func, envRec);
    }
    if (strict) {
      envRec.createImmutableBinding(argumentsName, false);
    } else {
      envRec.createMutableBinding(argumentsName, false);
    }
    envRec.initializeBinding(argumentsName, argumentsObject);
    parameterNames.add(argumentsName);
  }

  // TODO: perform IteratorBindingInitialization

  // bind vars
  let varEnv;
  let varEnvRec;
  if (!hasParameterExpressions) {
    for (const varName of varNames.values()) {
      if (!parameterNames.has(varName)) {
        envRec.createMutableBinding(varName, false);
        envRec.initializeBinding(varName, undefined);
      }
    }
    varEnv = env;
    varEnvRec = envRec;
  } else {
    varEnv = newDeclarativeEnvironment(env);
    varEnvRec = varEnv.record;
    execContext.variableEnvironment = varEnv;
    for (const varName of varNames.values()) {
      envRec.createMutableBinding(varName, false);
      let initialValue;
      if (parameterNames.has(varName) && !funcNames.has(varName)) {
        initialValue = envRec.getBindingValue(varName);
      }
      envRec.initializeBinding(varName, initialValue);
    }
  }

  // non-strict functions have separate lexical environment for direct eval
  const lexEnv = strict ? varEnv : newDeclarativeEnvironment(varEnv);
  const lexEnvRec = lexEnv.record;
  execContext.lexicalEnvironment = lexEnv;

  // bind lexicals
  let lexDeclName;
  while ((lexDeclName = lexDeclNames.shift())) {
    if (lexDeclName[0].kind === 'const') {
      lexEnvRec.createImmutableBinding(lexDeclName[1], true);
    } else {
      lexEnvRec.createMutableBinding(lexDeclName[1], false);
    }
  }

  // bind functions
  for (const funcDecl of funcsToInit) {
    const name = funcDecl.id.name;
    const model = newFunction(execContext.realm, lexEnv, funcDecl, strict);
    varEnvRec.setMutableBinding(name, model, false);
  }
}

function createUnmappedArgumentsObject(args) {
  // TODO: model unmapped arguments?
  return args;
}

function createMappedArgumentsObject(args) {
  // TODO: model mapped arguments?
  return args;
}

function isLexicalDeclaration(decl) {
  return decl.kind === 'let' || decl.kind === 'const' || decl.type === 'ClassDeclaration';
}
