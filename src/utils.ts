import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/good-ground-collective/preflight/blob/main/docs/rules/${name}.md`,
);
