# deleteAcceptanceCriterion

Deletes one acceptance criterion from a node.

## Example

```json
{
  "operation": "deleteAcceptanceCriterion",
  "nodeId": "node-api-design",
  "criterion": "Old API design document is created."
}
```

Index-based deletion is allowed for UI use:

```json
{
  "operation": "deleteAcceptanceCriterion",
  "nodeId": "node-api-design",
  "index": 0
}
```

## Meaning

The applying tool removes one matching item from `acceptanceCriteria`.

## Validation

- `nodeId` must reference an existing node.
- Exactly one of `criterion` or `index` must be specified.
- `index` must be within the current array bounds.
- `matchMode` may be `exact` or `normalized`.

## Idempotency

String-based deletion may be treated as idempotent when the criterion is already absent, but tools should report a warning. Index-based deletion is not idempotent.

## Failure Conditions

Fail if both `criterion` and `index` are specified, neither is specified, the node does not exist, or the target criterion cannot be identified.

## Misuse Notes

Prefer `criterion` over `index` in AI-generated operations because it is easier to review.
