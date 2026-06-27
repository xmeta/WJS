# reorderChildren

Changes display order for the children of one parent.

## Example

```json
{
  "operation": "reorderChildren",
  "parentId": "node-system-design",
  "orderedChildIds": [
    "node-data-model",
    "node-api-design",
    "node-security-design"
  ],
  "renumberChildren": false
}
```

## Meaning

The applying tool stores or derives a new sibling display order. This operation does not change dependencies.

## Validation

- `parentId` must be `null` or reference an existing node.
- `orderedChildIds` must contain exactly the children whose `parentId` equals `parentId`.
- `orderedChildIds` must not contain duplicates.
- If `renumberChildren` is true, code changes should be reported or applied consistently.

## Idempotency

Idempotent when the order is already the same.

## Failure Conditions

Fail if children are missing, extra IDs are included, duplicate IDs are present, or `parentId` is invalid.

## Misuse Notes

Do not use this operation to express execution order. Use `dependsOn`.
