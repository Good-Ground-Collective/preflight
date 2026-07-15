import { RuleTester } from '@typescript-eslint/rule-tester';
import { createRule } from '../../src/utils.js';

const smokeRule = createRule({
  name: 'smoke',
  meta: {
    type: 'problem',
    docs: {
      description: 'Throwaway rule proving the RuleTester harness runs',
    },
    messages: {
      smokeDetected: 'Smoke identifier detected.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      'Identifier[name="__preflight_smoke__"]'(node) {
        context.report({ node, messageId: 'smokeDetected' });
      },
    };
  },
});

const ruleTester = new RuleTester();

ruleTester.run('smoke', smokeRule, {
  valid: ['const ok: number = 1;'],
  invalid: [
    {
      code: 'const __preflight_smoke__ = 1;',
      errors: [{ messageId: 'smokeDetected' }],
    },
  ],
});
