# splitNode

`splitNode` is a future consideration and is not part of WBS-JSON v0.1.

## Purpose

Split one WBS node into two or more replacement nodes.

## Open Questions

- How should existing children be assigned to replacement nodes?
- How should incoming and outgoing relations be transferred?
- Should the original node be deleted or retained as a summary?
- How should review tools display the before/after mapping?

## v0.1 Alternative

Use explicit v0.1 operations:

- `addNode` for replacement nodes.
- `moveNode` for children that need reassignment.
- `addRelation` and `deleteRelation` for relation changes.
- `deleteNode` or `changeNodeStatus` for the original node.
