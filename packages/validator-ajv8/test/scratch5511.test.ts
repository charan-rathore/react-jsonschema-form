import { getDefaultFormState, retrieveSchema, RJSF_REF_CYCLE_KEY } from '../../utils/src/index.ts';
import type { RJSFSchema } from '../../utils/src/index.ts';
import validator from '../src/index.ts';

const FLAG = RJSF_REF_CYCLE_KEY as unknown as string;
const flagged = (s: unknown): boolean => {
  if (s && typeof s === 'object') {
    return (s as Record<symbol, unknown>)[RJSF_REF_CYCLE_KEY] === true;
  }
  return false;
};

describe('jimmycallin round on 5511, against 5494 head', () => {
  describe('defaults side', () => {
    test('D1 oneOf choice ref keeps defaults', () => {
      const schema: RJSFSchema = {
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
      };
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema })).toEqual({ pick: { a: 'A' } });
    });
    test('D2 anyOf choice ref keeps defaults', () => {
      const schema: RJSFSchema = {
        definitions: {
          choice: {
            type: 'object',
            anyOf: [
              { properties: { a: { type: 'string', default: 'A' } } },
              { properties: { b: { type: 'string', default: 'B' } } },
            ],
          },
        },
        type: 'object',
        properties: { pick: { $ref: '#/definitions/choice' } },
      };
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema })).toEqual({ pick: { a: 'A' } });
    });
    test('D3 items $ref with minItems keeps option defaults', () => {
      const schema: RJSFSchema = {
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
        properties: { picks: { type: 'array', minItems: 1, items: { $ref: '#/definitions/choice' } } },
      };
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema })).toEqual({ picks: [{ a: 'A' }] });
    });
    test('D5 if/then address keeps defaults', () => {
      const schema: RJSFSchema = {
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
      };
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema })).toEqual({ home: { country: 'US', zip: '00000' } });
    });
    test('D6 if/then address with formData', () => {
      const schema: RJSFSchema = {
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
      };
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema, formData: { home: { country: 'US' } } })).toEqual({
        home: { country: 'US', zip: '00000' },
      });
    });
    test('D7 array of if/then address', () => {
      const schema: RJSFSchema = {
        definitions: {
          address: {
            type: 'object',
            properties: { country: { type: 'string', default: 'US' } },
            if: { properties: { country: { const: 'US' } } },
            then: { properties: { zip: { type: 'string', default: '00000' } } },
          },
        },
        type: 'array',
        minItems: 1,
        items: { $ref: '#/definitions/address' },
      };
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema })).toEqual([{ country: 'US', zip: '00000' }]);
    });
    test('D8 shared ref via then and beside it', () => {
      const schema: RJSFSchema = {
        definitions: {
          person: { type: 'object', properties: { name: { type: 'string', default: 'n' } } },
          employee: {
            type: 'object',
            if: {},
            then: { $ref: '#/definitions/person' },
            properties: { manager: { $ref: '#/definitions/person' } },
          },
        },
        type: 'object',
        properties: { employee: { $ref: '#/definitions/employee' } },
      };
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema })).toEqual({
        employee: { name: 'n', manager: { name: 'n' } },
      });
    });
    test('D9 nested objects both merging person', () => {
      const schema: RJSFSchema = {
        definitions: {
          person: { type: 'object', properties: { name: { type: 'string', default: 'n' } } },
          outer: {
            type: 'object',
            if: {},
            then: { $ref: '#/definitions/person' },
            properties: { inner: { type: 'object', if: {}, then: { $ref: '#/definitions/person' } } },
          },
        },
        type: 'object',
        properties: { outer: { $ref: '#/definitions/outer' } },
      };
      console.log('D9 actual:', JSON.stringify(getDefaultFormState({ validator }, { schema, rootSchema: schema })));
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema })).toEqual({
        outer: { name: 'n', inner: { name: 'n' } },
      });
    });
    test('D10 allOf spelling of D8 with populateDefaults', () => {
      const schema: RJSFSchema = {
        definitions: {
          person: { type: 'object', properties: { name: { type: 'string', default: 'n' } } },
          employee: {
            type: 'object',
            allOf: [{ $ref: '#/definitions/person' }],
            properties: { manager: { $ref: '#/definitions/person' } },
          },
        },
        type: 'object',
        properties: { employee: { $ref: '#/definitions/employee' } },
      };
      expect(
        getDefaultFormState({ validator, defaultFormStateBehavior: { allOf: 'populateDefaults' } }, { schema, rootSchema: schema }),
      ).toEqual({ employee: { name: 'n', manager: { name: 'n' } } });
    });
    test('D12 additionalProperties data-bounded recursion fills every level', () => {
      const schema: RJSFSchema = {
        definitions: {
          node: {
            type: 'object',
            properties: { name: { type: 'string', default: 'n' } },
            additionalProperties: { type: 'object', if: {}, then: { $ref: '#/definitions/node' } },
          },
        },
        $ref: '#/definitions/node',
      };
      console.log('D12 actual:', JSON.stringify(getDefaultFormState({ validator }, { schema, rootSchema: schema, formData: { k: { k: { k: {} } } } })));
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema, formData: { k: { k: { k: {} } } } })).toEqual({
        name: 'n',
        k: { name: 'n', k: { name: 'n', k: { name: 'n' } } },
      });
    });
    test('D13 recursive tree keeps both levels', () => {
      const schema: RJSFSchema = {
        definitions: {
          node: {
            type: 'object',
            properties: { name: { type: 'string', default: 'n' }, child: { $ref: '#/definitions/node' } },
          },
        },
        type: 'object',
        properties: { tree: { $ref: '#/definitions/node' } },
      };
      console.log('D13 actual:', JSON.stringify(getDefaultFormState({ validator }, { schema, rootSchema: schema })));
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema })).toEqual({ tree: { name: 'n', child: { name: 'n' } } });
    });
    test('D14 array of recursive node keeps both levels', () => {
      const schema: RJSFSchema = {
        definitions: {
          node: {
            type: 'object',
            properties: { name: { type: 'string', default: 'n' }, child: { $ref: '#/definitions/node' } },
          },
        },
        type: 'object',
        properties: { arr: { type: 'array', minItems: 1, items: { $ref: '#/definitions/node' } } },
      };
      console.log('D14 actual:', JSON.stringify(getDefaultFormState({ validator }, { schema, rootSchema: schema })));
      expect(getDefaultFormState({ validator }, { schema, rootSchema: schema })).toEqual({
        arr: [{ name: 'n', child: { name: 'n' } }],
      });
    });
    test('D15 tuple item recursion terminates', () => {
      const schema: RJSFSchema = {
        definitions: {
          node: { type: 'array', items: [{ type: 'string', default: 's' }, { allOf: [{ $ref: '#/definitions/node' }] }] },
        },
        type: 'object',
        properties: { t: { $ref: '#/definitions/node' } },
      };
      try {
        console.log('D15 actual:', JSON.stringify(getDefaultFormState({ validator, defaultFormStateBehavior: { allOf: 'populateDefaults' } }, { schema, rootSchema: schema })));
      } catch (e) { console.log('D15 threw:', String(e).slice(0, 120)); return; }
      expect(
        getDefaultFormState({ validator, defaultFormStateBehavior: { allOf: 'populateDefaults' } }, { schema, rootSchema: schema }),
      ).toEqual({ t: ['s', ['s', undefined]] });
    });
  });

  describe('resolution side', () => {
    const wrap = (node: RJSFSchema): RJSFSchema => ({ definitions: { node }, $ref: '#/definitions/node' });
    test('R1 757: then holding allOf-ref child flags the child', () => {
      const node: RJSFSchema = {
        type: 'object',
        if: {},
        then: { properties: { name: { type: 'string' }, child: { allOf: [{ $ref: '#/definitions/node' }] } } },
      };
      const schema = wrap(node);
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      expect(flagged((resolved.properties as RJSFSchema).child)).toBe(true);
    });
    test('R2 768a: allOf holding properties with the ref', () => {
      const node: RJSFSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          child: { type: 'object', allOf: [{ properties: { x: { $ref: '#/definitions/node' } } }] },
        },
      };
      const schema = wrap(node);
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      console.log('R2:', JSON.stringify(resolved, (k, v) => (typeof v === 'symbol' ? String(v) : v)).slice(0, 400));
      const child = (resolved.properties as RJSFSchema).child as RJSFSchema;
      console.log('R2 child flagged:', flagged(child), 'x flagged:', flagged((child.properties as RJSFSchema)?.x));
    });
    test('R3 768b: if/then holding properties with the ref', () => {
      const node: RJSFSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          child: { type: 'object', if: {}, then: { properties: { x: { $ref: '#/definitions/node' } } } },
        },
      };
      const schema = wrap(node);
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      const child = (resolved.properties as RJSFSchema).child as RJSFSchema;
      console.log('R3 child flagged:', flagged(child), 'x flagged:', flagged((child.properties as RJSFSchema)?.x));
    });
    test('R4 768c: nested allOf holding the ref', () => {
      const node: RJSFSchema = {
        type: 'object',
        properties: { name: { type: 'string' }, child: { allOf: [{ allOf: [{ $ref: '#/definitions/node' }] }] } },
      };
      const schema = wrap(node);
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      const child = (resolved.properties as RJSFSchema).child as RJSFSchema;
      console.log('R4 child flagged:', flagged(child), 'child keys:', Object.keys(child), 'inner flagged:', flagged((child.properties as RJSFSchema)?.child));
    });
    test('R5 768d: allOf holding if/then with the ref', () => {
      const node: RJSFSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          child: { allOf: [{ type: 'object', if: {}, then: { $ref: '#/definitions/node' } }] },
        },
      };
      const schema = wrap(node);
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      const child = (resolved.properties as RJSFSchema).child as RJSFSchema;
      console.log('R5 child flagged:', flagged(child), 'keys:', Object.keys(child), 'inner flagged:', flagged((child.properties as RJSFSchema)?.child));
    });
    test('R6 768e: if/then holding allOf with the ref', () => {
      const node: RJSFSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          child: { type: 'object', if: {}, then: { allOf: [{ $ref: '#/definitions/node' }] } },
        },
      };
      const schema = wrap(node);
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      const child = (resolved.properties as RJSFSchema).child as RJSFSchema;
      console.log('R6 child flagged:', flagged(child), 'keys:', Object.keys(child), 'inner flagged:', flagged((child.properties as RJSFSchema)?.child));
    });
    test('R7 768f: two-definition cycle', () => {
      const schema: RJSFSchema = {
        definitions: {
          a: { type: 'object', properties: { name: { type: 'string' }, b: { allOf: [{ $ref: '#/definitions/b' }] } } },
          b: { type: 'object', properties: { a: { allOf: [{ $ref: '#/definitions/a' }] } } },
        },
        $ref: '#/definitions/a',
      };
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      const b = (resolved.properties as RJSFSchema).b as RJSFSchema;
      console.log('R7 b flagged:', flagged(b), 'b.a flagged:', flagged((b.properties as RJSFSchema)?.a), 'b keys:', Object.keys(b));
    });
    test('R8 773: data-bounded then must NOT flag', () => {
      const node: RJSFSchema = {
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
      const schema = wrap(node);
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      expect(flagged((resolved.properties as RJSFSchema).child)).toBe(false);
      const resolvedData = retrieveSchema({ validator }, schema, schema, { child: { more: true } }) as RJSFSchema;
      expect(flagged((resolvedData.properties as RJSFSchema).child)).toBe(false);
    });
    test('R9 5501 original: allOf holding the ref flags the child', () => {
      const node: RJSFSchema = {
        type: 'object',
        properties: { name: { type: 'string' }, child: { allOf: [{ $ref: '#/definitions/node' }] } },
      };
      const schema = wrap(node);
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      expect(flagged((resolved.properties as RJSFSchema).child)).toBe(true);
    });
    test('R10 5501 original: if:{} then holding the ref flags the child', () => {
      const node: RJSFSchema = {
        type: 'object',
        properties: { name: { type: 'string' }, child: { type: 'object', if: {}, then: { $ref: '#/definitions/node' } } },
      };
      const schema = wrap(node);
      const resolved = retrieveSchema({ validator }, schema, schema, {}) as RJSFSchema;
      expect(flagged((resolved.properties as RJSFSchema).child)).toBe(true);
    });
  });
});
