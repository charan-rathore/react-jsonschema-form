import { describe, test, expect } from 'vitest';
import Ajv2019 from 'ajv/dist/2019.js';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { getDefaultFormState } from '@rjsf/utils';
const validator = customizeValidator({ AjvClass: Ajv2019 });
const run = (schema: any, allOf?: 'populateDefaults') =>
  getDefaultFormState({ validator, defaultFormStateBehavior: { allOf } } as any, { schema, rootSchema: schema });
describe('v7 pins', () => {
  test('deps entry refers back', () => {
    const node = { type: 'object', properties: { a: { type: 'string', default: 'x' } }, dependencies: { a: { properties: { child: { $ref: '#/definitions/node' } } } } };
    console.log('P1 deps:', JSON.stringify(run({ definitions: { node }, $ref: '#/definitions/node' })));
  });
  test('allOf of property', () => {
    const node = { type: 'object', properties: { name: { type: 'string', default: 'n' }, child: { type: 'object', allOf: [{ $ref: '#/definitions/node' }] } } };
    console.log('P2 allOf-prop:', JSON.stringify(run({ definitions: { node }, $ref: '#/definitions/node' }, 'populateDefaults')));
  });
  test('then of property', () => {
    const node = { type: 'object', properties: { name: { type: 'string', default: 'n' }, child: { type: 'object', if: {}, then: { $ref: '#/definitions/node' } } } };
    console.log('P3 then-prop:', JSON.stringify(run({ definitions: { node }, $ref: '#/definitions/node' })));
  });
  test('tags', () => {
    const tags = { type: 'array', minItems: 1, items: { $ref: '#/definitions/tags' } };
    const schema = { definitions: { tags }, type: 'object', required: ['t'], properties: { t: { $ref: '#/definitions/tags' } } };
    console.log('P4 tags:', JSON.stringify(run(schema, 'populateDefaults')));
  });
  test('allOf holder keyword', () => {
    const node = { type: 'object', properties: { name: { type: 'string', default: 'n' }, child: { allOf: [{ $ref: '#/definitions/node' }] } } };
    console.log('P5 allOf-holder:', JSON.stringify(run({ definitions: { node }, $ref: '#/definitions/node' }, 'populateDefaults')));
  });
  test('if/then holder keyword', () => {
    const node = { type: 'object', properties: { name: { type: 'string', default: 'n' }, child: { if: {}, then: { $ref: '#/definitions/node' } } } };
    console.log('P6 ifthen-holder:', JSON.stringify(run({ definitions: { node }, $ref: '#/definitions/node' })));
  });
  test('deps entry is the ref', () => {
    const node = { type: 'object', properties: { a: { type: 'string', default: 'x' } }, dependencies: { a: { $ref: '#/definitions/node' } } };
    console.log('P7 deps-ref:', JSON.stringify(run({ definitions: { node }, $ref: '#/definitions/node' })));
  });
});
