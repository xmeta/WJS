# mergeNodes

`mergeNodes` is a future consideration and is not part of WBS-JSON v0.1.

## Purpose

Merge two or more WBS nodes into a single node.

## Open Questions

- How should fields such as owner, estimate, dates, outputs, tags, and acceptance criteria be merged?
- How should conflicting values be reviewed?
- How should relations to source nodes be transferred?
- Should source nodes be deleted, cancelled, or retained as historical references?

## v0.1 Alternative

Use explicit v0.1 operations:

- `addNode` or `updateNode` for the merged node.
- `moveNode` for children.
- `addRelation`, `updateRelation`, and `deleteRelation` for relation cleanup.
- `deleteNode` or `changeNodeStatus` for source nodes.
