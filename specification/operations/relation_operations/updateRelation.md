# updateRelation

Updates selected fields of one relation.

## Example

```json
{
  "operation": "updateRelation",
  "relationId": "rel-api-after-data-model",
  "changes": {
    "description": "API design starts after the data model is reviewed."
  }
}
```

## Meaning

The applying tool merges `changes` into the target relation. Only fields present in `changes` are updated.

## Validation

- `relationId` must reference an existing relation.
- `changes` must contain at least one allowed relation field.
- Changed `type`, `source`, and `target` must pass relation validation.
- Updating a relation to `dependsOn` must not introduce a dependency cycle.

## Idempotency

Idempotent when applying the same values repeatedly.

## Failure Conditions

Fail if the relation does not exist, `changes` is empty, references are invalid, or a dependency cycle is introduced.

## Misuse Notes

Use `deleteRelation` followed by `addRelation` when the change should be reviewed as a replacement rather than a small update.
