# #5511 rework notes (drop before PR) - 3 red at e3ee6509 (was 13)

## FIXED (e3ee6509 and earlier):

- Deps-entry overfill + deps-entry-is-ref throw: computeDefaults DEPENDENCIES_KEY branch now seeds
  updatedRecurseList with (a) dependenciesPath (enclosingRefPath of the deps keyword), (b) resolvedFromRef of the
  merged schema, (c) resolvedFromRef of each materialized property of the merged schema.
- if/then + allOf(retrieve-merge) throws: getObjectDefaults childRecurseList = _recurseList + materializedRefs,
  where materializedRefs = resolvedFromRef of each retrieved property that is an object WITHOUT
  REF_SIBLING_BRANCHES (sibling-branch markers mean second use, not recursion - the #5434-style false cycle:
  "a dependencies branch that stood beside the $ref" tests catch this).

## REMAINING 3 (all array/additionalProperties allOf throws):

- stops at a recursion reached through the allOf of array items
- stops at a recursion reached through the allOf of additionalProperties
- an allOf holding the ref in array items, with populateDefaults
  Mechanism: the loop is INSIDE retrieveSchema: computeDefaults:507 (allOf-populate branch for non-object schemas)
  calls retrieveSchemaInternal(schema, pathWithOwnRef = enclosingRefPath(schema, _recurseList)) - the array schema
  carries no marker so the path never gains the enclosing definition's ref. The allOf-ELEMENT retrieve at
  retrieveSchema.ts:466-475 passes enclosingRefPath(schema, recurseList, ALL_OF_KEY) = unchanged for inline
  schemas, so each nested allOf-element retrieve starts a FRESH walk with passCount 0 and recurseList=[] and the
  flagged items.$ref expands "one more level" (the deliberate first-pass rule at resolveAllReferences:713-740)
  forever. Fix direction: thread the accumulated pathList from the resolveAllReferences walk into resolveSchema's
  allOf-element retrieves (retrieveSchema.ts:466), or seed pathWithOwnRef in the computeDefaults:497 allOf branch
  with closingRefsOf(schema) so the first retrieve starts with the enclosing ref on the path. Careful: expected
  values want ONE more level filled before stopping (e.g. child:[{x:{name:'n', child:[{}]}}] for the if/then
  variant) - a seed must count, not forbid, the first expansion.

## Then: re-pins, #5501 SchemaField tests + 773 regression test, changelog to CHANGELOG-v7.md,

full suites (utils 100/100/100/100 coverage gate), DROP zz-* files, force-push fix/recursive-ref-via-keyword-5501
(head d00d8ffe), 10 thread replies (heath style: describe the code, "Fixed in <sha>").

## UPDATE 19:13 - ALL 1029 PASS (de7d72ac). Remaining before the PR:

1. COVERAGE GATE (100/100/100/100) currently fails on the wip. Uncovered:
   - getDefaultFormState.ts:717 - getObjectDefaults retrieve ternary TRUE branch (REF_SIBLING_BRANCHES filter of
     own ref from retrieveList). Cover with: p: {$ref: Base, allOf: [{properties: {flag:...}}]} + behavior
     allOf: populateDefaults (materialized p keeps ALL_OF + sibling marker into getObjectDefaults' retrieve).
   - retrieveSchema.ts:609 - branchClosesOnPath non-object input (boolean subschema under a flagged cycle's
     closing walk, e.g. a boolean additionalProperties inside the recursion).
   - retrieveSchema.ts:627 - the siblings fallback: a $ref whose DEFINITION does not close on the path but whose
     SIBLINGS do (ref to a plain def + if/then beside it holding the recursive ref).
   - retrieveSchema.ts:631 - check the line; same function family.
2. #5501 SchemaField tests + 773 regression test (heath's pins), changelog to CHANGELOG-v7.md.
3. Full suites: utils vitest --coverage (gate) + core vitest + snap update if needed; oxlint/oxfmt via pre-commit.
4. DROP zz-* files; force-push fix/recursive-ref-via-keyword-5501 (PR head d00d8ffe); 10 thread replies,
   heath style: describe the code not the change, "Fixed in <sha>".
5. The 3 mechanisms that fixed 13->0 (for the replies): (a) deps-entry path seeding (dependenciesPath +
   entryRef + materialized property refs), (b) getObjectDefaults materializedRefs seed (properties + the
   retrieve's own allOf merge marker, skipping REF_SIBLING_BRANCHES carriers), (c) getArrayDefaults itemsRef seed.
