# updateNode

Updates selected fields of one WBS node.

## Example

```json
{
  "operation": "updateNode",
  "nodeId": "node-api-design",
  "changes": {
    "description": "Design REST API endpoints and schemas.",
    "estimate": {
      "value": 3,
      "unit": "personDay"
    }
  }
}
```

## Meaning

The applying tool merges `changes` into the target node. Only fields present in `changes` are updated.

## Validation

- `nodeId` must reference an existing node.
- `changes` must contain at least one allowed node field.
- IDs and `parentId` are not changed by this operation; use `moveNode` for parent changes.
- Array fields in `changes` replace the entire array.

## Idempotency

Idempotent when applying the same values repeatedly.

## Failure Conditions

Fail if the node does not exist, `changes` is empty, or changed references such as `owner` or `outputs` are invalid under semantic validation.

## Misuse Notes

Prefer `renameNode`, `changeNodeStatus`, `addNodeOutput`, `deleteNodeOutput`, `setNodeOutputs`, `addAcceptanceCriterion`, `deleteAcceptanceCriterion`, `addTag`, or `deleteTag` when the intent is narrower and easier to review.
