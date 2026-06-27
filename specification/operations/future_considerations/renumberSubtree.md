# renumberSubtree

`renumberSubtree` is a future consideration and is not part of WBS-JSON v0.1.

## Purpose

Renumber `code` values for a node and its descendants.

## Open Questions

- Should numbering be numeric, alphabetic, or preserve existing suffixes?
- Should the operation be deterministic across tools?
- How should partial failures be reported?
- Should relations or external references that mention WBS codes be updated?

## v0.1 Alternative

Use `updateNode` for explicit code changes on each affected node. This is more verbose but fully reviewable.
