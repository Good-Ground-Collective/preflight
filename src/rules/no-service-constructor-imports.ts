import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

const serviceConstructor = /^make[A-Z]/u;
const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;

/**
 * An Effect service constructor carries the service's dependencies in its
 * signature, so importing one into runtime code pins those dependencies at the
 * import site instead of letting them propagate to the composition root. Test
 * files are exempt, where constructing a service directly is the point.
 * Ported from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-service-constructor-imports',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow project-local `make<CapabilityName>` imports outside test and spec files',
    },
    messages: {
      serviceConstructorImport:
        'Do not import Effect service constructor "{{name}}" into runtime code. Import the owning Layer, yield the contextual service, and allow its requirements to propagate to the composition root.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Windows separators are normalized so the suffix test matches either form.
    const isTestFile = testFile.test(context.filename.replaceAll('\\', '/'));

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        const source = node.source.value;
        if (
          isTestFile ||
          !(source.startsWith('./') || source.startsWith('../'))
        ) {
          return;
        }

        for (const specifier of node.specifiers) {
          if (specifier.type !== AST_NODE_TYPES.ImportSpecifier) continue;
          const imported = specifier.imported;
          const name =
            imported.type === AST_NODE_TYPES.Identifier
              ? imported.name
              : imported.value;
          if (!serviceConstructor.test(name)) continue;
          context.report({
            node: specifier,
            messageId: 'serviceConstructorImport',
            data: { name },
          });
        }
      },
    };
  },
});
