# deleteTag

Deletes one tag from a node.

## Example

```json
{
  "operation": "deleteTag",
  "nodeId": "node-api-design",
  "tag": "backend"
}
```

## Meaning

The applying tool removes `tag` from the target node's `tags` array.

## Validation

- `nodeId` must reference an existing node.
- `tag` must be non-empty.
- `tag` must not contain whitespace.

## Idempotency

Idempotent. If the tag does not exist, the operation may succeed with a warning.

## Failure Conditions

Fail if the node does not exist or the tag is invalid.

## Misuse Notes

Deleting a tag does not delete any relation, resource, or artifact.
