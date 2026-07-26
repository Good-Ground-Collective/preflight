import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

export const rule = createRule({
  name: 'error-class-sets-name',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require Error subclasses to set `name` so runtime errors identify as themselves, not the base class',
    },
    fixable: 'code',
    messages: {
      missingName:
        "Error class '{{name}}' never sets `name`; at runtime its errors will identify as the base class. Add `override name = '{{name}}';`.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context;

    /**
     * `name` counts as set when the class body has a non-static, non-computed
     * `name` property definition, or the constructor contains a top-level
     * `this.name = …` assignment. Deliberately shallow — a heuristic, not a
     * data-flow analysis — which is acceptable for lint.
     */
    function setsName(cls: ClassNode): boolean {
      return cls.body.body.some((member) => {
        if (
          member.type === 'PropertyDefinition' &&
          !member.static &&
          !member.computed &&
          member.key.type === 'Identifier' &&
          member.key.name === 'name'
        ) {
          return true;
        }
        if (member.type === 'MethodDefinition' && member.kind === 'constructor') {
          return (member.value.body?.body ?? []).some(
            (statement) =>
              statement.type === 'ExpressionStatement' &&
              statement.expression.type === 'AssignmentExpression' &&
              statement.expression.left.type === 'MemberExpression' &&
              statement.expression.left.object.type === 'ThisExpression' &&
              !statement.expression.left.computed &&
              statement.expression.left.property.type === 'Identifier' &&
              statement.expression.left.property.name === 'name',
          );
        }
        return false;
      });
    }

    function checkClass(node: ClassNode): void {
      const superClass = node.superClass;
      const errorLike =
        superClass?.type === 'Identifier' && /Error$/.test(superClass.name);
      if (!errorLike || setsName(node)) {
        return;
      }

      const className =
        node.id?.name ??
        (node.parent.type === 'VariableDeclarator' &&
        node.parent.id.type === 'Identifier'
          ? node.parent.id.name
          : null);

      context.report({
        node: node.id ?? node,
        messageId: 'missingName',
        data: { name: className ?? '<anonymous>' },
        // No name to write for a truly anonymous class expression → no fix.
        fix: className
          ? (fixer) => {
              // Anchor on the ClassBody's `{` so empty bodies work too.
              const openBrace = sourceCode.getFirstToken(node.body)!;
              // Best-effort column guess; a formatter normalizes the result.
              const indent = ' '.repeat(
                sourceCode.getFirstToken(node)!.loc.start.column + 2,
              );
              return fixer.insertTextAfter(
                openBrace,
                `\n${indent}override name = '${className}';`,
              );
            }
          : null,
      });
    }

    return {
      ClassDeclaration(node): void {
        checkClass(node);
      },
      ClassExpression(node): void {
        checkClass(node);
      },
    };
  },
});
