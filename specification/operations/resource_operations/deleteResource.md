# deleteResource

Deletes one resource.

## Example

```json
{
  "operation": "deleteResource",
  "resourceId": "resource-temporary-reviewer",
  "detachFromNodes": true
}
```

## Meaning

The applying tool removes the resource from `resources`. If `detachFromNodes` is true, it also removes matching node `owner` references and removes the resource ID from node `assignees`.

## Validation

- `resourceId` must reference an existing resource unless idempotent delete is enabled.
- If `detachFromNodes` is false, no node may reference the resource as `owner` or in `assignees`.

## Idempotency

May be treated as idempotent when the resource is already absent, but tools should report a warning.

## Failure Conditions

Fail if the resource is referenced and detaching is disabled, or if the resource does not exist and idempotent delete is not enabled.

## Misuse Notes

Deleting a resource should not imply deleting the work assigned to that resource.
