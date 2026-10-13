import { RJSFSchema, retrieveSchema, findSchemaDefinition } from '../src/index.ts';
import { makeAllReferencesAbsolute } from '../src/findSchemaDefinition.ts';
import getTestValidator from './testUtils/getTestValidator.ts';

const validator = getTestValidator({});

describe('round-7 probes', () => {
  it('P-A: draft-7 root, # chain inside an embedded resource', () => {
    const root: RJSFSchema = {
      definitions: {
        a: { $id: 'http://ex.com/a.json', $ref: '#/definitions/b', definitions: { b: { title: 'A-B' } } },
        b: { title: 'ROOT-B' },
      },
      properties: { x: { $ref: 'http://ex.com/a.json' } },
    };
    expect(findSchemaDefinition('http://ex.com/a.json', root)).toEqual({
      $id: 'http://ex.com/a.json',
      definitions: { b: { title: 'A-B' } },
      title: 'A-B',
    });
  });
  it('P-A2: same shape on 2020-12 still resolves', () => {
    const root: RJSFSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        a: { $id: 'http://ex.com/a.json', $ref: '#/$defs/b', $defs: { b: { title: 'A-B' } } },
        b: { title: 'ROOT-B' },
      },
      properties: { x: { $ref: 'http://ex.com/a.json' } },
    };
    expect(findSchemaDefinition('http://ex.com/a.json', root)).toEqual({
      allOf: [{ $id: 'http://ex.com/a.json', $defs: { b: { title: 'A-B' } } }, { title: 'A-B' }],
    });
  });
  it('P-B: tuple items keep the resolved spelling under a local $id override', () => {
    const root: RJSFSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://x.com/root.json',
      definitions: {
        t: {
          $id: 'https://x.com/t.json',
          type: 'array',
          items: [{ $ref: '#/definitions/x' }],
          definitions: { x: { title: 'T-X' } },
        },
        x: { title: 'ROOT-X' },
      },
      properties: { q: { $id: 'https://x.com/other.json', $ref: 'https://x.com/t.json' } },
    };
    const q = retrieveSchema({ validator }, root.properties!.q as RJSFSchema, root);
    console.log('resolved q:', JSON.stringify(q));
    const item = (q.items as RJSFSchema[])[0];
    const resolvedItem = retrieveSchema({ validator }, item, root);
    console.log('resolved item title:', resolvedItem.title);
    expect(resolvedItem.title).toEqual('T-X');
  });
  it('P-B2: tuple items without the local $id', () => {
    const root: RJSFSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://x.com/root.json',
      definitions: {
        t: {
          $id: 'https://x.com/t.json',
          type: 'array',
          items: [{ $ref: '#/definitions/x' }],
          definitions: { x: { title: 'T-X' } },
        },
        x: { title: 'ROOT-X' },
      },
      properties: { q: { $ref: 'https://x.com/t.json' } },
    };
    const q = retrieveSchema({ validator }, root.properties!.q as RJSFSchema, root);
    const resolvedItem = retrieveSchema({ validator }, (q.items as RJSFSchema[])[0], root);
    expect(resolvedItem.title).toEqual('T-X');
  });
  it('C2: nested $id cycle with rewritten refs (author spelling differs)', () => {
    const root: RJSFSchema = {
      $id: 'http://x.com/root.json',
      definitions: {
        a: { $id: 'a.json', $ref: 'b.json' },
        b: { $id: 'b.json', allOf: [{ $ref: 'a.json' }], title: 'B' },
      },
      properties: { p: { $ref: 'a.json' } },
    };
    const out = retrieveSchema({ validator }, root.properties!.p as RJSFSchema, root);
    console.log('C2 out:', JSON.stringify(out));
  });
  it('C3: absolute-ref cycle (marker already on path)', () => {
    const root: RJSFSchema = {
      $id: 'http://x.com/root.json',
      definitions: {
        a: { allOf: [{ $ref: 'http://x.com/root.json#/definitions/a' }], title: 'A' },
      },
      properties: { p: { $ref: 'http://x.com/root.json#/definitions/a' } },
    };
    const out = retrieveSchema({ validator }, root.properties!.p as RJSFSchema, root);
    console.log('C3 out:', JSON.stringify(out));
  });
  it('C1: a root-relative ref survives an external baseURI', () => {
    const schema: RJSFSchema = {
      definitions: { x: { type: 'string' } },
      properties: { p: { $ref: '#/definitions/x' } },
    };
    const out = makeAllReferencesAbsolute(schema, 'http://ext.example/root.json');
    expect((out.properties!.p as RJSFSchema).$ref).toEqual('#/definitions/x');
  });
});

describe('894 probes', () => {
  it('C4: rootless self-recursive allOf', () => {
    const root: RJSFSchema = {
      definitions: { a: { allOf: [{ $ref: '#/definitions/a' }], title: 'A' } },
      properties: { p: { $ref: '#/definitions/a' } },
    };
    const out = retrieveSchema({ validator }, root.properties!.p as RJSFSchema, root);
    console.log('C4 out:', JSON.stringify(out));
  });
  it('C5: rootless self-recursive if/then', () => {
    const root: RJSFSchema = {
      definitions: { a: { if: { type: 'object' }, then: { $ref: '#/definitions/a' }, title: 'A' } },
      properties: { p: { $ref: '#/definitions/a' } },
    };
    const out = retrieveSchema({ validator }, root.properties!.p as RJSFSchema, root, {}, false, true);
    console.log('C5 out:', JSON.stringify(out));
  });
  it('C6: rootless self-recursive dependencies', () => {
    const root: RJSFSchema = {
      definitions: { a: { dependencies: { x: { $ref: '#/definitions/a' } }, title: 'A' } },
      properties: { p: { $ref: '#/definitions/a' } },
    };
    const out = retrieveSchema({ validator }, root.properties!.p as RJSFSchema, root, { x: 1 });
    console.log('C6 out:', JSON.stringify(out));
  });
});
