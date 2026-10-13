import { describe, test } from 'vitest';
import { RJSFSchema } from '../../src/types.ts';
import getTestValidator from '../testUtils/getTestValidator.ts';
import getDefaultFormState from '../../src/schema/getDefaultFormState.ts';

// A dependencies branch that IS a $ref back to its own definition, with non-empty formData
const schema: RJSFSchema = {
  definitions: {
    node: {
      type: 'object',
      properties: { a: { type: 'string', default: 'x' } },
      dependencies: { a: { $ref: '#/definitions/node' } },
    },
  },
  type: 'object',
  properties: { p: { $ref: '#/definitions/node' } },
} as RJSFSchema;
describe('deps', () => {
  test('self-ref dependencies with formData', () => {
    try {
      const r = getDefaultFormState({ validator: getTestValidator({}) }, { schema, rootSchema: schema, formData: { p: { a: 'x' } } });
      console.log('DEPS result:', JSON.stringify(r));
    } catch (e) {
      console.log('DEPS THREW:', (e as Error).constructor.name);
    }
  });
});
