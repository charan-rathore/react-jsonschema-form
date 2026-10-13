import retrieveSchema from '../../src/schema/retrieveSchema.ts';
import getDefaultFormState from '../../src/schema/getDefaultFormState.ts';
import getTestValidator from '../testUtils/getTestValidator.ts';
import { RJSF_REF_CYCLE_KEY } from '../../src/constants.ts';
import { RJSFSchema } from '../../src/types.ts';

const testValidator = getTestValidator({});
const g = (schema: RJSFSchema, formData?: unknown, opts?: object) =>
  getDefaultFormState({ validator: testValidator, ...opts }, { schema, rootSchema: schema, formData });

test('jimmy round-2 probes', () => {
  // 4257411733: ordinary $ref whose definition has oneOf - defaults under the property
  const choice = {
    definitions: {
      choice: {
        type: 'object',
        oneOf: [
          { properties: { a: { type: 'string', default: 'A' } } },
          { properties: { b: { type: 'string', default: 'B' } } },
        ],
      },
    },
    type: 'object',
    properties: { pick: { $ref: '#/definitions/choice' } },
  } as RJSFSchema;
  console.log('P733 oneOf-def:', JSON.stringify(g(choice)), '(v7: {"pick":{"a":"A"}})');
  const choiceItems = {
    definitions: { choice: (choice.definitions as any).choice },
    type: 'object',
    properties: { picks: { type: 'array', minItems: 1, items: { $ref: '#/definitions/choice' } } },
  } as RJSFSchema;
  console.log('P733 items:', JSON.stringify(g(choiceItems)), '(v7: {"picks":[{"a":"A"}]})');

  // 4257411739: $ref to a definition that has an if
  const address = {
    definitions: {
      address: {
        type: 'object',
        properties: { country: { type: 'string', default: 'US' } },
        if: { properties: { country: { const: 'US' } } },
        then: { properties: { zip: { type: 'string', default: '00000' } } },
      },
    },
    type: 'object',
    properties: { home: { $ref: '#/definitions/address' } },
  } as RJSFSchema;
  console.log('P739 if-def:', JSON.stringify(g(address)), '(v7: {"home":{"country":"US","zip":"00000"}})');

  // 4257411748: branch-merged ref + second use of the same definition
  const person = { type: 'object', properties: { name: { type: 'string', default: 'n' } } };
  const employee = {
    definitions: {
      person,
      employee: {
        type: 'object',
        if: {},
        then: { $ref: '#/definitions/person' },
        properties: { manager: { $ref: '#/definitions/person' } },
      },
    },
    type: 'object',
    properties: { employee: { $ref: '#/definitions/employee' } },
  } as RJSFSchema;
  console.log('P748 shared:', JSON.stringify(g(employee)), '(v7: {"employee":{"name":"n","manager":{"name":"n"}}})');

  // 4257411757: re-walk flag discarded (retrieveSchema level)
  const node757 = {
    type: 'object',
    if: {},
    then: { properties: { name: { type: 'string' }, child: { allOf: [{ $ref: '#/definitions/node' }] } } },
  };
  const s757 = { definitions: { node: node757 }, $ref: '#/definitions/node' } as RJSFSchema;
  const r757 = retrieveSchema({ validator: testValidator }, s757, s757, {});
  console.log('P757 child flagged:', Reflect.get(r757.properties!.child as object, RJSF_REF_CYCLE_KEY), '(want true)');

  // 4257411773: bounded recursion must not flag when the condition cannot hold for empty data
  const node773 = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      child: {
        type: 'object',
        properties: { more: { type: 'boolean' } },
        if: { properties: { more: { const: true } }, required: ['more'] },
        then: { $ref: '#/definitions/node' },
      },
    },
  };
  const s773 = { definitions: { node: node773 }, $ref: '#/definitions/node' } as RJSFSchema;
  const r773 = retrieveSchema({ validator: testValidator }, s773, s773, {});
  console.log('P773 child flagged (empty data):', Reflect.get(r773.properties!.child as object, RJSF_REF_CYCLE_KEY), '(want undefined/falsy)');

  // 4257411780: plain recursion depth from a non-root reference
  const node780 = {
    type: 'object',
    properties: { name: { type: 'string', default: 'n' }, child: { $ref: '#/definitions/node' } },
  };
  const s780 = { definitions: { node: node780 }, type: 'object', properties: { tree: { $ref: '#/definitions/node' } } } as RJSFSchema;
  console.log('P780 depth:', JSON.stringify(g(s780)), '(v7: {"tree":{"name":"n","child":{"name":"n"}}})');

  // 4257411790: tuple fixed-items recursion must terminate
  const s790 = {
    definitions: {
      node: { type: 'array', items: [{ type: 'string', default: 's' }, { allOf: [{ $ref: '#/definitions/node' }] }] },
    },
    type: 'object',
    properties: { t: { $ref: '#/definitions/node' } },
  } as RJSFSchema;
  try {
    console.log('P790 tuple:', JSON.stringify(g(s790, undefined, { defaultFormStateBehavior: { allOf: 'populateDefaults' } })));
  } catch (e) {
    console.log('P790 tuple THREW:', (e as Error).constructor.name);
  }
});
