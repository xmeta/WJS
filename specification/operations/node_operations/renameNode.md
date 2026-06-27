# renameNode

Changes only the `name` of one WBS node.

## Example

```json
{
  "operation": "renameNode",
  "nodeId": "node-api-design",
  "name": "API Basic Design"
}
```

## Meaning

The applying tool sets `nodes[].name` for `nodeId` to `name`.

## Validation

- `nodeId` must reference an existing node.
- `name` must be a non-empty string.

## Idempotency

Idempotent.

## Failure Conditions

Fail if the node does not exist or the new name is empty.

## Misuse Notes

Use `updateNode` if other fields must change in the same operation.
