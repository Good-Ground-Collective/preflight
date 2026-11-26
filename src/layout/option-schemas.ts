import type { JSONSchema } from '@typescript-eslint/utils';

const names: JSONSchema.JSONSchema4 = {
  type: 'array',
  items: { type: 'string' },
};

/** JSON-schema fragments shared by the filesystem rules' option schemas. */
export const optionSchemas = {
  names,
  module: {
    type: 'object',
    properties: {
      marker: { type: 'string' },
      match: { type: 'string' },
    },
    additionalProperties: false,
  } satisfies JSONSchema.JSONSchema4,
} as const;
