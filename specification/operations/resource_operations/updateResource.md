# updateResource

Updates selected fields of one resource.

## Example

```json
{
  "operation": "updateResource",
  "resourceId": "resource-backend-team",
  "changes": {
    "name": "Platform Backend Team"
  }
}
```

## Meaning

The applying tool merges `changes` into the target resource.

## Validation

- `resourceId` must reference an existing resource.
- `changes` must contain at least one allowed resource field.
- Changed `type` must be allowed.

## Idempotency

Idempotent when applying the same values repeatedly.

## Failure Conditions

Fail if the resource does not exist, `changes` is empty, or changed fields are invalid.

## Misuse Notes

Use a new resource ID when the old and new resource represent distinct teams or roles.
