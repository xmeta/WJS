# addNodeOutput

Adds one artifact ID to a node's `outputs`.

## Example

```json
{
  "operation": "addNodeOutput",
  "nodeId": "node-api-design",
  "artifactId": "artifact-openapi-yaml"
}
```

## Meaning

The applying tool adds `artifactId` to the target node's `outputs` array without replacing the existing array.

## Validation

- `nodeId` must reference an existing node.
- `artifactId` should reference an existing artifact.
- `outputs` must remain unique.

## Idempotency

Idempotent. If the artifact ID already exists in `outputs`, the operation should succeed without adding a duplicate. A warning is optional.

## Failure Conditions

Fail if the node does not exist or the artifact ID is invalid under semantic validation.

## Misuse Notes

Use `setNodeOutputs` only when replacing the whole output list is intentional.
