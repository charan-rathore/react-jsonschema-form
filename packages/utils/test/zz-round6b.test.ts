import { performance } from 'node:perf_hooks';
import { RJSFSchema, createSchemaUtils, retrieveSchema } from '../src/index.ts';
import { normalizeRootReferences } from '../src/findSchemaDefinition.ts';
import resolveUiSchema from '../src/resolveUiSchema.ts';
import getTestValidator from './testUtils/getTestValidator.ts';

const validator = getTestValidator({});

function buildRoot(draft: '7' | '2020-12', withId: boolean): RJSFSchema {
  const defs: Record<string, RJSFSchema> = { leaf: { type: 'string', title: 'LEAF' } };
  const properties: Record<string, RJSFSchema> = {};
  for (let i = 0; i < 300; i++) {
    defs[`d${i}`] = { $ref: '#/definitions/leaf' } as RJSFSchema;
    properties[`p${i}`] = { $ref: `#/definitions/d${i}` };
  }
  const root: RJSFSchema = { type: 'object', definitions: { ...defs, leaf: defs.leaf }, properties };
  if (withId) root.$id = 'http://x.com/root.json';
  if (draft === '2020-12') {
    root.$schema = 'https://json-schema.org/draft/2020-12/schema';
    root.$defs = root.definitions;
    delete root.definitions;
    for (let i = 0; i < 300; i++) {
      (root.$defs as any)[`d${i}`] = { $ref: '#/$defs/leaf' };
      properties[`p${i}`] = { $ref: `#/$defs/d${i}` };
    }
  }
  return root;
}

describe('round-6b probes', () => {
  it.each([
    ['draft-7, no $id', '7', false],
    ['draft-7, $id', '7', true],
    ['2020-12, no $id', '2020-12', false],
    ['2020-12, $id', '2020-12', true],
  ] as const)('perf: %s', (label, draft, withId) => {
    const root = buildRoot(draft, withId);
    const times: number[] = [];
    for (let render = 0; render < 3; render++) {
      const utils = createSchemaUtils({ validator }, root as RJSFSchema, undefined as any, undefined as any);
      const start = performance.now();
      utils.retrieveSchema(root as RJSFSchema);
      for (let i = 0; i < 300; i++) {
        const prop = (root as any).properties[`p${i}`];
        const resolved = utils.retrieveSchema(prop, root as any);
        const leafRef = draft === '7' ? `#/definitions/d${i}` : `#/$defs/d${i}`;
        utils.retrieveSchema({ $ref: leafRef } as RJSFSchema, root as any);
        void resolved;
      }
      times.push(performance.now() - start);
    }
    console.log(`PERF ${label}: ${(times.reduce((a, b) => a + b) / times.length).toFixed(1)} ms/render`);
  });
  it('P-E: resolveUiSchema finds options inside a nested $id resource', () => {
    const root: RJSFSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/root.json',
      $defs: {
        parent: { $id: 'nested/parent.json', type: 'object', properties: { opt: { $ref: 'choice.json' } } },
        choice: { $id: 'nested/choice.json', oneOf: [{ $ref: 'a.json' }, { type: 'number' }] },
        a: { $id: 'nested/a.json', type: 'string' },
      },
      properties: { p: { $ref: 'nested/parent.json' } },
    };
    const n = normalizeRootReferences(root);
    const out = resolveUiSchema((n as any).$defs.parent.properties.opt, undefined, {
      rootSchema: n,
      uiSchemaDefinitions: { 'a.json': { 'ui:title': 'A' }, 'choice.json': { 'ui:title': 'CHOICE' } },
    } as any);
    console.log('P-E out:', JSON.stringify(out));
    expect(out).toEqual({ 'ui:title': 'CHOICE', oneOf: [{ 'ui:title': 'A' }] });
  });
  it('P-F: direct retrieveSchema on a raw 2020-12 root applies a nested $id under properties', () => {
    const root: RJSFSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      properties: {
        foo: {
          $id: 'nested/parent.json',
          properties: { bar: { $ref: 'child.json' } },
          $defs: { child: { $id: 'child.json', title: 'CHILD' } },
        },
      },
    } as RJSFSchema;
    const out: any = retrieveSchema({ validator }, root, root);
    expect(out.properties.foo.properties.bar).toEqual(
      expect.objectContaining({ $id: 'child.json', title: 'CHILD' }),
    );
  });
});
