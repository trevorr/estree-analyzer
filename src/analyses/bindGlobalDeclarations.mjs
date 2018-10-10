import { walk } from '../walk.mjs';
import { newFunction } from '../model/function.mjs';

export function bindGlobalDeclarations(scriptAst, execContext) {

  const env = execContext.variableEnvironment;
  const envRec = env.record;
  const declaredNames = new Set();
  const funcDecls = [];
  const varNames = [];
  const lexDeclNames = [];

  walk(scriptAst, {
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
        if (envRec.hasVarDeclaration(name) || (lexical &&
            (envRec.hasLexicalDeclaration(name) ||
              envRec.hasRestrictedGlobalProperty(name) ||
              !newName))) {
          throw new SyntaxError(`Identifier '${name}' has already been declared`);
        }
        if (newName) {
          declaredNames.add(name);
        }
        if (decl.type === 'FunctionDeclaration') {
          funcDecls.push(decl);
        } else if (!lexical) {
          varNames.push(name);
        } else {
          lexDeclNames.push([decl, name]);
        }
      }
    }
  });

  // check global functions declarations in reverse order,
  // keeping only the last with a given name
  const funcsToInit = [];
  const declaredFuncNames = new Set();
  let funcDecl;
  while ((funcDecl = funcDecls.pop())) {
    const name = funcDecl.id.name;
    if (!declaredFuncNames.has(name)) {
      if (!envRec.canDeclareGlobalFunction(name)) {
        throw new TypeError(`Cannot declare global function with identifier '${name}'`);
      }
      declaredFuncNames.add(name);
      funcsToInit.unshift(funcDecl);
    }
  }

  // create global function bindings in declaration order
  while ((funcDecl = funcsToInit.shift())) {
    const name = funcDecl.id.name;
    const model = newFunction(execContext.realm, env, funcDecl, execContext.strict);
    envRec.createGlobalFunctionBinding(name, model, false);
  }

  // check and create global var bindings in declaration order
  const declaredVarNames = new Set();
  let varName;
  while ((varName = varNames.shift())) {
    if (!declaredFuncNames.has(varName)) {
      if (!envRec.canDeclareGlobalVar(varName)) {
        throw new TypeError(`Cannot declare global variable with identifier '${varName}'`);
      }
      if (!declaredVarNames.has(varName)) {
        declaredVarNames.add(varName);
        envRec.createGlobalVarBinding(varName, false);
      }
    }
  }

  // create lexical bindings in declaration order
  let lexDeclName;
  while ((lexDeclName = lexDeclNames.shift())) {
    if (lexDeclName[0].kind === 'const') {
      envRec.createImmutableBinding(lexDeclName[1], true);
    } else {
      envRec.createMutableBinding(lexDeclName[1], false);
    }
  }
}

function isLexicalDeclaration(decl) {
  return decl.kind === 'let' || decl.kind === 'const' || decl.type === 'ClassDeclaration';
}
