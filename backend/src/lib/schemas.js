export const uuid = { type: 'string', format: 'uuid' };

/** Params schema with the given uuid fields. */
export const idParams = (...names) => ({
  type: 'object',
  additionalProperties: false,
  required: names,
  properties: Object.fromEntries(names.map((n) => [n, uuid])),
});

export const body = (properties, required = []) => ({
  type: 'object',
  additionalProperties: false,
  required,
  properties,
});

export const text = (maxLength, minLength = 0) => ({ type: 'string', minLength, maxLength });

export const nullableText = (maxLength) => ({ type: ['string', 'null'], maxLength });

export const friendCode = { type: 'string', pattern: '^[A-HJ-NP-Za-hj-np-z2-9]{8}$' };
