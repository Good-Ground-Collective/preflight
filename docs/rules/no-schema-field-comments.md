# no-schema-field-comments

Disallow comments on Zod object fields; document them with `.describe()` or
`.meta()`.

## Rule details

A comment beside a Zod field stays in the source file. `.describe()` and
`.meta()` travel with the schema into generated OpenAPI, JSON Schema and error
output, so that is where field documentation belongs.

The rule looks at the object literal passed to `z.object(...)`,
`z.strictObject(...)`, `z.looseObject(...)`, or `.extend(...)` on a chain that
starts at `z` (such as `z.object({...}).extend({...})`). It reports every
comment inside that literal that is not inside a field's value: comments above
a field, after it on the same line, and between fields. Comments inside a
value, such as in a `.refine()` callback, are left alone, and nested
`z.object` calls are checked on their own.

Tool directives (`eslint-…`, `@ts-…`, `prettier-ignore`) are not reported.

The rule matches the identifier `z` by name. `.extend()` on a named schema
(`baseSchema.extend({...})`) is not checked, because the chain is not rooted
at `z`.

### Incorrect

```ts
const userSchema = z.object({
  // Stable id from the identity provider.
  id: z.string(),
  name: z.string(), // display name
});
```

### Correct

```ts
const userSchema = z.object({
  id: z.string().describe('Stable id from the identity provider.'),
  name: z.string().meta({ description: 'Display name' }),
});
```

## Options

None.
