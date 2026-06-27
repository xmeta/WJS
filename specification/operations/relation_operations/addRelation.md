# addRelation

Adds one non-tree relation.

## Example

```json
{
  "operation": "addRelation",
  "relation": {
    "id": "rel-api-after-data-model",
    "type": "dependsOn",
    "source": "node-api-design",
    "target": "node-data-model"
  }
}
```

## Meaning

The applying tool appends the relation to `relations`.

## Validation

- `relation.id` must not already exist.
- `relation.type` must be an allowed relation type.
- For `dependsOn` and `blocks`, `source` and `target` should reference existing WBS nodes.
- `dependsOn` should not introduce a dependency cycle.

## Idempotency

Not idempotent by default. An identical existing relation may be treated as already applied with a warning.

## Failure Conditions

Fail if the relation ID already exists, required references are invalid, or a `dependsOn` cycle is introduced.

## Misuse Notes

Do not use `parentId` for dependencies. Use `dependsOn`.
