# addTag

Adds one tag to a node.

## Example

```json
{
  "operation": "addTag",
  "nodeId": "node-api-design",
  "tag": "backend"
}
```

## Meaning

The applying tool adds `tag` to the target node's `tags` array.

## Validation

- `nodeId` must reference an existing node.
- `tag` must be non-empty.
- `tag` must not contain whitespace.
- `tags` must remain unique.

## Idempotency

Idempotent. If the tag already exists, the operation should succeed without adding a duplicate. A warning is optional.

## Failure Conditions

Fail if the node does not exist or the tag is invalid.

## Misuse Notes

Tags are lightweight labels. Put structured tool-specific data under `extensions` instead.
