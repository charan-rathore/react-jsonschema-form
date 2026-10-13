import { test } from 'vitest';
import Ajv2019 from 'ajv/dist/2019.js';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { RJSF_REF_CYCLE_KEY, RJSF_REF_KEY } from '@rjsf/utils';
import { resolveAllReferences } from '../../utils/src/schema/retrieveSchema.ts';
const validator = customizeValidator({ AjvClass: Ajv2019 });
const node = { type: 'object', properties: { name: { type: 'string', default: 'n' }, child: { type: 'object', allOf: [{ $ref: '#/definitions/node' }] } } };
const schema = { definitions: { node }, $ref: '#/definitions/node' };
test('flag probe', () => {
  const resolved: any = resolveAllReferences(schema as any, schema as any, []);
  const child = resolved.properties.child;
  console.log('child flagged by root walk:', (child as any)[RJSF_REF_CYCLE_KEY]);
  // now simulate what getObjectDefaults does with the child: retrieve with allOf populate
  const ctx: any = { validator, defaultFormStateBehavior: { allOf: 'populateDefaults' } };
  return import('../../utils/src/schema/retrieveSchema.ts').then((m) => {
    const [retrieved]: any = (m as any).retrieveSchemaInternal(ctx, child, schema, {}, false, [], undefined, false, 0);
    console.log('retrieved child keys:', Object.keys(retrieved));
    console.log('retrieved own marker:', retrieved[RJSF_REF_KEY], 'cycle:', retrieved[RJSF_REF_CYCLE_KEY]);
    console.log('retrieved child.child flagged:', retrieved.properties?.child?.[RJSF_REF_CYCLE_KEY]);
  });
});
