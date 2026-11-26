import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/filename-matches-export.js';

const ruleTester = new RuleTester();
const error = (name: string, expected: string) => ({
  messageId: 'mismatch' as const,
  data: { name, expected },
});

ruleTester.run('filename-matches-export', rule, {
  valid: [
    { code: 'export class LoggerBinder {}', filename: 'src/logger-binder.ts' },
    {
      code: 'export class PinoLoggerBinder {}',
      filename: 'src/logger-binder.ts',
    },
    {
      code: 'export default class UserService {}',
      filename: 'src/user-service.ts',
    },
    {
      code: 'class UserModel {} export { UserModel };',
      filename: 'src/user.model.ts',
    },
    { code: 'export class Widget {}', filename: 'src/widget.tsx' },
    { code: 'export class Widget {}', filename: 'src/widget.mts' },
    {
      code: 'class Helper {} export class Parser {}',
      filename: 'src/parser.ts',
    },
    {
      code: 'export const parser = new (class Anything {})();',
      filename: 'src/parser.ts',
    },
    {
      code: 'export interface Other {} export type Alias = Other;',
      filename: 'src/parser.ts',
    },
    { code: 'export { Other } from "./other.js";', filename: 'src/parser.ts' },
    {
      code: 'class Other {} export { Other as default };',
      filename: 'src/parser.ts',
    },
    {
      code: 'export class NotFoundError extends Error {}',
      filename: 'src/user-errors.ts',
    },
    {
      code: 'export class NotFoundError extends Error {}',
      filename: 'src/errors.ts',
    },
    { code: 'export class UserId {}', filename: 'src/ids.ts' },
    { code: 'export class Anything {}', filename: 'src/parser.test.ts' },
    {
      code: 'export class Anything {}',
      filename: 'src/__tests__/support/fake.ts',
    },
    { code: 'export class Anything {}', filename: 'src/index.ts' },
    { code: 'export declare class Anything {}', filename: 'src/types.d.ts' },
    {
      code: 'export class Anything {}',
      filename: 'src/legacy/parser.ts',
      options: [{ groupingFiles: ['src/legacy/**'] }],
    },
  ],
  invalid: [
    {
      code: 'export class Parser {}',
      filename: 'src/logger-binder.ts',
      errors: [error('Parser', 'LoggerBinder')],
    },
    {
      code: 'export default class Parser {}',
      filename: 'src/logger-binder.ts',
      errors: [error('Parser', 'LoggerBinder')],
    },
    {
      code: 'class Parser {} export { Parser };',
      filename: 'src/logger-binder.ts',
      errors: [error('Parser', 'LoggerBinder')],
    },
    {
      code: 'class Parser {} export { Parser as Binder };',
      filename: 'src/logger-binder.ts',
      errors: [error('Binder', 'LoggerBinder')],
    },
    {
      code: 'export class User {}',
      filename: 'src/user.model.ts',
      errors: [error('User', 'UserModel')],
    },
    {
      code: 'export class LoggerBinder {} export class Extra {}',
      filename: 'src/logger-binder.ts',
      errors: [error('Extra', 'LoggerBinder')],
    },
    {
      code: 'export class NotFoundError extends Error {}',
      filename: 'src/user-errors.ts',
      options: [{ groupingFiles: [] }],
      errors: [error('NotFoundError', 'UserErrors')],
    },
  ],
});
