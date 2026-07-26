/**
 * Name suffixes marking a module-level binding as a type-like value — a schema
 * or a validator — rather than behavior. `no-loose-functions` exempts them from
 * the loose-function ban, and `naming-convention` lets them be PascalCase, so
 * the two agree by construction instead of by coincidence.
 */
export const typeLikeValueSuffixes = ['Schema', 'Validator'];

/** The suffix list as a `naming-convention` filter: `(Schema|Validator)$`. */
export const typeLikeValueFilter = `(${typeLikeValueSuffixes.join('|')})$`;
