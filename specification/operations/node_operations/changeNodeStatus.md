# changeNodeStatus

Changes only the `status` of one WBS node.

## Example

```json
{
  "operation": "changeNodeStatus",
  "nodeId": "node-api-design",
  "status": "inProgress"
}
```

## Meaning

The applying tool sets the status of the target node.

## Validation

- `nodeId` must reference an existing node.
- `status` must be one of `draft`, `planned`, `ready`, `inProgress`, `blocked`, `completed`, or `cancelled`.

## Idempotency

Idempotent.

## Failure Conditions

Fail if the node does not exist or the status value is not allowed.

## Misuse Notes

This operation does not imply dependency completion. Tools may add workflow-specific checks outside the core specification.
