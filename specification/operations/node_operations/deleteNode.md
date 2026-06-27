# deleteNode

Deletes one WBS node.

## Example

```json
{
  "operation": "deleteNode",
  "nodeId": "node-obsolete-review",
  "deleteMode": "subtree",
  "relationHandling": "failIfReferenced"
}
```

## Meaning

`deleteMode: subtree` deletes the node and all descendants. `deleteMode: nodeOnly` deletes only the node and reattaches its children to the deleted node's parent.

`relationHandling` controls relations whose `source` or `target` is a deleted node:

- `failIfReferenced`: reject the operation when such relations exist.
- `deleteReferencingRelations`: delete those relations together with the node.

## Validation

- `nodeId` must reference an existing node.
- Deleting the root should be rejected unless the applying tool explicitly supports replacing the root.
- Relations involving deleted nodes must be handled according to `relationHandling`.
- Outputs and owner resources are not deleted by this operation.

## Idempotency

Not idempotent by default. An applying tool may treat a missing node as already deleted only when explicitly configured to do so.

## Failure Conditions

Fail if the node does not exist, root deletion is not supported, or `relationHandling` is `failIfReferenced` and relations still reference deleted nodes.

## Misuse Notes

Use `changeNodeStatus` with `cancelled` when the work should remain visible in history.
