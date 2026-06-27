# addArtifact

Adds one artifact.

## Example

```json
{
  "operation": "addArtifact",
  "artifact": {
    "id": "artifact-api-spec",
    "name": "API specification",
    "type": "document",
    "uri": "./docs/api-spec.md"
  }
}
```

## Meaning

The applying tool appends the artifact to `artifacts`.

## Validation

- `artifact.id` must not already exist.
- `artifact.name` must be non-empty.
- `artifact.type` must be an allowed artifact type.

## Idempotency

Not idempotent by default. An identical existing artifact may be treated as already applied with a warning.

## Failure Conditions

Fail if the artifact ID already exists or required fields are invalid.

## Misuse Notes

Adding an artifact does not automatically attach it to a node. Use `addNodeOutput` to attach one artifact, or `setNodeOutputs` only when replacing the whole output list is intentional.
