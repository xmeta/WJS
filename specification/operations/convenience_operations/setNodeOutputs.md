# setNodeOutputs

Replaces the full `outputs` list of one node.

## Example

```json
{
  "operation": "setNodeOutputs",
  "nodeId": "node-api-design",
  "outputs": ["artifact-openapi-yaml"]
}
```

## Meaning

The applying tool sets the target node's `outputs` to exactly the provided array.

## Validation

- `nodeId` must reference an existing node.
- Each output ID should reference an existing artifact.
- `outputs` must not contain duplicates.

## Idempotency

Idempotent when the output list is already the same.

## Failure Conditions

Fail if the node does not exist, duplicate artifact IDs are present, or referenced artifacts are invalid under semantic validation.

## Misuse Notes

This is a full replacement, not an append. Review carefully when existing outputs may be removed.

Prefer `addNodeOutput` or `deleteNodeOutput` when changing a single artifact reference.
