# deleteNodeOutput

Deletes one artifact ID from a node's `outputs`.

## Example

```json
{
  "operation": "deleteNodeOutput",
  "nodeId": "node-api-design",
  "artifactId": "artifact-openapi-yaml"
}
```

## Meaning

The applying tool removes `artifactId` from the target node's `outputs` array without replacing the rest of the array.

## Validation

- `nodeId` must reference an existing node.
- `artifactId` should reference an existing artifact.

## Idempotency

Idempotent. If the artifact ID is already absent from `outputs`, the operation may succeed with a warning.

## Failure Conditions

Fail if the node does not exist or the artifact ID is invalid under semantic validation.

## Misuse Notes

Deleting a node output does not delete the artifact from `artifacts` and does not delete any external file identified by the artifact's `uri`.
