import { test } from 'vitest';
import Ajv2019 from 'ajv/dist/2019.js';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { getDefaultFormState } from '@rjsf/utils';
const validator = customizeValidator({ AjvClass: Ajv2019 });
test('P2 throw diagnosis', () => {
  const node = { type: 'object', properties: { name: { type: 'string', default: 'n' }, child: { type: 'object', allOf: [{ $ref: '#/definitions/node' }] } } };
  const schema = { definitions: { node }, $ref: '#/definitions/node' };
  try {
    console.log('P2:', JSON.stringify(getDefaultFormState({ validator, defaultFormStateBehavior: { allOf: 'populateDefaults' } } as any, { schema, rootSchema: schema })));
  } catch (e: any) {
    console.log('THREW:', e.constructor.name, e.message?.slice(0, 80));
    console.log((e.stack as string).split('\n').filter((l: string) => l.includes('src/schema')).slice(0, 14).join('\n'));
  }
});
