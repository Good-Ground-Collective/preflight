import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-schema-field-comments.js';

const ruleTester = new RuleTester();
const error = { messageId: 'fieldComment' as const };

ruleTester.run('no-schema-field-comments', rule, {
  valid: [
    'const userSchema = z.object({ id: z.string().describe("The user id") });',
    'const userSchema = z.object({ id: z.string().meta({ description: "The user id" }) });',
    // A comment above the schema documents the declaration, not a field.
    '/** A user. */\nconst userSchema = z.object({ id: z.string() });',
    // Comments inside a field's value belong to that expression.
    'const userSchema = z.object({ id: z.string().refine((v) => {\n  // must be lower case\n  return v === v.toLowerCase();\n}) });',
    // Tool directives are not documentation.
    'const userSchema = z.object({\n  // prettier-ignore\n  shape: z.string(),\n});',
    'const userSchema = z.object({\n  // @ts-expect-error legacy key\n  id: z.string(),\n});',
    // Not rooted at `z`.
    'const config = settings.object({\n  // port to listen on\n  port: 1,\n});',
    'const merged = baseSchema.extend({\n  // added later\n  extra: z.string(),\n});',
    'const merged = { ...defaults }.extend({\n  // not zod\n  extra: 1,\n});',
  ],
  invalid: [
    {
      code: 'const userSchema = z.object({\n  // the user id\n  id: z.string(),\n});',
      errors: [error],
    },
    {
      code: 'const userSchema = z.object({\n  id: z.string(), // the user id\n});',
      errors: [error],
    },
    {
      code: 'const userSchema = z.object({\n  /** the user id */\n  id: z.string(),\n  /* the name */\n  name: z.string(),\n});',
      errors: [error, error],
    },
    {
      code: 'const userSchema = z.strictObject({\n  // the user id\n  id: z.string(),\n});',
      errors: [error],
    },
    {
      code: 'const userSchema = z.looseObject({\n  // the user id\n  id: z.string(),\n});',
      errors: [error],
    },
    {
      code: 'const userSchema = z.object({ id: z.string() }).extend({\n  // the name\n  name: z.string(),\n});',
      errors: [error],
    },
    {
      code: 'const userSchema = z.object({\n  address: z.object({\n    // the street\n    street: z.string(),\n  }),\n});',
      errors: [error],
    },
  ],
});
