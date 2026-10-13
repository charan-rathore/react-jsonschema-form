# #5511 rework notes (drop before PR) - 13 red at 0be2b608

## Mechanism A: if/then holding the ref THROWS (2 tests, also "stops a recursion under a populated allOf")

RangeError: Maximum call stack. Loop is in the RETRIEVE, not computeDefaults:
retrieveSchemaInternal (retrieveSchema.ts:1561, IF_KEY branch) -> resolveCondition (:184) -> retrieveSchemaInternal (:1547)
-> resolveSchema (:422) -> resolveReference (:506) -> resolveAllReferences (:727 -> :763 self-recursion).
Fix direction: seed the path INTO the if-resolution (resolveCondition currently receives recurseList but the
then/else branch it recurses into carries the ref; or a fixpoint stop when the condition-resolved schema is
identical to its input). Note retrieveSchema.ts:713: the RJSF_REF_KEY=passCount>0 collapsed-ref stop already
exists for the resolveAllReferences side; the if/then side does not benefit because resolveCondition re-enters
retrieveSchemaInternal with the UNMARKED merged schema.

## Mechanism B: deps-entry OVERFILL one level (3 tests: deps-entry pair + #5493 root-level/property pair)

got {a:'x', child:{a:'x'}}, want {a:'x'}. "The entry's content is the definition itself, so the recursion
adds no level of its own."
Path: computeDefaults DEPENDENCIES_KEY branch (getDefaultFormState.ts:392) calls resolveDependencies with
enclosingRefPath(schema, _recurseList, DEPENDENCIES_KEY); the merged entry schema then computes its properties
(child: {$ref: node}) against a list that lacks the definition's own ref -> child expands one more level.
Contrast: getObjectDefaults:700 childRecurseList = _recurseList DELIBERATELY does not re-add refs expanded by
the retrieve (the #5434 shared-ref false cycle). For DEPENDENCIES the opposite holds: the entry IS part of the
definition, so the ref that materialized this object SHOULD join the list for the entry's compute.
Fix direction: in the deps branch (or in resolveDependencies' recursion), include resolvedFromRef(schema) /
the seed that was stripped for the retrieve back ON the path for the entry's property compute.

## Remaining value reds beyond A+B: deep-default-fill family, tags parity, additionalProperties,

allOf-of-array-items (see zz-failures-e45a6bd3.txt sections 1-7).

## Then: re-pins, #5501 SchemaField tests + 773 regression test, changelog to CHANGELOG-v7.md,

full suites (utils 100/100/100/100 coverage gate), DROP zz-* files, force-push fix/recursive-ref-via-keyword-5501
(head d00d8ffe), 10 thread replies (heath style: describe the code, "Fixed in <sha>").
