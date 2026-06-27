# moveNode

Moves one WBS node to a new parent.

## Example

```json
{
  "operation": "moveNode",
  "nodeId": "node-api-design",
  "newParentId": "node-system-design",
  "newCode": "1.2.2",
  "position": {
    "mode": "after",
    "referenceNodeId": "node-data-model"
  },
  "renumberDescendants": true
}
```

## Meaning

The applying tool changes `parentId` for the node and may update its `code`. Descendants remain descendants of the moved node.

## Validation

- `nodeId` must reference an existing node.
- `newParentId` must be `null` or reference an existing node.
- Moving a node must not create a `parentId` cycle.
- A move to `null` must not create multiple roots.
- `position.mode` of `before` or `after` requires `referenceNodeId`.
- `position.mode` of `first` or `last` must not include `referenceNodeId`.
- `position.referenceNodeId` should be a sibling under `newParentId`.

## Idempotency

Idempotent when the node is already at the requested parent, code, and position.

## Failure Conditions

Fail if the node or new parent does not exist, the move creates a cycle, or the move creates an invalid root structure.

## Misuse Notes

Moving a node does not mean it executes earlier or later. Use `dependsOn` relations for execution order.
