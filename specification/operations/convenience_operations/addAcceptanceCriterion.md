# addAcceptanceCriterion

Adds one acceptance criterion to a node.

## Example

```json
{
  "operation": "addAcceptanceCriterion",
  "nodeId": "node-api-design",
  "criterion": "OpenAPI paths and schemas are reviewed."
}
```

## Meaning

The applying tool appends `criterion` to the target node's `acceptanceCriteria`.

## Validation

- `nodeId` must reference an existing node.
- `criterion` must be a non-empty string.

## Idempotency

May be treated as idempotent if the same criterion already exists. Tools should avoid adding duplicates.

## Failure Conditions

Fail if the node does not exist or the criterion is empty.

## Misuse Notes

Use `updateNode` only when replacing the entire criteria array is intentional.
