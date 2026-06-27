# addResource

Adds one resource.

## Example

```json
{
  "operation": "addResource",
  "resource": {
    "id": "resource-backend-team",
    "name": "Backend Team",
    "type": "team"
  }
}
```

## Meaning

The applying tool appends the resource to `resources`.

## Validation

- `resource.id` must not already exist.
- `resource.name` must be non-empty.
- `resource.type` must be `person`, `team`, `role`, or `organization`.

## Idempotency

Not idempotent by default. An identical existing resource may be treated as already applied with a warning.

## Failure Conditions

Fail if the resource ID already exists or required fields are invalid.

## Misuse Notes

Adding a resource does not automatically assign it to nodes. Use `updateNode` to set `owner` or `assignees`.
