import { test } from 'vitest';
import Ajv2019 from 'ajv/dist/2019.js';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { getDefaultFormState } from '@rjsf/utils';
const validator = customizeValidator({ AjvClass: Ajv2019 });
test('stack', () => {
  const node = { type: 'object', properties: { name: { type: 'string', default: 'n' }, child: { type: 'object', allOf: [{ $ref: '#/definitions/node' }] } } };
  const schema = { definitions: { node }, $ref: '#/definitions/node' };
  try {
    getDefaultFormState({ validator, defaultFormStateBehavior: { allOf: 'populateDefaults' } } as any, { schema, rootSchema: schema });
  } catch (e: any) {
    const frames = (e.stack as string).split('\n').filter((l: string) => l.includes('.ts')).map((l: string) => l.trim().replace(/\(.*src\//, '(').replace(/:\d+:\d+/, ''));
    const counts: Record<string, number> = {};
    frames.forEach((f) => (counts[f] = (counts[f] || 0) + 1));
    console.log(JSON.stringify(counts, null, 1));
  }
});
