# zz scratch notes (DROPPED before PR) - P780 v7 ground truth, 2026-10-13 ~20:15 IST

Ran zz-probe.test.ts against REAL v7 @ a054f3231 (clone /tmp/rjsf-v7, wiped on rebuild; refetch via
`git clone --filter=blob:none --no-checkout https://github.com/rjsf-team/react-jsonschema-form.git` + checkout a054f3231).

v7 ground truth vs wip (fe44f363):
- P733 oneOf/items: v7 == wip ✓ ({pick:{a:'A'}} / {picks:[{a:'A'}]})
- P739 if-def: ✓
- P748 shared: ✓ ({employee:{name:'n',manager:{name:'n'}}})
- P757: v7 child UNFLAGGED (the bug); wip flags ✓ (the fix)
- P773: both unflagged ✓
- P780: **v7 {tree:{name:'n',child:{name:'n'}}} (2 levels); wip {tree:{name:'n'}} (1 level) — REGRESSION, must fix**
- P790 tuple: **v7 THROWS RangeError; wip terminates {t:['s',null]} ✓ (the fix)**

v7 mechanism (instrumented, decisive):
- v7's getDefaultFormState RETRIEVES the schema BEFORE compute: tree arrives at compute MATERIALIZED
  (resolveAllReferences; on cycle it RETURNS THE RAW $ref SCHEMA UNCHANGED, unflagged).
- So v7's tree frame is a plain object frame with list []: children get []; child is the RETAINED raw $ref;
  child's REF frame sees [] -> expands (concat [node]); node-def's children get [node]; grandchild skips.
- Net: expansion depth is bounded by retrieveSchema's recursion stack; the compute-time concat is secondary.
- Wip expands the SAME $ref in the COMPUTE REF branch and concats into the compute list immediately ->
  node-def's children see [node] at once -> child skips a level early. Hence 1 level vs v7's 2.

FIX DIRECTION (design next run, verify empirically):
- Route REF-branch expansion through retrieveSchemaInternal (spend the ref in the RETRIEVE stack like v7),
  NOT findSchemaDefinition + compute-list concat. Must get the wip's flag/seed cycle handling right:
  (a) plain recursion (P780) -> 2 levels, unflagged, terminates;
  (b) tuple recursion (P790) -> still terminates (v7 RangeErrors here - wip must NOT regress);
  (c) allOf/if-held recursion (#5500 heap shapes) -> still flagged at retrieveSchema level (3 heap shapes already verified flagged);
  (d) all 8 probes + full utils suite + 100/100/100/100 coverage gate green.
- Naive alternatives RULED OUT: "skip -> fresh compute with []" infinite-loops (skip point re-expands forever);
  "REF branch hands nested compute L without concat" infinite-loops (concat is the only per-expansion bound).

Remaining #5511 pipeline after fix: see hourly sweep prompt (RangeError deps check, changelog move to
CHANGELOG-v7.md, full gate, drop zz-*, force-push, 10 thread replies).

## 20:24 IST update - P780 FIX LANDED (7592e298), 2 tests remain

Commits on top of b4470813: (1) getObjectDefaults no longer seeds childRecurseList with the source refs of
PLAIN retrieved properties (mergedRef kept): the root retrieve already ran that expansion, counting it again
stopped plain recursion a level early. (2) closingRefsOf now walks the schema's whole content (arrays incl.)
collecting every declared $ref - a then/else/allOf buries its closing ref at then.properties.x.$ref, which the
old shallow read missed. (3) the cycle-seeded path is synced into computeDefaultsProps so the fall-through
(object/array) computes hand it down. (4) the allOf/if-then merge branch + dependencies branch build their
nested-compute path on the seeded list (retrieve seed stays unseeded - the retrieve is the one expansion due).

State: all 8 probes green incl. P780 = v7 {tree:{name:'n',child:{name:'n'}}}; P790 terminates (output deepened
to {t:['s',['s',null]]}, consistent with the 2-level contract; v7 RangeErrors there). 3 heap shapes still
flagged at the right paths. schema.test.ts -t recursive: 47/49.

REMAINING 2 FAILURES:
(a) "stops a recursion under a populated allOf at the same depth as the same one without it" - now produces
{t:[[undefined]]} vs old expected {t:[undefined]}. The old expectation encodes the pre-fix depth-1 contract;
P780's contract says depth 2, and {t:[[undefined]]} IS depth 2 for an array-shaped recursion. NEXT: verify BOTH
variants (with/without allOf) now agree, then update the expected value to {t:[[undefined]]} and note it for
jimmy in the 4257411780 reply (also check v7 @ a054f3231's actual output for this shape first - cite it).
(b) "an if/then holding the ref in array items" - STILL RangeError. Loop (empirical stack): computeDefaults ->
getObjectDefaults(756 child loop) -> getArrayDefaults(1010 filler) -> computeDefaults(item if/then flagged) ->
isCycle TRUE skips the expansion branches BUT the fall-through getDefaultBasedOnSchemaType(1076) ->
getObjectDefaults(719) STILL retrieves with the seeds taken back off -> resolveCondition re-expands the ref ->
round and round. The non-array "an if/then holding the ref" PASSES with the same isCycle structure - find the
empirical difference (probe: is it the array filler handing an UNSYNCED list? getArrayDefaults' filler compute
uses _recurseList from computeDefaultsProps - my sync covers it - or does the item's own child-array get a
fresh unflagged inline if/then from the BARE definition via resolveCondition?). Suspect the fix: when isCycle
is true the fall-through retrieve must NOT take the seeds off (getObjectDefaults' cycleSeed removal is only
correct for the flagged level's FIRST arrival, not for an isCycle stop), OR the flagged level should skip the
retrieve entirely once isCycle stopped the expansion. Verify against the expected value
{name:'n', child:[{x:{name:'n', child:[{}]}}]} which expects the flagged level to still expand once more.

THEN: full utils gate (npx vitest run --coverage, expect 100/100/100/100) + core suite + oxlint/oxfmt, the
RangeError deps-branch check vs v7, changelog move to CHANGELOG-v7.md (last bullet under package heading;
remove the 3 @rjsf/utils bullets from CHANGELOG.md 6.11.1; rewrite for the new mechanism), drop zz-*, force-push
fix/recursive-ref-via-keyword-5501, reply "Fixed in <sha>" on jimmy's 10 threads, report. v7 clone lives at
/tmp/rjsf-v7 @ a054f3231 (wiped on rebuild; zz-probe.test.ts runs against it as-is).
