import retrieveSchema from '../../src/schema/retrieveSchema.ts';
import getTestValidator from '../testUtils/getTestValidator.ts';
import { RJSF_REF_CYCLE_KEY } from '../../src/constants.ts';
import { RJSFSchema } from '../../src/types.ts';

const node: RJSFSchema = { type: 'object', properties: { name: { type: 'string' }, child: { $ref: '#/definitions/node' } } };

test('probe jimmy heap shapes', () => {
  const shapes: [string, RJSFSchema][] = [
    ['allOf-held', { definitions: { node }, type: 'object', allOf: [{ properties: { x: { $ref: '#/definitions/node' } } }] } as RJSFSchema],
    ['then-held', { definitions: { node }, type: 'object', if: {}, then: { properties: { x: { $ref: '#/definitions/node' } } } } as RJSFSchema],
    ['nested-allOf', { definitions: { node }, allOf: [{ allOf: [{ $ref: '#/definitions/node' }] }] } as RJSFSchema],
  ];
  for (const [name, schema] of shapes) {
    const out = retrieveSchema({ validator: getTestValidator({}) }, schema, schema, undefined);
    const flagged: string[] = [];
    const walk = (o: unknown, path: string) => {
      if (o && typeof o === 'object') {
        if (Reflect.get(o, RJSF_REF_CYCLE_KEY) === true) flagged.push(path);
        for (const [k, v] of Object.entries(o)) walk(v, path + '.' + k);
      }
    };
    walk(out, 'root');
    console.log('PROBE', name, 'flagged at:', JSON.stringify(flagged));
  }
});
