import { describe, test } from 'vitest';
import { RJSFSchema } from '../../src/types.ts';
import getTestValidator from '../testUtils/getTestValidator.ts';
import retrieveSchema from '../../src/schema/retrieveSchema.ts';
import { REF_SIBLING_BRANCHES } from '../../src/refOf.ts';

const syms = (o: object) => Reflect.ownKeys(o).filter((k) => typeof k === 'symbol').map(String);
describe('debug', () => {
  test('markers', () => {
    const v = getTestValidator({});
    // plain: property is a bare $ref
    const plain: RJSFSchema = {
      definitions: { node: { type: 'object', properties: { name: { type: 'string', default: 'n' }, child: { $ref: '#/definitions/node' } } } },
      type: 'object',
      properties: { tree: { $ref: '#/definitions/node' } },
    } as RJSFSchema;
    const rp = retrieveSchema(v, plain, plain, undefined) as any;
    console.log('PLAIN tree syms:', JSON.stringify(syms(rp.properties.tree)), 'sibling:', Reflect.get(rp.properties.tree, REF_SIBLING_BRANCHES));
    // keyword: root $ref; child holds if/then with x:$ref
    const ref = { $ref: '#/definitions/node' };
    const kw: RJSFSchema = {
      definitions: { node: { type: 'object', properties: { name: { type: 'string', default: 'n' }, child: { type: 'object', if: {}, then: { properties: { x: ref } } } } } },
      $ref: '#/definitions/node',
    } as RJSFSchema;
    const rk = retrieveSchema(v, kw, kw, undefined) as any;
    const child = rk.properties?.child;
    console.log('KW child keys:', JSON.stringify(Object.keys(child ?? {})), 'syms:', JSON.stringify(syms(child ?? {})), 'sibling:', JSON.stringify(Reflect.get(child ?? {}, REF_SIBLING_BRANCHES)));
    const x = child?.properties?.x ?? child?.then?.properties?.x;
    console.log('KW x:', JSON.stringify(x), 'syms:', x ? JSON.stringify(syms(x)) : 'n/a', 'sibling:', x ? JSON.stringify(Reflect.get(x, REF_SIBLING_BRANCHES)) : 'n/a');
  });
});
