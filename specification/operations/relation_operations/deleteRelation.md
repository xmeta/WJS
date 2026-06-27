# deleteRelation

Deletes one relation.

## Example

```json
{
  "operation": "deleteRelation",
  "relationId": "rel-api-after-data-model"
}
```

## Meaning

The applying tool removes the relation from `relations`.

## Validation

- `relationId` must reference an existing relation unless the applying tool supports idempotent delete.

## Idempotency

May be treated as idempotent when the relation is already absent, but tools should report a warning.

## Failure Conditions

Fail if the relation does not exist and idempotent delete is not enabled.

## Misuse Notes

Deleting a dependency relation may make schedule ordering ambiguous. Review downstream planning impact.
