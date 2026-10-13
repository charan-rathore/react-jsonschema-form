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
