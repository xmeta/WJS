# addNode

Adds one WBS node.

## Example

```json
{
  "operation": "addNode",
  "node": {
    "id": "node-api-design",
    "parentId": "node-system-design",
    "code": "1.2.2",
    "name": "API Design",
    "type": "workPackage",
    "status": "planned"
  },
  "position": {
    "mode": "last"
  }
}
```

## Meaning

The applying tool inserts `node` into `nodes`. `position` controls display ordering among siblings when an implementation stores order separately. It must not be interpreted as execution order.

## Validation

- `node.id` must not already exist.
- `node.parentId` must be `null` only when adding a root node.
- Non-null `node.parentId` must reference an existing node.
- `position.mode` of `before` or `after` requires `referenceNodeId`.
- `position.mode` of `first` or `last` must not include `referenceNodeId`.
- `referenceNodeId` should be a sibling under the same parent.

## Idempotency

Not idempotent by default. If the same `node.id` already exists with identical content, an applying tool may treat the operation as already applied and report a warning.

## Failure Conditions

Fail if the node ID already exists, the parent does not exist, the insert would create a second root, or the reference position is invalid.

## Misuse Notes

Use `relations.dependsOn` for execution order. Do not encode ordering meaning only through sibling position or WBS code.
